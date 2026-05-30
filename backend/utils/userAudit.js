import pool from "../db.js";

export const createUserAuditEntry = async ({
  targetUser,
  actionType,
  actionLabel,
  actor,
  db = pool,
  notes = null,
  metadata = null
}) => {
  if (!actionType || !actionLabel) {
    throw new Error("User audit entries require actionType and actionLabel.");
  }

  await db.query(
    `INSERT INTO user_management_audit_log (
       target_user_id,
       target_email,
       action_type,
       action_label,
       actor_id,
       actor_role,
       actor_name,
       notes,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      targetUser?.id ?? null,
      targetUser?.email ?? null,
      actionType,
      actionLabel,
      actor?.id ?? null,
      actor?.role ?? null,
      actor?.name ?? actor?.email ?? null,
      notes,
      metadata ? JSON.stringify(metadata) : null
    ]
  );
};
