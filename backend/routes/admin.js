import express from "express";
import pool from "../db.js";
import { verifyToken, verifyRole } from "../middleware/verifyToken.js";
import { validateAdminTaskUpdate, validateAdminUserAction, validateRouteIdParam } from "../middleware/validators.js";
import { createTaskAuditEntry } from "../utils/taskAudit.js";
import { createUserAuditEntry } from "../utils/userAudit.js";

const router = express.Router();

router.use(verifyToken, verifyRole(["admin"]));

const buildActor = (user) => ({
  ...user,
  name: user.email
});

const getUserManagementTarget = async (userId) => {
  const result = await pool.query(
    `SELECT
       id,
       first_name,
       last_name,
       email,
       phone,
       role,
       email_verified,
       is_active,
       deactivated_at,
       created_at
     FROM users
     WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || null;
};

const getUserDeleteBlockers = async (userId) => {
  const [tasks, applications, ratings, payments, disputes] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS count FROM tasks WHERE client_id = $1 OR minion_id = $1 OR invited_minion_id = $1`, [userId]),
    pool.query(`SELECT COUNT(*)::int AS count FROM task_applications WHERE minion_id = $1`, [userId]),
    pool.query(`SELECT COUNT(*)::int AS count FROM minion_ratings WHERE client_id = $1 OR minion_id = $1`, [userId]),
    pool.query(`SELECT COUNT(*)::int AS count FROM payments WHERE client_id = $1 OR minion_id = $1`, [userId]),
    pool.query(`SELECT COUNT(*)::int AS count FROM disputes WHERE raised_by_user_id = $1`, [userId])
  ]);

  return {
    tasks: tasks.rows[0].count,
    applications: applications.rows[0].count,
    ratings: ratings.rows[0].count,
    payments: payments.rows[0].count,
    disputes: disputes.rows[0].count
  };
};

router.get("/overview", async (req, res) => {
  try {
    const [
      userCounts,
      taskCounts,
      paymentCounts,
      revenueTotals,
      recentUsers,
      recentTasks
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_users,
          COUNT(*) FILTER (WHERE role = 'client')::int AS total_clients,
          COUNT(*) FILTER (WHERE role = 'minion')::int AS total_minions,
          COUNT(*) FILTER (WHERE role = 'admin')::int AS total_admins,
          COUNT(*) FILTER (WHERE email_verified = TRUE)::int AS verified_users,
          COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_users,
          COUNT(*) FILTER (WHERE is_active = FALSE)::int AS deactivated_users
        FROM users
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total_tasks,
          COUNT(*) FILTER (WHERE status = 'open')::int AS open_tasks,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_tasks,
          COUNT(*) FILTER (WHERE status = 'assigned')::int AS assigned_tasks,
          COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress_tasks,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_tasks,
          COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_tasks,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_tasks,
          COUNT(*) FILTER (WHERE status = 'paused')::int AS paused_tasks,
          COUNT(*) FILTER (WHERE status = 'archived')::int AS archived_tasks
        FROM tasks
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total_payments,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_payments,
          COUNT(*) FILTER (WHERE status = 'success')::int AS successful_payments,
          COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_payments
        FROM payments
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0)::float AS total_revenue,
          COALESCE(AVG(amount) FILTER (WHERE status = 'success'), 0)::float AS average_payment
        FROM payments
      `),
      pool.query(`
        SELECT
          id,
          first_name,
          last_name,
          email,
          role,
          email_verified,
          is_active,
          created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT
          t.id,
          t.title,
          t.status,
          t.budget,
          t.created_at,
          c.first_name || ' ' || c.last_name AS client_name,
          m.first_name || ' ' || m.last_name AS minion_name
        FROM tasks t
        LEFT JOIN users c ON c.id = t.client_id
        LEFT JOIN users m ON m.id = t.minion_id
        ORDER BY t.created_at DESC
        LIMIT 5
      `)
    ]);

    return res.json({
      success: true,
      data: {
        users: userCounts.rows[0],
        tasks: taskCounts.rows[0],
        payments: paymentCounts.rows[0],
        revenue: revenueTotals.rows[0],
        recentUsers: recentUsers.rows,
        recentTasks: recentTasks.rows
      }
    });
  } catch (err) {
    console.error("Admin overview error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin overview"
    });
  }
});

router.get("/users", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.location,
        u.role,
        u.email_verified,
        u.is_active,
        u.deactivated_at,
        u.created_at,
        COUNT(DISTINCT t.id)::int AS posted_tasks,
        COUNT(DISTINCT ta.id)::int AS applications_sent,
        COUNT(DISTINCT p.id)::int AS payment_records,
        COUNT(DISTINCT d.id)::int AS dispute_records
      FROM users u
      LEFT JOIN tasks t ON t.client_id = u.id
      LEFT JOIN task_applications ta ON ta.minion_id = u.id
      LEFT JOIN payments p ON p.client_id = u.id OR p.minion_id = u.id
      LEFT JOIN disputes d ON d.raised_by_user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error("Admin users error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users"
    });
  }
});

router.patch("/users/:id/verify", validateAdminUserAction, async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const actor = buildActor(req.user);
    const targetUser = await getUserManagementTarget(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (targetUser.email_verified) {
      return res.status(409).json({
        success: false,
        message: "User is already verified"
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET email_verified = TRUE,
           email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP)
       WHERE id = $1
       RETURNING id, email_verified, is_active`,
      [targetUserId]
    );

    await createUserAuditEntry({
      targetUser,
      actionType: "user_verified",
      actionLabel: "User verified",
      actor,
      notes: `Admin verified ${targetUser.email}.`,
      metadata: {
        previousVerified: false,
        nextVerified: true
      }
    });

    return res.json({
      success: true,
      message: "User verified successfully",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Admin verify user error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to verify user"
    });
  }
});

