import express from "express";
import pool from "../db.js";
import { verifyToken, verifyRole } from '../middleware/verifyToken.js';
import {
  validateTaskApplication,
  validateApplicationIdParam,
  validateTaskIdParam,
  validateMinionIdParam,
  validateTaskStatusUpdate
} from '../middleware/validators.js';
import { createNotification } from "../utils/notifications.js";
import { createTaskAuditEntry } from "../utils/taskAudit.js";



const router = express.Router();

// Apply for a task
router.use(verifyToken);

router.post("/apply/:taskId", verifyRole(['minion']), validateTaskApplication, async (req, res) => {
  try {
    const minion_id = req.user.id;
    const { taskId } = req.params;
    const { message } = req.body;
    

    // Check if task exists and is open
    const taskCheck = await pool.query(
      `SELECT t.*, u.first_name, u.last_name
       FROM tasks t
       LEFT JOIN users u ON u.id = $1
       JOIN users c ON c.id = t.client_id
       WHERE t.id = $2
         AND c.is_active = TRUE
         AND c.deleted_at IS NULL`,
      [minion_id, taskId]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    const task = taskCheck.rows[0];

    if (task.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: "This task is no longer available"
      });
    }

    if (task.invited_minion_id && task.invited_minion_id !== minion_id) {
      return res.status(403).json({
        success: false,
        message: "This task was invited to another minion"
      });
    }

    // Check if already applied
    const existingApplication = await pool.query(
      "SELECT * FROM task_applications WHERE task_id = $1 AND minion_id = $2",
      [taskId, minion_id]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already applied for this task"
      });
    }

    // Create application
    const result = await pool.query(
      `INSERT INTO task_applications (task_id, minion_id, message, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [taskId, minion_id, message || null]
    );

    // Update task status to pending (has applications)
    await pool.query(
      "UPDATE tasks SET status = 'pending' WHERE id = $1",
      [taskId]
    );

    await createTaskAuditEntry({
      taskId: task.id,
      actionType: "status_changed",
      actionLabel: "Status changed",
      actor: req.user,
      notes: `Task moved from ${task.status.replace('_', ' ')} to pending after a minion applied.`,
      metadata: {
        previousStatus: task.status,
        nextStatus: "pending",
        trigger: "task_application",
        applicationId: result.rows[0].id
      }
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: result.rows[0]
    });

    await createNotification({
      userId: task.client_id,
      type: "info",
      title: "Task Accepted by Minion",
      message: `${task.first_name || "A minion"} ${task.last_name || ""}`.trim()
        ? `${`${task.first_name || "A minion"} ${task.last_name || ""}`.trim()} responded to "${task.title}".`
        : `A minion responded to "${task.title}".`,
      metadata: {
        taskId: task.id,
        applicationId: result.rows[0].id,
        event: "task_applied"
      }
    });

  } catch (err) {
    console.error("Apply for task error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to apply for task"
    });
  }
});

// Accept a minion for a task (Client only)
router.post("/accept/:applicationId", verifyRole(['client']), validateApplicationIdParam, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const clientId = req.user.id;

    // Get application details
    const appResult = await pool.query(
      `SELECT ta.*, t.client_id, t.id as task_id
       FROM task_applications ta
       JOIN tasks t ON ta.task_id = t.id
       WHERE ta.id = $1`,
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    const application = appResult.rows[0];

    // Verify client owns this task
    if (application.client_id !== clientId) {
      return res.status(403).json({
        success: false,
        message: "You can only accept applications for your own tasks"
      });
    }

    // Start transaction
    const minionResult = await pool.query(
      `SELECT id, first_name, last_name, email, role
       FROM users
       WHERE id = $1
         AND is_active = TRUE
         AND deleted_at IS NULL`,
      [application.minion_id]
    );

    if (minionResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Selected minion is no longer active on the platform"
      });
    }

    await pool.query('BEGIN');

    // Accept this application
    await pool.query(
      "UPDATE task_applications SET status = 'accepted' WHERE id = $1",
      [applicationId]
    );

    // Reject all other applications for this task
    await pool.query(
      `UPDATE task_applications 
       SET status = 'rejected' 
       WHERE task_id = $1 AND id != $2`,
      [application.task_id, applicationId]
    );

    // Assign task to minion
    await pool.query(
      `UPDATE tasks 
       SET status = 'assigned', 
           minion_id = $1, 
           assigned_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [application.minion_id, application.task_id]
    );

    await createTaskAuditEntry({
      taskId: application.task_id,
      actionType: "minion_assigned",
      actionLabel: "Minion assigned",
      actor: req.user,
      notes: minionResult.rows[0]
        ? `Client accepted the application and assigned ${minionResult.rows[0].first_name} ${minionResult.rows[0].last_name}.`
        : "Client accepted an application and assigned a minion.",
      metadata: {
        applicationId: Number(applicationId),
        minionId: application.minion_id
      }
    });

    await createTaskAuditEntry({
      taskId: application.task_id,
      actionType: "status_changed",
      actionLabel: "Status changed",
      actor: req.user,
      notes: "Task moved to assigned after the client accepted a minion application.",
      metadata: {
        previousStatus: "pending",
        nextStatus: "assigned",
        applicationId: Number(applicationId),
        minionId: application.minion_id
      }
    });

    await pool.query('COMMIT');

    res.json({
      success: true,
      message: "Minion assigned successfully"
    });

  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("Accept application error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to accept application"
    });
  }
});

