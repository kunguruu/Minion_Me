import express from "express";
import pool from "../db.js";
import argon2 from "argon2";  // ← Changed from bcrypt
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { validateRegistration, validateLogin } from '../middleware/validators.js';
import { verifyToken, verifyRole } from '../middleware/verifyToken.js';

const router = express.Router();
const EMAIL_VERIFICATION_EXPIRES_HOURS = 24;
const PASSWORD_RESET_EXPIRES_HOURS = 1;
let mailTransporter = null;

const hashVerificationToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createEmailVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return {
    rawToken,
    tokenHash: hashVerificationToken(rawToken)
  };
};

const createPasswordResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return {
    rawToken,
    tokenHash: hashVerificationToken(rawToken)
  };
};

const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  try {
    return new URL(value).origin.replace(/\/$/, "");
  } catch {
    return "";
  }
};

const getOriginFromReferer = (referer) => {
  if (!referer || typeof referer !== "string") {
    return "";
  }

  try {
    return new URL(referer).origin.replace(/\/$/, "");
  } catch {
    return "";
  }
};

const inferLocalAppUrl = (req) => {
  const fallbackBaseUrl = `${req.protocol}://${req.get("host")}`;

  try {
    const url = new URL(fallbackBaseUrl);
    if ((url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.port === "5000") {
      url.port = "5173";
      return url.origin;
    }
  } catch {
    return "";
  }

  return "";
};

const getPublicAppBaseUrl = (req) => {
  const publicAppUrl = normalizeBaseUrl(process.env.PUBLIC_APP_URL);
  const requestOrigin = normalizeBaseUrl(req.get("origin"));
  const refererOrigin = getOriginFromReferer(req.get("referer"));
  const localAppUrl = inferLocalAppUrl(req);
  const fallbackBaseUrl = `${req.protocol}://${req.get("host")}`.replace(/\/$/, "");

  return publicAppUrl || requestOrigin || refererOrigin || localAppUrl || fallbackBaseUrl;
};

const buildVerificationUrl = (req, rawToken) => {
  const baseUrl = getPublicAppBaseUrl(req);
  return `${baseUrl}/verify-email?token=${rawToken}`;
};

const buildPasswordResetUrl = (req, rawToken) => {
  const baseUrl = getPublicAppBaseUrl(req);
  return `${baseUrl}/reset-password?token=${rawToken}`;
};

const redirectToAppRoute = (req, res, path) => {
  const targetOrigin = getPublicAppBaseUrl(req);
  const currentOrigin = `${req.protocol}://${req.get("host")}`.replace(/\/$/, "");
  const currentPath = req.path;
  const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
  const targetUrl = `${targetOrigin}${path}${query}`;

  if (targetOrigin === currentOrigin && path === currentPath) {
    return res.status(500).json({
      success: false,
      message: "Password reset page is not configured. Set PUBLIC_APP_URL to your frontend URL."
    });
  }

  return res.redirect(302, targetUrl);
};

const getMailerConfig = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const secure =
    typeof process.env.SMTP_SECURE === "string"
      ? process.env.SMTP_SECURE.toLowerCase() === "true"
      : port === 465;

  return { host, port, secure, user, pass };
};

const getMailTransporter = () => {
  const config = getMailerConfig();
  if (!config) {
    return null;
  }

  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });
  }

  return mailTransporter;
};

const buildVerificationEmailContent = ({ verificationUrl }) => ({
  subject: "Verify your Minion Me email",
  text: [
    "Welcome to Minion Me.",
    "",
    "Please verify your email address by opening this link:",
    verificationUrl,
    "",
    `This link expires in ${EMAIL_VERIFICATION_EXPIRES_HOURS} hours.`
  ].join("\n"),
  html: `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px">Verify your Minion Me email</h2>
      <p style="margin:0 0 12px">Welcome to Minion Me.</p>
      <p style="margin:0 0 12px">Please verify your email address by clicking the link below:</p>
      <p style="margin:0 0 16px">
        <a href="${verificationUrl}" style="background:#111;color:#fff;padding:10px 14px;text-decoration:none;border-radius:6px;display:inline-block">
          Verify Email
        </a>
      </p>
      <p style="margin:0 0 12px;word-break:break-all">If the button does not work, use this link: ${verificationUrl}</p>
      <p style="margin:0;color:#555">This link expires in ${EMAIL_VERIFICATION_EXPIRES_HOURS} hours.</p>
    </div>
  `
});

