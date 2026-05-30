import express from "express";
import pool from "../db.js";
import { verifyToken, verifyRole } from "../middleware/verifyToken.js";
import { validateTaskIdParam } from "../middleware/validators.js";
import { createNotification } from "../utils/notifications.js";
import { createTaskAuditEntry } from "../utils/taskAudit.js";

const router = express.Router();

const getMpesaBaseUrl = () => {
  const env = (process.env.MPESA_ENV || "sandbox").toLowerCase();
  if (env === "production") {
    return "https://api.safaricom.co.ke";
  }
  return "https://sandbox.safaricom.co.ke";
};

const formatTimestamp = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${y}${m}${d}${hh}${mm}${ss}`;
};

const normalizeKenyanPhone = (phone) => {
  if (!phone || typeof phone !== "string") return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("7")) return `254${digits}`;
  return null;
};

const getAccessToken = async () => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error("M-Pesa consumer credentials are missing");
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const baseUrl = getMpesaBaseUrl();
  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch M-Pesa access token: ${body}`);
  }

  const data = await response.json();
  return data.access_token;
};

const initiateStkPush = async ({ amount, phoneNumber, taskId }) => {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!shortcode || !passkey || !callbackUrl) {
    throw new Error("M-Pesa shortcode/passkey/callback URL is missing");
  }

  const timestamp = formatTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const accessToken = await getAccessToken();
  const baseUrl = getMpesaBaseUrl();

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phoneNumber,
    PartyB: shortcode,
    PhoneNumber: phoneNumber,
    CallBackURL: callbackUrl,
    AccountReference: `TASK-${taskId}`,
    TransactionDesc: `Payment for task ${taskId}`
  };

  const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.errorMessage || data.ResponseDescription || "Failed to initiate STK push");
  }

  return data;
};

// Daraja callback must remain public
router.post("/callback", async (req, res) => {
  try {
    const callback = req.body?.Body?.stkCallback;

    if (!callback?.CheckoutRequestID) {
      return res.status(400).json({
        ResultCode: 1,
        ResultDesc: "Invalid callback payload"
      });
    }

    const callbackItems = callback.CallbackMetadata?.Item || [];
    const metadata = {};
    for (const item of callbackItems) {
      metadata[item.Name] = item.Value;
    }

    const resultCode = Number(callback.ResultCode);
    const status = resultCode === 0 ? "success" : "failed";
    const receipt = metadata.MpesaReceiptNumber || null;

    const updatedPayment = await pool.query(
      `UPDATE payments
       SET status = $1,
           result_code = $2,
           result_desc = $3,
           mpesa_receipt_number = $4,
           raw_callback = $5,
           paid_at = CASE WHEN $1 = 'success' THEN CURRENT_TIMESTAMP ELSE paid_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE checkout_request_id = $6
       RETURNING id, task_id`,
      [
        status,
        resultCode,
        callback.ResultDesc || null,
        receipt,
        JSON.stringify(req.body),
        callback.CheckoutRequestID
      ]
    );

    if (updatedPayment.rows.length > 0) {
      const { task_id: taskId } = updatedPayment.rows[0];
      await createTaskAuditEntry({
        taskId,
        actionType: "payment_status_changed",
        actionLabel: "Payment status changed",
        actor: null,
        notes: `M-Pesa callback marked the payment as ${status}.`,
        metadata: {
          paymentStatus: status,
          resultCode,
          receipt
        }
      });
    }

    if (updatedPayment.rows.length > 0 && status === "success") {
      const { task_id: taskId } = updatedPayment.rows[0];
      const taskUpdate = await pool.query(
         `UPDATE tasks
          SET status = 'paid'
          WHERE id = $1 AND status = 'completed'
          RETURNING id, title, minion_id`,
         [taskId]
      );

      if (taskUpdate.rows.length > 0) {
        await createTaskAuditEntry({
          taskId,
          actionType: "status_changed",
          actionLabel: "Payment recorded",
          actor: null,
          notes: "Task status changed from completed to paid after successful payment confirmation.",
          metadata: {
            previousStatus: "completed",
            nextStatus: "paid",
            paymentStatus: status,
            receipt
          }
        });
      }

      if (taskUpdate.rows.length > 0 && taskUpdate.rows[0].minion_id) {
        await createNotification({
          userId: taskUpdate.rows[0].minion_id,
          type: "success",
          title: "Payment Recorded",
          message: `Payment for "${taskUpdate.rows[0].title}" has been recorded as done.`,
          metadata: {
            taskId: taskUpdate.rows[0].id,
            event: "payment_recorded"
          }
        });
      }
    }

    return res.json({
      ResultCode: 0,
      ResultDesc: "Accepted"
    });
  } catch (err) {
    console.error("M-Pesa callback error:", err);
    return res.status(500).json({
      ResultCode: 1,
      ResultDesc: "Server error"
    });
  }
});