// Get applications for a task (Client)
router.get("/task/:taskId", verifyRole(['client']), validateTaskIdParam, async (req, res) => {
  try {
    const { taskId } = req.params;
    const clientId = req.user.id;

    const result = await pool.query(
      `SELECT 
        ta.*,
        u.first_name || ' ' || u.last_name as minion_name,
        u.email as minion_email,
        u.phone as minion_phone,
        u.skills,
        u.location as minion_location
       FROM task_applications ta
       JOIN users u ON ta.minion_id = u.id
       JOIN tasks t ON ta.task_id = t.id
       WHERE ta.task_id = $1 AND t.client_id = $2
         AND u.is_active = TRUE
         AND u.deleted_at IS NULL
       ORDER BY ta.created_at DESC`,
      [taskId, clientId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error("Get applications error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch applications"
    });
  }
});

// Get minion's applications
router.get("/minion/:minionId", verifyRole(['minion']), validateMinionIdParam, async (req, res) => {
  try {
    const minionId = req.user.id;

    const result = await pool.query(
      `SELECT 
        ta.*,
        t.title,
         t.description,
         t.status as task_status,
         t.has_active_dispute,
         t.active_dispute_status,
         t.budget,
        t.location,
        t.category,
        u.first_name || ' ' || u.last_name as client_name
       FROM task_applications ta
       JOIN tasks t ON ta.task_id = t.id
       JOIN users u ON t.client_id = u.id
       WHERE ta.minion_id = $1
         AND u.is_active = TRUE
         AND u.deleted_at IS NULL
       ORDER BY ta.created_at DESC`,
      [minionId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error("Get minion applications error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch applications"
    });
  }
});

// task status (for in_progress, completed)
router.put("/task/:taskId/status", verifyRole(['client', 'minion']), validateTaskStatusUpdate, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log("Status update request:", { taskId, status, userId, userRole });

    // Get task
    const taskResult = await pool.query(
      "SELECT * FROM tasks WHERE id = $1",
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    const task = taskResult.rows[0];
    const previousStatus = task.status;

    // Verify user has permission
    if (userRole === 'minion' && task.minion_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized - this task is not assigned to you"
      });
    }
    if (userRole === 'client' && task.client_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized - this task does not belong to you"
      });
    }

    // Prevent duplicate/no-op updates and enforce a strict workflow
    if (task.status === status) {
      return res.status(409).json({
        success: false,
        message: `Task is already marked as ${status.replace('_', ' ')}`
      });
    }

    const transitionRules = {
      minion: {
        assigned: ['in_progress'],
        in_progress: ['completed']
      },
      client: {
        open: ['cancelled'],
        pending: ['cancelled'],
        assigned: ['cancelled'],
        in_progress: ['cancelled']
      }
    };

    const allowedNextStatuses = transitionRules[userRole]?.[task.status] || [];
    if (!allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition: ${task.status} -> ${status} for role ${userRole}`
      });
    }

    // Update status
    let updateQuery;
    if (status === 'completed') {
      updateQuery = `UPDATE tasks 
                     SET status = $1, completed_at = CURRENT_TIMESTAMP 
                     WHERE id = $2 
                     RETURNING *`;
    } else {
      updateQuery = `UPDATE tasks 
                     SET status = $1 
                     WHERE id = $2 
                     RETURNING *`;
    }

    const result = await pool.query(updateQuery, [status, taskId]);
    const actionLabelMap = {
      cancelled: "Task cancelled",
      completed: "Task completed",
      in_progress: "Task marked in progress",
      open: "Task reopened",
      assigned: "Task assigned",
      pending: "Task marked pending",
      paid: "Task marked paid",
      paused: "Task paused",
      archived: "Task archived"
    };

    await createTaskAuditEntry({
      taskId: task.id,
      actionType: "status_changed",
      actionLabel: actionLabelMap[status] || "Status changed",
      actor: req.user,
      notes: `${userRole === 'minion' ? 'Minion' : 'Client'} changed task status from ${previousStatus.replace('_', ' ')} to ${status.replace('_', ' ')}.`,
      metadata: {
        previousStatus,
        nextStatus: status,
        changedByRole: userRole
      }
    });

    res.json({
      success: true,
      message: `Task marked as ${status.replace('_', ' ')}`,
      data: result.rows[0]
    });

    if (status === "completed" && userRole === "minion") {
      await createNotification({
        userId: task.client_id,
        type: "success",
        title: "Task Completed",
        message: `Your task "${task.title}" was marked as complete.`,
        metadata: {
          taskId: task.id,
          event: "task_completed"
        }
      });
    }

  } catch (err) {
    console.error("Update task status error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update task status",
      error: err.message
    });
  }
});
export default router;