const buildPasswordResetEmailContent = ({ resetUrl }) => ({
  subject: "Reset your Minion Me password",
  text: [
    "We received a request to reset your Minion Me password.",
    "",
    "Use this link to choose a new password:",
    resetUrl,
    "",
    `This link expires in ${PASSWORD_RESET_EXPIRES_HOURS} hour(s).`,
    "If you did not request this, you can ignore this email."
  ].join("\n"),
  html: `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px">Reset your Minion Me password</h2>
      <p style="margin:0 0 12px">We received a request to reset your Minion Me password.</p>
      <p style="margin:0 0 16px">
        <a href="${resetUrl}" style="background:#111;color:#fff;padding:10px 14px;text-decoration:none;border-radius:6px;display:inline-block">
          Reset Password
        </a>
      </p>
      <p style="margin:0 0 12px;word-break:break-all">If the button does not work, use this link: ${resetUrl}</p>
      <p style="margin:0 0 12px;color:#555">This link expires in ${PASSWORD_RESET_EXPIRES_HOURS} hour(s).</p>
      <p style="margin:0;color:#555">If you did not request this, you can ignore this email.</p>
    </div>
  `
});

const sendVerificationEmail = async ({ email, verificationUrl }) => {
  const transporter = getMailTransporter();

  if (!transporter) {
    console.log(`📧 Email verification for ${email}: ${verificationUrl}`);
    console.warn("SMTP not configured. Falling back to console log for verification email.");
    return { delivered: false, fallback: true };
  }

  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;
  const fromName = process.env.MAIL_FROM_NAME || "Minion Me";
  const content = buildVerificationEmailContent({ verificationUrl });

  try {
    await transporter.sendMail({
      from: `${fromName} <${fromAddress}>`,
      to: email,
      subject: content.subject,
      text: content.text,
      html: content.html
    });

    return { delivered: true, fallback: false };
  } catch (error) {
    console.error("Failed to send verification email via SMTP:", error.message);
    console.log(`📧 Email verification for ${email}: ${verificationUrl}`);
    return { delivered: false, fallback: true };
  }
};

const sendPasswordResetEmail = async ({ email, resetUrl }) => {
  const transporter = getMailTransporter();

  if (!transporter) {
    console.log(`📧 Password reset for ${email}: ${resetUrl}`);
    console.warn("SMTP not configured. Falling back to console log for password reset email.");
    return { delivered: false, fallback: true };
  }

  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;
  const fromName = process.env.MAIL_FROM_NAME || "Minion Me";
  const content = buildPasswordResetEmailContent({ resetUrl });

  try {
    await transporter.sendMail({
      from: `${fromName} <${fromAddress}>`,
      to: email,
      subject: content.subject,
      text: content.text,
      html: content.html
    });

    return { delivered: true, fallback: false };
  } catch (error) {
    console.error("Failed to send password reset email via SMTP:", error.message);
    console.log(`📧 Password reset for ${email}: ${resetUrl}`);
    return { delivered: false, fallback: true };
  }
};

const buildVerificationResponse = (req, verificationUrl) => {
  if (process.env.NODE_ENV === "production") {
    return {};
  }

  return { verificationUrl };
};

const buildPasswordResetResponse = (req, resetUrl) => {
  if (process.env.NODE_ENV === "production") {
    return {};
  }

  return { resetUrl };
};

// Password validation helper
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const MAX_PROFILE_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;
const allowedProfilePhotoMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
]);