router.patch("/users/:id/unverify", validateAdminUserAction, async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const actor = buildActor(req.user);
    const targetUser = await getUserManagementTarget(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!targetUser.email_verified) {
      return res.status(409).json({
        success: false,
        message: "User is already unverified"
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET email_verified = FALSE,
           email_verified_at = NULL
       WHERE id = $1
       RETURNING id, email_verified, is_active`,
      [targetUserId]
    );

    await createUserAuditEntry({
      targetUser,
      actionType: "user_unverified",
      actionLabel: "User unverified",
      actor,
      notes: `Admin removed verification from ${targetUser.email}.`,
      metadata: {
        previousVerified: true,
        nextVerified: false
      }
    });

    return res.json({
      success: true,
      message: "User marked as unverified",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Admin unverify user error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to unverify user"
    });
  }
});

router.patch("/users/:id/deactivate", validateAdminUserAction, async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const actor = buildActor(req.user);

    if (targetUserId === req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Admins cannot deactivate their own account"
      });
    }

    const targetUser = await getUserManagementTarget(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!targetUser.is_active) {
      return res.status(409).json({
        success: false,
        message: "User is already deactivated"
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET is_active = FALSE,
           deactivated_at = CURRENT_TIMESTAMP,
           deactivated_by_admin_id = $2
       WHERE id = $1
       RETURNING id, email_verified, is_active, deactivated_at`,
      [targetUserId, req.user.id]
    );

    await createUserAuditEntry({
      targetUser,
      actionType: "user_deactivated",
      actionLabel: "User deactivated",
      actor,
      notes: `Admin deactivated ${targetUser.email}.`,
      metadata: {
        previousActive: true,
        nextActive: false
      }
    });

    return res.json({
      success: true,
      message: "User deactivated successfully",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Admin deactivate user error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to deactivate user"
    });
  }
});