router.use(verifyToken);

router.post("/stk-push/:taskId", verifyRole(["client"]), validateTaskIdParam, async (req, res) => {
  try {
    const { taskId } = req.params;
    const clientId = req.user.id;

    const taskResult = await pool.query(
      `SELECT t.id, t.title, t.status, t.budget, t.client_id, t.minion_id, u.phone AS client_phone
       FROM tasks t
       JOIN users u ON t.client_id = u.id
       WHERE t.id = $1
         AND u.is_active = TRUE
         AND u.deleted_at IS NULL`,
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
        message: "You can only pay for your own task"
      });
    }

    if (task.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Task must be completed before payment"
      });
    }

    const paidCheck = await pool.query(
      "SELECT id FROM payments WHERE task_id = $1 AND status = 'success' LIMIT 1",
      [taskId]
    );
    if (paidCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Task is already paid"
      });
    }

    const pendingCheck = await pool.query(
      "SELECT id FROM payments WHERE task_id = $1 AND status = 'pending' LIMIT 1",
      [taskId]
    );
    if (pendingCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "A payment request is already pending for this task"
      });
    }

    const phoneNumber = normalizeKenyanPhone(task.client_phone);
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Invalid client phone number format. Use a valid Kenyan number."
      });
    }

    const amount = Math.round(Number(task.budget));
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid task budget amount"
      });
    }

    const stkResponse = await initiateStkPush({
      amount,
      phoneNumber,
      taskId
    });

    const { MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription, CustomerMessage } = stkResponse;

    if (String(ResponseCode) !== "0") {
      return res.status(502).json({
        success: false,
        message: ResponseDescription || "M-Pesa request was not accepted"
      });
    }

    await pool.query(
      `INSERT INTO payments (task_id, client_id, minion_id, amount, phone, status, merchant_request_id, checkout_request_id, result_desc)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8)`,
      [
        task.id,
        task.client_id,
        task.minion_id || null,
        amount,
        phoneNumber,
        MerchantRequestID || null,
        CheckoutRequestID || null,
        ResponseDescription || null
      ]
    );

    await createTaskAuditEntry({
      taskId: task.id,
      actionType: "payment_status_changed",
      actionLabel: "Payment initiated",
      actor: req.user,
      notes: "Client started an M-Pesa payment request for this task.",
      metadata: {
        paymentStatus: "pending",
        amount,
        checkoutRequestId: CheckoutRequestID || null
      }
    });

    return res.json({
      success: true,
      message: CustomerMessage || "STK push sent. Complete payment on your phone.",
      data: {
        checkoutRequestId: CheckoutRequestID,
        merchantRequestId: MerchantRequestID
      }
    });
  } catch (err) {
    console.error("STK push error:", err);
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === "development"
        ? (err.message || "Failed to initiate payment")
        : "Failed to initiate payment",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
});