const parseProfilePhotoPayload = (value) => {
  if (value === null || value === undefined || value === "") {
    return { isValid: true, normalizedValue: null };
  }

  if (typeof value !== "string") {
    return { isValid: false, message: "Profile photo must be an image data URL." };
  }

  const trimmedValue = value.trim();
  const match = trimmedValue.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);

  if (!match) {
    return { isValid: false, message: "Profile photo must be a valid JPG, PNG, or WEBP image." };
  }

  const mimeType = match[1].toLowerCase();
  if (!allowedProfilePhotoMimeTypes.has(mimeType)) {
    return { isValid: false, message: "Only JPG, JPEG, PNG, and WEBP profile photos are allowed." };
  }

  const base64Content = match[2];
  const fileSizeInBytes = Buffer.byteLength(base64Content, "base64");
  if (fileSizeInBytes > MAX_PROFILE_PHOTO_SIZE_BYTES) {
    return { isValid: false, message: "Processed profile photo is still too large. Please choose a smaller image." };
  }

  return { isValid: true, normalizedValue: trimmedValue };
};

const ensureProfilePhotoColumn = async () => {
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS profile_photo_url TEXT
  `);
};

// REGISTRATION
router.post("/register", validateRegistration, async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, location, role, skills, availability, experience } = req.body;

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        message: "Password does not meet security requirements",
        errors: passwordValidation.errors
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        success: false,
        message: "User with this email already exists" 
      });
    }

    // Hash password with Argon2 ← Changed
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,      // 64 MB
      timeCost: 3,            // 3 iterations
      parallelism: 4          // 4 parallel threads
    });

    const { rawToken, tokenHash } = createEmailVerificationToken();

    // Insert user
    const result = await pool.query(
      `INSERT INTO users 
       (first_name, last_name, email, password_hash, phone, location, role, skills, availability, experience, email_verified, email_verification_token, email_verification_expires_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, $11, CURRENT_TIMESTAMP + ($12 || ' hours')::interval) 
       RETURNING id, first_name, last_name, email, phone, location, role, skills, availability, experience, profile_photo_url, email_verified, created_at`,
       [firstName, lastName, email, passwordHash, phone, location, role, skills, availability, experience, tokenHash, String(EMAIL_VERIFICATION_EXPIRES_HOURS)]
     );

    const newUser = result.rows[0];
    const verificationUrl = buildVerificationUrl(req, rawToken);
    await sendVerificationEmail({ email: newUser.email, verificationUrl });

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email before logging in.",
      requiresEmailVerification: true,
      user: newUser,
      ...buildVerificationResponse(req, verificationUrl)
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error during registration" 
    });
  }
});

// VERIFY EMAIL
router.get("/verify-email", async (req, res) => {
  try {
    const token = typeof req.query.token === "string" ? req.query.token.trim() : "";

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required"
      });
    }

    const tokenHash = hashVerificationToken(token);
    const result = await pool.query(
      `UPDATE users
       SET email_verified = TRUE,
           email_verified_at = CURRENT_TIMESTAMP,
           email_verification_token = NULL,
           email_verification_expires_at = NULL
       WHERE email_verification_token = $1
         AND email_verified = FALSE
         AND email_verification_expires_at > CURRENT_TIMESTAMP
       RETURNING id, email`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token"
      });
    }

    return res.json({
      success: true,
      message: "Email verified successfully. You can now log in."
    });
  } catch (err) {
    console.error("Email verification error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during email verification"
    });
  }
});

// RESEND EMAIL VERIFICATION
router.post("/resend-verification", async (req, res) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const userResult = await pool.query(
      `SELECT id, email, email_verified
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        message: "If that email exists, a verification link has been sent."
      });
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      return res.json({
        success: true,
        message: "Email is already verified."
      });
    }

    const { rawToken, tokenHash } = createEmailVerificationToken();
    await pool.query(
      `UPDATE users
       SET email_verification_token = $1,
           email_verification_expires_at = CURRENT_TIMESTAMP + ($2 || ' hours')::interval
       WHERE id = $3`,
      [tokenHash, String(EMAIL_VERIFICATION_EXPIRES_HOURS), user.id]
    );

    const verificationUrl = buildVerificationUrl(req, rawToken);
    await sendVerificationEmail({ email: user.email, verificationUrl });

    return res.json({
      success: true,
      message: "Verification email sent.",
      ...buildVerificationResponse(req, verificationUrl)
    });
  } catch (err) {
    console.error("Resend verification error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while resending verification email"
    });
  }
});

