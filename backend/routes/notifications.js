import express from "express";
import pool from "../db.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { validateRouteIdParam } from "../middleware/validators.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, type, title, message, metadata, read_at, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 300`,
      [req.user.id]
    );

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error("Fetch notifications error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications"
    });
  }
});

router.post("/:id/read", validateRouteIdParam, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE id = $1
         AND user_id = $2
       RETURNING id, user_id, type, title, message, metadata, read_at, created_at`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Mark notification read error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification"
    });
  }
});

router.post("/read-all", async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE user_id = $1`,
      [req.user.id]
    );

    return res.json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (err) {
    console.error("Mark all notifications read error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update notifications"
    });
  }
});

router.delete("/", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM notifications WHERE user_id = $1",
      [req.user.id]
    );

    return res.json({
      success: true,
      message: "Notification history cleared"
    });
  } catch (err) {
    console.error("Clear notifications error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to clear notifications"
    });
  }
});

export default router;