router.patch("/users/:id/reactivate", validateAdminUserAction, async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const actor = buildActor(req.user);
    const targetUser = await getUserManagementTarget(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (targetUser.is_active) {
      return res.status(409).json({
        success: false,
        message: "User is already active"
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET is_active = TRUE,
           deactivated_at = NULL,
           deactivated_by_admin_id = NULL
       WHERE id = $1
       RETURNING id, email_verified, is_active, deactivated_at`,
      [targetUserId]
    );

    await createUserAuditEntry({
      targetUser,
      actionType: "user_reactivated",
      actionLabel: "User reactivated",
      actor,
      notes: `Admin reactivated ${targetUser.email}.`,
      metadata: {
        previousActive: false,
        nextActive: true
      }
    });

    return res.json({
      success: true,
      message: "User reactivated successfully",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Admin reactivate user error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to reactivate user"
    });
  }
});

router.delete("/users/:id", validateAdminUserAction, async (req, res) => {
  let client;
  try {
    const targetUserId = Number(req.params.id);
    const actor = buildActor(req.user);

    if (targetUserId === req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Admins cannot permanently delete their own account"
      });
    }

    const targetUser = await getUserManagementTarget(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const blockers = await getUserDeleteBlockers(targetUserId);
    const blockerCount = Object.values(blockers).reduce((sum, value) => sum + Number(value || 0), 0);

    if (blockerCount > 0) {
      return res.status(409).json({
        success: false,
        message: "This user has platform activity on record. Deactivate the account instead of permanently deleting it.",
        blockers
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    await client.query(
      `UPDATE users
       SET deleted_at = CURRENT_TIMESTAMP,
           deleted_by_admin_id = $2
       WHERE id = $1`,
      [targetUserId, req.user.id]
    );

    await createUserAuditEntry({
      targetUser,
      actionType: "user_deleted",
      actionLabel: "User permanently deleted",
      actor,
      db: client,
      notes: `Admin permanently deleted ${targetUser.email}.`,
      metadata: {
        deletedAt: new Date().toISOString(),
        blockers
      }
    });

    await client.query("DELETE FROM notifications WHERE user_id = $1", [targetUserId]);
    await client.query("DELETE FROM users WHERE id = $1", [targetUserId]);
    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "User permanently deleted"
    });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("Admin delete user error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to permanently delete user"
    });
  } finally {
    client?.release();
  }
});

router.get("/tasks", async (req, res) => {
  try {
    const result = await pool.query(`
        SELECT
          t.id,
          t.title,
          t.description,
          t.category,
          t.location,
          t.budget,
          t.status,
          t.priority,
          t.has_active_dispute,
          t.active_dispute_status,
          t.client_id,
          t.minion_id,
          t.invited_minion_id,
          t.created_at,
          t.assigned_at,
          t.completed_at,
          t.archived_at,
          c.first_name || ' ' || c.last_name AS client_name,
          m.first_name || ' ' || m.last_name AS minion_name
        FROM tasks t
      LEFT JOIN users c ON c.id = t.client_id
      LEFT JOIN users m ON m.id = t.minion_id
      ORDER BY t.created_at DESC
    `);

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error("Admin tasks error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tasks"
    });
  }
});

router.get("/tasks/:id", validateRouteIdParam, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         t.id,
         t.title,
         t.description,
         t.category,
         t.location,
         t.budget,
         t.status,
         t.priority,
         t.has_active_dispute,
         t.active_dispute_status,
         t.client_id,
         t.minion_id,
         t.invited_minion_id,
         t.created_at,
         t.assigned_at,
         t.completed_at,
         t.archived_at,
         c.first_name || ' ' || c.last_name AS client_name,
         m.first_name || ' ' || m.last_name AS minion_name
       FROM tasks t
       LEFT JOIN users c ON c.id = t.client_id
       LEFT JOIN users m ON m.id = t.minion_id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Admin task detail error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch task details"
    });
  }
});

router.get("/tasks/:id/audit", validateRouteIdParam, async (req, res) => {
  try {
    const taskCheck = await pool.query("SELECT id FROM tasks WHERE id = $1", [req.params.id]);

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    const result = await pool.query(
      `SELECT
         id,
         task_id,
         action_type,
         action_label,
         actor_id,
         actor_role,
         actor_name,
         notes,
         metadata,
         created_at
       FROM task_audit_log
       WHERE task_id = $1
       ORDER BY created_at DESC, id DESC`,
      [req.params.id]
    );

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error("Admin task audit error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch task audit timeline"
    });
  }
});

router.put("/tasks/:id", validateAdminTaskUpdate, async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const hasMinionOverride = Object.prototype.hasOwnProperty.call(req.body, "minionId");
    const {
      title,
      description,
      category,
      location,
      budget,
      status,
      priority
    } = req.body;

    const existingTaskResult = await pool.query(
      `SELECT *
       FROM tasks
       WHERE id = $1`,
      [taskId]
    );

    if (existingTaskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    const existingTask = existingTaskResult.rows[0];
    const actor = {
      ...req.user,
      name: req.user.email
    };
    let nextMinionId = hasMinionOverride ? (req.body.minionId ?? null) : existingTask.minion_id;

    if (nextMinionId) {
      const minionResult = await pool.query(
        `SELECT id
         FROM users
         WHERE id = $1
           AND role = 'minion'
           AND email_verified = TRUE
           AND is_active = TRUE
           AND deleted_at IS NULL`,
        [nextMinionId]
      );

      if (minionResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Selected minion is not available for assignment"
        });
      }
    }

    let nextStatus = status ?? existingTask.status;
    if (nextStatus === "open") {
      nextMinionId = null;
    }

    if (["assigned", "in_progress", "completed", "paid"].includes(nextStatus) && !nextMinionId) {
      return res.status(400).json({
        success: false,
        message: "An assigned minion is required for that status"
      });
    }

    const shouldSetAssignedAt = nextMinionId && (!existingTask.minion_id || existingTask.minion_id !== nextMinionId || nextStatus === "assigned");
    const shouldSetCompletedAt = ["completed", "paid"].includes(nextStatus);
    const shouldSetArchivedAt = nextStatus === "archived";

    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           location = COALESCE($4, location),
           budget = COALESCE($5, budget),
           status = COALESCE($6, status),
           priority = COALESCE($7, priority),
           minion_id = $8,
           assigned_at = CASE
             WHEN $9 THEN CURRENT_TIMESTAMP
             WHEN $6 = 'open' THEN NULL
             ELSE assigned_at
           END,
           completed_at = CASE
             WHEN $10 THEN CURRENT_TIMESTAMP
             WHEN $6 IS NOT NULL AND $6 NOT IN ('completed', 'paid') THEN NULL
             ELSE completed_at
           END,
           archived_at = CASE
             WHEN $11 THEN CURRENT_TIMESTAMP
             WHEN $6 IS NOT NULL AND $6 <> 'archived' THEN NULL
             ELSE archived_at
           END
       WHERE id = $12
       RETURNING id`,
      [
        title,
        description,
        category,
        location,
        budget,
        nextStatus,
        priority,
        nextMinionId,
        shouldSetAssignedAt,
        shouldSetCompletedAt,
        shouldSetArchivedAt,
        taskId
      ]
    );

    const updatedTaskResult = await pool.query(
      `SELECT
         t.id,
         t.title,
         t.description,
         t.category,
         t.location,
         t.budget,
         t.status,
         t.priority,
         t.has_active_dispute,
         t.active_dispute_status,
         t.client_id,
         t.minion_id,
         t.invited_minion_id,
         t.created_at,
         t.assigned_at,
         t.completed_at,
         t.archived_at,
         c.first_name || ' ' || c.last_name AS client_name,
         m.first_name || ' ' || m.last_name AS minion_name
       FROM tasks t
       LEFT JOIN users c ON c.id = t.client_id
       LEFT JOIN users m ON m.id = t.minion_id
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    const updatedTask = updatedTaskResult.rows[0];
    const changedFields = [
      title !== undefined && title !== existingTask.title ? "title" : null,
      description !== undefined && description !== existingTask.description ? "description" : null,
      category !== undefined && category !== existingTask.category ? "category" : null,
      location !== undefined && location !== existingTask.location ? "location" : null,
      budget !== undefined && Number(budget) !== Number(existingTask.budget) ? "budget" : null,
      priority !== undefined && priority !== existingTask.priority ? "priority" : null
    ].filter(Boolean);

    if (changedFields.length > 0) {
      await createTaskAuditEntry({
        taskId,
        actionType: "task_edited",
        actionLabel: "Task edited",
        actor,
        notes: `Admin updated ${changedFields.join(", ")}.`,
        metadata: {
          changedFields
        }
      });
    }

    if (existingTask.minion_id !== updatedTask.minion_id) {
      const assignmentAction = existingTask.minion_id && updatedTask.minion_id
        ? {
            actionType: "minion_reassigned",
            actionLabel: "Minion reassigned",
            notes: `Admin moved the task from minion #${existingTask.minion_id} to minion #${updatedTask.minion_id}.`
          }
        : updatedTask.minion_id
          ? {
              actionType: "minion_assigned",
              actionLabel: "Minion assigned",
              notes: `Admin assigned minion #${updatedTask.minion_id} to the task.`
            }
          : {
              actionType: "minion_reassigned",
              actionLabel: "Minion unassigned",
              notes: `Admin removed minion #${existingTask.minion_id} from the task.`
            };

      await createTaskAuditEntry({
        taskId,
        actionType: assignmentAction.actionType,
        actionLabel: assignmentAction.actionLabel,
        actor,
        notes: assignmentAction.notes,
        metadata: {
          previousMinionId: existingTask.minion_id,
          nextMinionId: updatedTask.minion_id
        }
      });
    }

    if (existingTask.status !== updatedTask.status) {
      const actionByStatus = {
        cancelled: "Task cancelled",
        open: "Task reopened",
        archived: "Task archived"
      };

      await createTaskAuditEntry({
        taskId,
        actionType: "status_changed",
        actionLabel: actionByStatus[updatedTask.status] || "Status changed",
        actor,
        notes: `Admin changed task status from ${existingTask.status.replace(/_/g, " ")} to ${updatedTask.status.replace(/_/g, " ")}.`,
        metadata: {
          previousStatus: existingTask.status,
          nextStatus: updatedTask.status
        }
      });
    }

    return res.json({
      success: true,
      message: "Task updated successfully",
      data: updatedTask
    });
  } catch (err) {
    console.error("Admin task update error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update task"
    });
  }
});

router.get("/payments", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.task_id,
        p.amount,
        p.phone,
        p.status,
        p.mpesa_receipt_number,
        p.result_desc,
        p.created_at,
        p.paid_at,
        t.title AS task_title,
        c.first_name || ' ' || c.last_name AS client_name,
        m.first_name || ' ' || m.last_name AS minion_name
      FROM payments p
      LEFT JOIN tasks t ON t.id = p.task_id
      LEFT JOIN users c ON c.id = p.client_id
      LEFT JOIN users m ON m.id = p.minion_id
      ORDER BY p.created_at DESC
    `);

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error("Admin payments error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments"
    });
  }
});

export default router;