// FORGOT PASSWORD
router.post("/forgot-password", async (req, res) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const userResult = await pool.query(
      `SELECT id, email
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        message: "If that email exists, a password reset link has been sent."
      });
    }

    const user = userResult.rows[0];
    const { rawToken, tokenHash } = createPasswordResetToken();

    await pool.query(
      `UPDATE users
       SET password_reset_token = $1,
           password_reset_expires_at = CURRENT_TIMESTAMP + ($2 || ' hours')::interval
       WHERE id = $3`,
      [tokenHash, String(PASSWORD_RESET_EXPIRES_HOURS), user.id]
    );

    const resetUrl = buildPasswordResetUrl(req, rawToken);
    await sendPasswordResetEmail({ email: user.email, resetUrl });

    return res.json({
      success: true,
      message: "If that email exists, a password reset link has been sent.",
      ...buildPasswordResetResponse(req, resetUrl)
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while requesting password reset"
    });
  }
});

router.get("/reset-password", (req, res) => {
  return redirectToAppRoute(req, res, "/reset-password");
});

// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required"
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Password does not meet security requirements",
        errors: passwordValidation.errors
      });
    }

    const tokenHash = hashVerificationToken(token);
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4
    });

    const result = await pool.query(
      `UPDATE users
       SET password_hash = $1,
           password_reset_token = NULL,
           password_reset_expires_at = NULL
       WHERE password_reset_token = $2
         AND password_reset_expires_at > CURRENT_TIMESTAMP
       RETURNING id, email`,
      [passwordHash, tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }

    return res.json({
      success: true,
      message: "Password reset successfully. You can now log in."
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while resetting password"
    });
  }
});

// LIST MINIONS FOR CLIENT BROWSING
router.get("/minions", verifyToken, verifyRole(["client", "admin"]), async (req, res) => {
  try {
    const result = await pool.query(
       `SELECT
         u.id,
         u.first_name,
         u.last_name,
         u.email,
         u.phone,
         u.location,
         u.skills,
         u.availability,
         u.experience,
         u.profile_photo_url,
         u.created_at,
         COALESCE(ROUND(AVG(mr.rating)::numeric, 2), 0) AS average_rating,
         COUNT(mr.id)::int AS rating_count
       FROM users u
       LEFT JOIN minion_ratings mr ON mr.minion_id = u.id
       WHERE u.role = 'minion'
         AND u.email_verified = TRUE
         AND u.is_active = TRUE
         AND u.deleted_at IS NULL
       GROUP BY
        u.id,
        u.first_name,
        u.last_name,
        u.email,
         u.phone,
         u.location,
         u.skills,
         u.availability,
         u.experience,
         u.profile_photo_url,
         u.created_at
        ORDER BY u.created_at DESC`
    );

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error("Fetch minions error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch minions"
    });
  }
});

router.get("/minions/:id", verifyToken, verifyRole(["client", "admin"]), async (req, res) => {
  try {
    const minionId = Number(req.params.id);

    if (!Number.isInteger(minionId) || minionId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid minion ID"
      });
    }

    const result = await pool.query(
       `SELECT
         u.id,
         u.first_name,
         u.last_name,
         u.email,
         u.phone,
         u.location,
         u.skills,
         u.availability,
         u.experience,
         u.profile_photo_url,
         u.created_at,
         COALESCE(ROUND(AVG(mr.rating)::numeric, 2), 0) AS average_rating,
         COUNT(mr.id)::int AS rating_count
       FROM users u
       LEFT JOIN minion_ratings mr ON mr.minion_id = u.id
       WHERE u.id = $1
         AND u.role = 'minion'
         AND u.email_verified = TRUE
         AND u.is_active = TRUE
         AND u.deleted_at IS NULL
       GROUP BY
        u.id,
        u.first_name,
        u.last_name,
        u.email,
         u.phone,
         u.location,
         u.skills,
         u.availability,
         u.experience,
         u.profile_photo_url,
         u.created_at`,
      [minionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Minion not found"
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Fetch minion profile error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch minion profile"
    });
  }
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    await ensureProfilePhotoColumn();

    const result = await pool.query(
      `SELECT
         id,
         first_name,
         last_name,
         email,
         role,
         phone,
         location,
         skills,
         availability,
         experience,
         profile_photo_url,
         email_verified,
         is_active,
         created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Session is no longer valid"
      });
    }

    const currentUser = result.rows[0];
    if (currentUser.email_verified === false) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before continuing."
      });
    }

    if (currentUser.is_active === false) {
      return res.status(403).json({
        success: false,
        message: "This account has been deactivated. Please contact support or an administrator."
      });
    }

    return res.json({
      success: true,
      data: currentUser
    });
  } catch (err) {
    console.error("Fetch current user error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to validate session"
    });
  }
});

