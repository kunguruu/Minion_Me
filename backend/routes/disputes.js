import express from "express";
import pool from "../db.js";
import { verifyToken, verifyRole } from "../middleware/verifyToken.js";
import {
  validateTaskIdParam,
  validateDisputeCreation,
  validateDisputeIdParam,
  validateAdminDisputeUpdate
} from "../middleware/validators.js";
import { createTaskAuditEntry } from "../utils/taskAudit.js";

const router = express.Router();

const activeDisputeStatuses = ["open", "under_review"];

const syncTaskDisputeState = async (taskId) => {
  const activeDisputeResult = await pool.query(
    `SELECT status
     FROM disputes
     WHERE task_id = $1
       AND status = ANY($2::text[])
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [taskId, activeDisputeStatuses]
  );

  const activeStatus = activeDisputeResult.rows[0]?.status || null;

  await pool.query(
    `UPDATE tasks
     SET has_active_dispute = $2,
         active_dispute_status = $3
     WHERE id = $1`,
    [taskId, Boolean(activeStatus), activeStatus]
  );

  return activeStatus;
};

const getTaskAccess = async (taskId, user) => {
  const taskResult = await pool.query(
    `SELECT id, title, status, client_id, minion_id
     FROM tasks
     WHERE id = $1`,
    [taskId]
  );

  if (taskResult.rows.length === 0) {
    return { error: { status: 404, message: "Task not found" } };
  }

  const task = taskResult.rows[0];
  const isAdmin = user.role === "admin";
  const isClientOwner = task.client_id === user.id;
  const isAssignedMinion = task.minion_id === user.id;

  if (!isAdmin && !isClientOwner && !isAssignedMinion) {
    return { error: { status: 403, message: "Not authorized to access disputes for this task" } };
  }

  return { task, isAdmin, isClientOwner, isAssignedMinion };
};

router.use(verifyToken);

router.get("/task/:taskId", validateTaskIdParam, async (req, res) => {
  try {
    const access = await getTaskAccess(req.params.taskId, req.user);
    if (access.error) {
      return res.status(access.error.status).json({
        success: false,
        message: access.error.message
      });
    }

    const result = await pool.query(
      `SELECT
         d.id,
         d.task_id,
         d.raised_by_user_id,
         d.reason,
         d.description,
         d.status,
         d.admin_note,
         d.resolution_action,
         d.created_at,
         d.updated_at,
         u.first_name || ' ' || u.last_name AS raised_by_name,
         u.role AS raised_by_role
       FROM disputes d
       JOIN users u ON u.id = d.raised_by_user_id
       WHERE d.task_id = $1
       ORDER BY d.created_at DESC, d.id DESC`,
      [req.params.taskId]
    );

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error("Get task disputes error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dispute details"
    });
  }
});

router.post("/task/:taskId", verifyRole(["client", "minion"]), validateDisputeCreation, async (req, res) => {
  try {
    const access = await getTaskAccess(req.params.taskId, req.user);
    if (access.error) {
      return res.status(access.error.status).json({
        success: false,
        message: access.error.message
      });
    }

    const { task, isClientOwner, isAssignedMinion } = access;
    const { reason, description } = req.body;

    if (!isClientOwner && !isAssignedMinion) {
      return res.status(403).json({
        success: false,
        message: "Only the task owner or assigned minion can raise a dispute"
      });
    }

    if (!["assigned", "in_progress", "completed"].includes(task.status)) {
      return res.status(400).json({
        success: false,
        message: "Disputes can only be raised for assigned, in-progress, or payment-pending work"
      });
    }

    const existingActiveDispute = await pool.query(
      `SELECT id
       FROM disputes
       WHERE task_id = $1
         AND status = ANY($2::text[])
       LIMIT 1`,
      [task.id, activeDisputeStatuses]
    );

    if (existingActiveDispute.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This task already has an active dispute"
      });
    }

    const result = await pool.query(
      `INSERT INTO disputes (
         task_id,
         raised_by_user_id,
         reason,
         description,
         status,
         updated_at
       )
       VALUES ($1, $2, $3, $4, 'open', CURRENT_TIMESTAMP)
       RETURNING *`,
      [task.id, req.user.id, reason, description || null]
    );

    await syncTaskDisputeState(task.id);

    await createTaskAuditEntry({
      taskId: task.id,
      actionType: "dispute_opened",
      actionLabel: "Dispute opened",
      actor: {
        ...req.user,
        name: req.user.email
      },
      notes: `${req.user.role === "client" ? "Client" : "Minion"} opened a dispute for reason "${reason.replace(/_/g, " ")}".`,
      metadata: {
        disputeId: result.rows[0].id,
        reason,
        raisedByRole: req.user.role
      }
    });

    return res.status(201).json({
      success: true,
      message: "Dispute raised successfully",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Create dispute error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to raise dispute"
    });
  }
});

router.get("/admin", verifyRole(["admin"]), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         d.id,
         d.task_id,
         d.reason,
         d.description,
         d.status,
         d.admin_note,
         d.resolution_action,
         d.created_at,
         d.updated_at,
         t.title AS task_title,
         t.status AS task_status,
         t.has_active_dispute,
         u.first_name || ' ' || u.last_name AS raised_by_name,
         u.role AS raised_by_role
       FROM disputes d
       JOIN tasks t ON t.id = d.task_id
       JOIN users u ON u.id = d.raised_by_user_id
       ORDER BY d.created_at DESC, d.id DESC`
    );

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error("Admin disputes error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch disputes"
    });
  }
});

