import pool from "../db.js";

const buildActorSnapshot = (actor = {}) => {
  if (!actor) {
    return {
      actorId: null,
      actorRole: "system",
      actorName: "System"
    };
  }

  const firstName = actor.first_name || actor.firstName || "";
  const lastName = actor.last_name || actor.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    actorId: actor.id || null,
    actorRole: actor.role || "system",
    actorName: fullName || actor.name || actor.email || "System"
  };
};

export const createTaskAuditEntry = async ({
  taskId,
  actionType,
  actionLabel,
  actor,
  notes = null,
  metadata = null
}) => {
  if (!taskId || !actionType || !actionLabel) {
    return null;
  }

  const actorSnapshot = buildActorSnapshot(actor);

  const result = await pool.query(
    `INSERT INTO task_audit_log (
       task_id,
       action_type,
       action_label,
       actor_id,
       actor_role,
       actor_name,
       notes,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, task_id, action_type, action_label, actor_id, actor_role, actor_name, notes, metadata, created_at`,
    [
      taskId,
      actionType,
      actionLabel,
      actorSnapshot.actorId,
      actorSnapshot.actorRole,
      actorSnapshot.actorName,
      notes,
      metadata ? JSON.stringify(metadata) : null
    ]
  );

  return result.rows[0] || null;
};