router.put("/profile", verifyToken, verifyRole(["client", "minion"]), async (req, res) => {
  try {
    await ensureProfilePhotoColumn();

    const firstName = typeof req.body?.firstName === "string" ? req.body.firstName.trim() : "";
    const lastName = typeof req.body?.lastName === "string" ? req.body.lastName.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
    const location = typeof req.body?.location === "string" ? req.body.location.trim() : "";
    const skills = typeof req.body?.skills === "string" ? req.body.skills.trim() : undefined;
    const availability = typeof req.body?.availability === "string" ? req.body.availability.trim() : undefined;
    const experience = typeof req.body?.experience === "string" ? req.body.experience.trim() : undefined;
    const profilePhoto = parseProfilePhotoPayload(req.body?.profilePhoto);

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, and email are required."
      });
    }

    if (!profilePhoto.isValid) {
      return res.status(400).json({
        success: false,
        message: profilePhoto.message
      });
    }

    const existingEmail = await pool.query(
      `SELECT id
       FROM users
       WHERE email = $1
         AND id <> $2`,
      [email, req.user.id]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Another account is already using that email address."
      });
    }

    const currentUserResult = await pool.query(
      `SELECT id, role, skills, availability, experience
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (currentUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found."
      });
    }

    const currentUser = currentUserResult.rows[0];
    const nextSkills = currentUser.role === "minion" ? (skills ?? currentUser.skills) : currentUser.skills;
    const nextAvailability = currentUser.role === "minion" ? (availability ?? currentUser.availability) : currentUser.availability;
    const nextExperience = currentUser.role === "minion" ? (experience ?? currentUser.experience) : currentUser.experience;

    const result = await pool.query(
      `UPDATE users
       SET first_name = $1,
           last_name = $2,
           email = $3,
           phone = $4,
           location = $5,
           skills = $6,
           availability = $7,
           experience = $8,
           profile_photo_url = $9
       WHERE id = $10
         AND role = $11
       RETURNING
         id,
         first_name,
         last_name,
         email,
         role,
         phone,
         location,
         skills,
         availability,
         experience,
         profile_photo_url,
         email_verified,
         created_at`,
      [
        firstName,
        lastName,
        email,
        phone || null,
        location || null,
        nextSkills,
        nextAvailability,
        nextExperience,
        profilePhoto.normalizedValue,
        req.user.id,
        currentUser.role
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found."
      });
    }

    return res.json({
      success: true,
      message: "Profile updated successfully.",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Update client profile error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update client profile."
    });
  }
});

// LOGIN
router.post("/login", validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    const user = result.rows[0];

    // Verify password with Argon2 ← Changed
    const validPassword = await argon2.verify(user.password_hash, password);

    if (!validPassword) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    if (user.email_verified === false) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
        requiresEmailVerification: true
      });
    }

    if (user.is_active === false || user.deleted_at) {
      return res.status(403).json({
        success: false,
        message: "This account has been deactivated. Please contact support or an administrator."
      });
    }

    // Generate JWT token
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    // Return user without password
    const {
      password_hash,
      email_verification_token,
      email_verification_expires_at,
      ...userWithoutPassword
    } = user;

    res.json({
      success: true,
      message: "Login successful",
      token: accessToken,
      user: userWithoutPassword
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error during login" 
    });
  }
});

export default router;
