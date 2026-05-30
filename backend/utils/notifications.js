import pool from "../db.js";

export const createNotification = async ({
  userId,
  type = "info",
  title,
  message,
  metadata = null
}) => {
  if (!userId || !title || !message) {
    return null;
  }

  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, type, title, message, metadata, read_at, created_at`,
    [userId, type, title, message, metadata ? JSON.stringify(metadata) : null]
  );

  return result.rows[0] || null;
};
