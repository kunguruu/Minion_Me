import express from "express";
import pool from "../db.js";
import { verifyToken, verifyRole } from '../middleware/verifyToken.js';
import { validateTaskCreation, validateRouteIdParam, validateTaskUpdate } from '../middleware/validators.js';
import { createNotification } from "../utils/notifications.js";
import { createTaskAuditEntry } from "../utils/taskAudit.js";


const router = express.Router();

// Create new task
router.use(verifyToken);

router.post("/", verifyRole(['client']), validateTaskCreation, async (req, res) => {
  try {
    const client_id = req.user.id;
    const { title, description, location, category, budget, invitedMinionId } = req.body;

    if (!title || !client_id) {
      return res.status(400).json({ 
        success: false,
        message: "Title is required" 
      });
    }

    let normalizedInvitedMinionId = null;
    if (invitedMinionId) {
      const invitedMinionResult = await pool.query(
        `SELECT id
         FROM users
         WHERE id = $1
           AND role = 'minion'
           AND email_verified = TRUE
           AND is_active = TRUE
           AND deleted_at IS NULL`,
        [invitedMinionId]
      );

      if (invitedMinionResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "The selected minion is not available for direct invites"
        });
      }

      normalizedInvitedMinionId = invitedMinionResult.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO tasks (title, description, location, category, budget, client_id, invited_minion_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, location, category || null, budget || null, client_id, normalizedInvitedMinionId]
    );

    await createTaskAuditEntry({
      taskId: result.rows[0].id,
      actionType: "task_created",
      actionLabel: "Task created",
      actor: req.user,
      notes: normalizedInvitedMinionId
        ? "Task was created as a direct invite."
        : "Task was created and added to the marketplace.",
      metadata: {
        title,
        category: category || null,
        location,
        budget: budget || null,
        invitedMinionId: normalizedInvitedMinionId
      }
    });

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: result.rows[0]
    });

    if (normalizedInvitedMinionId) {
      await createNotification({
        userId: normalizedInvitedMinionId,
        type: "info",
        title: "New Task Posted",
        message: `A client invited you to "${title}".`,
        metadata: {
          taskId: result.rows[0].id,
          event: "task_posted"
        }
      });
    }

  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to create task" 
    });
  }
});

// Get all tasks
router.get("/", async (req, res) => {
  try {
    let query = `SELECT 
        t.*,
        u.first_name || ' ' || u.last_name AS client_name
       FROM tasks t
       LEFT JOIN users u ON t.client_id = u.id
       WHERE u.is_active = TRUE
         AND u.deleted_at IS NULL`;
    const queryParams = [];

    if (req.user?.role === 'minion') {
      query += `
       AND (t.invited_minion_id IS NULL
          OR t.invited_minion_id = $1`;
      queryParams.push(req.user.id);
      query += `)`;
    }

    query += `
       ORDER BY t.created_at DESC`;

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    console.error("Fetch tasks error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch tasks" 
    });
  }
});

// Get task by ID
router.get("/:id", validateRouteIdParam, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        t.*,
        u.first_name || ' ' || u.last_name AS client_name,
        u.phone AS client_phone
       FROM tasks t
       LEFT JOIN users u ON t.client_id = u.id
       WHERE t.id = $1
         AND u.is_active = TRUE
         AND u.deleted_at IS NULL
         AND ($2::text <> 'minion' OR t.invited_minion_id IS NULL OR t.invited_minion_id = $3)`,
      [id, req.user?.role || '', req.user?.id || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {
    console.error("Fetch task error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch task" 
    });
  }
});

// Update task
router.put("/:id", verifyRole(['client']), validateTaskUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.user.id;
    const { title, description, location, category, budget } = req.body;
    const existingTaskResult = await pool.query(
      "SELECT * FROM tasks WHERE id = $1 AND client_id = $2",
      [id, clientId]
    );

    if (existingTaskResult.rows.length === 0) {
      const taskExists = await pool.query("SELECT id FROM tasks WHERE id = $1", [id]);
      if (taskExists.rows.length > 0) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own tasks"
        });
      }
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    const existingTask = existingTaskResult.rows[0];

    const result = await pool.query(
      `UPDATE tasks 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           location = COALESCE($3, location),
           category = COALESCE($4, category),
           budget = COALESCE($5, budget)
       WHERE id = $6 AND client_id = $7
       RETURNING *`,
      [title, description, location, category, budget, id, clientId]
    );

    const updatedTask = result.rows[0];
    const changedFields = [
      title !== undefined && title !== existingTask.title ? "title" : null,
      description !== undefined && description !== existingTask.description ? "description" : null,
      location !== undefined && location !== existingTask.location ? "location" : null,
      category !== undefined && category !== existingTask.category ? "category" : null,
      budget !== undefined && Number(budget) !== Number(existingTask.budget) ? "budget" : null
    ].filter(Boolean);

    if (changedFields.length > 0) {
      await createTaskAuditEntry({
        taskId: updatedTask.id,
        actionType: "task_edited",
        actionLabel: "Task edited",
        actor: req.user,
        notes: `Client updated ${changedFields.join(", ")}.`,
        metadata: {
          changedFields
        }
      });
    }

    res.json({
      success: true,
      message: "Task updated successfully",
      data: updatedTask
    });

  } catch (err) {
    console.error("Update task error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to update task" 
    });
  }
});

// Delete task
router.delete("/:id", verifyRole(['client']), validateRouteIdParam, async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.user.id;

    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND client_id = $2 RETURNING *",
      [id, clientId]
    );

    if (result.rows.length === 0) {
      const taskExists = await pool.query("SELECT id FROM tasks WHERE id = $1", [id]);
      if (taskExists.rows.length > 0) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own tasks"
        });
      }
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    res.json({
      success: true,
      message: "Task deleted successfully"
    });

  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete task" 
    });
  }
});

export default router;