router.post("/record/:taskId", verifyRole(["client"]), validateTaskIdParam, async (req, res) => {
  try {
    const { taskId } = req.params;
    const clientId = req.user.id;

    const taskResult = await pool.query(
      `SELECT t.id, t.title, t.status, t.budget, t.client_id, t.minion_id, u.phone AS client_phone
       FROM tasks t
       JOIN users u ON t.client_id = u.id
       WHERE t.id = $1
         AND u.is_active = TRUE
         AND u.deleted_at IS NULL`,
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
        message: "You can only record payment for your own task"
      });
    }

    if (task.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Task must be completed before payment can be recorded"
      });
    }

    if (!task.minion_id) {
      return res.status(400).json({
        success: false,
        message: "Task has no assigned minion"
      });
    }

    const paidCheck = await pool.query(
      "SELECT id FROM payments WHERE task_id = $1 AND status = 'success' LIMIT 1",
      [taskId]
    );
    if (paidCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Task is already paid"
      });
    }

    const amount = Math.round(Number(task.budget));
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid task budget amount"
      });
    }

    const manualReference = `MANUAL-TASK-${taskId}-${Date.now()}`;
    const paymentPhone = normalizeKenyanPhone(task.client_phone) || "manual-record";

    await pool.query("BEGIN");

    await pool.query(
      `INSERT INTO payments (
         task_id,
         client_id,
         minion_id,
         amount,
         phone,
         status,
         mpesa_receipt_number,
         result_desc,
         paid_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, 'success', $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        task.id,
        task.client_id,
        task.minion_id,
        amount,
        paymentPhone,
        manualReference,
        "Manual payment recorded by client"
      ]
    );

    await pool.query(
      `UPDATE tasks
       SET status = 'paid'
       WHERE id = $1`,
      [taskId]
    );

    await pool.query("COMMIT");

    await createTaskAuditEntry({
      taskId: task.id,
      actionType: "payment_status_changed",
      actionLabel: "Payment recorded",
      actor: req.user,
      notes: "Client manually recorded payment as completed.",
      metadata: {
        paymentStatus: "success",
        amount,
        receipt: manualReference
      }
    });

    await createTaskAuditEntry({
      taskId: task.id,
      actionType: "status_changed",
      actionLabel: "Payment recorded",
      actor: req.user,
      notes: "Task status changed from completed to paid after payment was manually recorded.",
      metadata: {
        previousStatus: "completed",
        nextStatus: "paid",
        paymentStatus: "success",
        receipt: manualReference
      }
    });

    await createNotification({
      userId: task.minion_id,
      type: "success",
      title: "Payment Recorded",
      message: `Payment for "${task.title}" has been recorded as done.`,
      metadata: {
        taskId: task.id,
        event: "payment_recorded"
      }
    });

    return res.json({
      success: true,
      message: "Payment recorded successfully.",
      data: {
        taskId: task.id,
        amount,
        receipt: manualReference
      }
    });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Manual payment record error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to record payment"
    });
  }
});

router.get("/task/:taskId", verifyRole(["client", "minion"]), validateTaskIdParam, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const taskResult = await pool.query(
      "SELECT id, client_id, minion_id, status FROM tasks WHERE id = $1",
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    const task = taskResult.rows[0];
    if (userRole === "client" && task.client_id !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    if (userRole === "minion" && task.minion_id !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const paymentResult = await pool.query(
      `SELECT id, amount, phone, status, mpesa_receipt_number, result_desc, paid_at, created_at
       FROM payments
       WHERE task_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [taskId]
    );

    return res.json({
      success: true,
      data: {
        taskStatus: task.status,
        payment: paymentResult.rows[0] || null
      }
    });
  } catch (err) {
    console.error("Get payment status error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment status"
    });
  }
});

router.get("/minion/earnings", verifyRole(["minion"]), async (req, res) => {
  try {
    const minionId = req.user.id;

    const earningsResult = await pool.query(
      `SELECT
        p.id,
        p.task_id,
        p.amount,
        p.status,
        p.mpesa_receipt_number,
        p.result_desc,
        p.created_at,
        p.paid_at,
        t.title,
        t.category,
        t.location,
        u.first_name || ' ' || u.last_name AS client_name
       FROM payments p
       JOIN tasks t ON t.id = p.task_id
       JOIN users u ON u.id = p.client_id
       WHERE p.minion_id = $1
       ORDER BY COALESCE(p.paid_at, p.created_at) DESC`,
      [minionId]
    );

    const summaryResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE p.status = 'success')::int AS successful_payments,
        COUNT(*) FILTER (WHERE p.status = 'pending')::int AS pending_payments,
        COUNT(*) FILTER (WHERE p.status = 'failed')::int AS failed_payments,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success'), 0)::float AS total_earned,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'pending'), 0)::float AS pending_earnings
       FROM payments p
       WHERE p.minion_id = $1`,
      [minionId]
    );

    const taskSummaryResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status IN ('assigned', 'in_progress'))::int AS active_jobs,
        COUNT(*) FILTER (WHERE status IN ('completed', 'paid'))::int AS completed_jobs
       FROM tasks
       WHERE minion_id = $1`,
      [minionId]
    );

    return res.json({
      success: true,
      data: {
        summary: {
          ...summaryResult.rows[0],
          ...taskSummaryResult.rows[0]
        },
        payments: earningsResult.rows
      }
    });
  } catch (err) {
    console.error("Get minion earnings error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch earnings"
    });
  }
});

export default router;
