import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";
import { initializeDatabase } from "./db.js";
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/tasks.js";
import assignmentRoutes from "./routes/assignments.js";
import paymentRoutes from "./routes/payments.js";
import ratingRoutes from "./routes/ratings.js";
import adminRoutes from "./routes/admin.js";
import notificationRoutes from "./routes/notifications.js";
import disputeRoutes from "./routes/disputes.js";
import safariRoutes from "../SafariAI/backend/routes/safari.js";
import { apiLimiter, authLimiter, registerLimiter } from './middleware/rateLimiter.js';
import helmet from 'helmet';



dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow images from other origins
}));


app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Apply general rate limiter to all routes
app.use('/api/', apiLimiter);

// Routes with specific rate limiters
app.use("/auth/login", authLimiter);
app.use("/auth/register", registerLimiter);
app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);
app.use("/assignments", assignmentRoutes);
app.use("/payments", paymentRoutes);
app.use("/ratings", ratingRoutes);
app.use("/admin", adminRoutes);
app.use("/notifications", notificationRoutes);
app.use("/disputes", disputeRoutes);
app.use("/safari", safariRoutes);

// Health check (no rate limit)
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ 
      status: "ok", 
      time: result.rows[0].now,
      database: "connected"
    });
  } catch (err) {
    res.status(500).json({ 
      status: "error", 
      message: err.message 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: `Route ${req.method} ${req.path} not found` 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

   if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      success: false,
      message: 'The uploaded image is too large. Please choose a smaller photo.'
    });
  }

  res.status(500).json({ 
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Minion-Me Backend running on http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error("❌ Failed to initialize database:", err);
    process.exit(1);
  }
};

startServer();