router.put("/:id/admin", verifyRole(["admin"]), validateAdminDisputeUpdate, async (req, res) => {
  try {
    const disputeId = Number(req.params.id);
    const {
      status,
      adminNote,
      resolutionAction,
      minionId
    } = req.body;

    const disputeResult = await pool.query(
      `SELECT
         d.*,
         t.title AS task_title,
         t.status AS task_status,
         t.minion_id
       FROM disputes d
       JOIN tasks t ON t.id = d.task_id
       WHERE d.id = $1`,
      [disputeId]
    );

    if (disputeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Dispute not found"
      });
    }

    const dispute = disputeResult.rows[0];
    const nextStatus = status ?? dispute.status;
    const nextResolutionAction = resolutionAction ?? dispute.resolution_action ?? null;
    const actor = {
      ...req.user,
      name: req.user.email
    };

    if (nextResolutionAction === "reassign_task" && !minionId) {
      return res.status(400).json({
        success: false,
        message: "Select a minion before reassigning this task"
      });
    }

    if (nextResolutionAction === "reassign_task") {
      const minionResult = await pool.query(
        `SELECT id
         FROM users
         WHERE id = $1
           AND role = 'minion'
           AND email_verified = TRUE
           AND is_active = TRUE
           AND deleted_at IS NULL`,
        [minionId]
      );

      if (minionResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Selected minion is not available for reassignment"
        });
      }
    }

    await pool.query("BEGIN");

    const updateResult = await pool.query(
      `UPDATE disputes
       SET status = $1,
           admin_note = COALESCE($2, admin_note),
           resolution_action = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [nextStatus, adminNote ?? null, nextResolutionAction, disputeId]
    );

    if (nextResolutionAction === "cancel_task") {
      await pool.query(
        `UPDATE tasks
         SET status = 'cancelled'
         WHERE id = $1`,
        [dispute.task_id]
      );
    }

    if (nextResolutionAction === "reassign_task") {
      await pool.query(
        `UPDATE tasks
         SET minion_id = $1,
             status = 'assigned',
             assigned_at = CURRENT_TIMESTAMP,
             completed_at = NULL
         WHERE id = $2`,
        [minionId, dispute.task_id]
      );
    }

    await syncTaskDisputeState(dispute.task_id);
    await pool.query("COMMIT");

    if (dispute.status !== nextStatus) {
      const actionLabelMap = {
        under_review: "Dispute under review",
        resolved: "Dispute resolved",
        rejected: "Dispute rejected",
        open: "Dispute reopened"
      };

      await createTaskAuditEntry({
        taskId: dispute.task_id,
        actionType: nextStatus === "resolved" ? "dispute_resolved" : nextStatus === "rejected" ? "dispute_rejected" : "dispute_updated",
        actionLabel: actionLabelMap[nextStatus] || "Dispute updated",
        actor,
        notes: `Admin changed dispute status from ${dispute.status.replace(/_/g, " ")} to ${nextStatus.replace(/_/g, " ")}.`,
        metadata: {
          disputeId,
          previousStatus: dispute.status,
          nextStatus
        }
      });
    }

    if (nextResolutionAction === "cancel_task") {
      await createTaskAuditEntry({
        taskId: dispute.task_id,
        actionType: "status_changed",
        actionLabel: "Task cancelled",
        actor,
        notes: "Admin cancelled the task while resolving a dispute.",
        metadata: {
          disputeId,
          previousStatus: dispute.task_status,
          nextStatus: "cancelled"
        }
      });
    }

    if (nextResolutionAction === "reassign_task") {
      await createTaskAuditEntry({
        taskId: dispute.task_id,
        actionType: "minion_reassigned",
        actionLabel: "Minion reassigned",
        actor,
        notes: "Admin reassigned the task while resolving a dispute.",
        metadata: {
          disputeId,
          previousMinionId: dispute.minion_id,
          nextMinionId: minionId
        }
      });
    }

    return res.json({
      success: true,
      message: "Dispute updated successfully",
      data: updateResult.rows[0]
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Admin dispute update error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update dispute"
    });
  }
});

export default router;
