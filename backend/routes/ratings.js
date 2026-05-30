import express from "express";
import pool from "../db.js";
import { verifyToken, verifyRole } from "../middleware/verifyToken.js";
import { validateTaskRating } from "../middleware/validators.js";

const router = express.Router();

router.use(verifyToken);

router.post("/task/:taskId", verifyRole(["client"]), validateTaskRating, async (req, res) => {
  try {
    const clientId = req.user.id;
    const { taskId } = req.params;
    const { rating } = req.body;

    const taskResult = await pool.query(
      `SELECT id, client_id, minion_id, status
       FROM tasks
       WHERE id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    const task = taskResult.rows[0];

    if (task.client_id !== clientId) {
      return res.status(403).json({
        success: false,
        message: "You can only rate minions for your own tasks"
      });
    }

    if (!task.minion_id) {
      return res.status(400).json({
        success: false,
        message: "Task has no assigned minion to rate"
      });
    }

    if (!["completed", "paid"].includes(task.status)) {
      return res.status(400).json({
        success: false,
        message: "You can only rate after work is completed"
      });
    }

    const ratingResult = await pool.query(
      `INSERT INTO minion_ratings (task_id, client_id, minion_id, rating)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (task_id, client_id)
       DO UPDATE SET
         rating = EXCLUDED.rating,
         minion_id = EXCLUDED.minion_id,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, task_id, client_id, minion_id, rating, created_at, updated_at`,
      [task.id, clientId, task.minion_id, rating]
    );

    const statsResult = await pool.query(
      `SELECT
         ROUND(AVG(rating)::numeric, 2) AS average_rating,
         COUNT(*)::int AS rating_count
       FROM minion_ratings
       WHERE minion_id = $1`,
      [task.minion_id]
    );

    return res.json({
      success: true,
      message: "Rating saved successfully",
      data: {
        rating: ratingResult.rows[0],
        minionStats: statsResult.rows[0]
      }
    });
  } catch (err) {
    console.error("Rate task error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to save rating"
    });
  }
});

router.get("/my", verifyRole(["client"]), async (req, res) => {
  try {
    const clientId = req.user.id;

    const result = await pool.query(
      `SELECT
         task_id,
         minion_id,
         rating,
         updated_at
       FROM minion_ratings
       WHERE client_id = $1`,
      [clientId]
    );

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error("Get client ratings error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your ratings"
    });
  }
});

export default router;
