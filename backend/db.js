import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER || "minion_app",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "minion_me",
  password: process.env.DB_PASSWORD || "l33z3l",
  port: process.env.DB_PORT || 5432,
});

export const initializeDatabase = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_management_audit_log (
      id SERIAL PRIMARY KEY,
      target_user_id INTEGER,
      target_email VARCHAR(255),
      action_type VARCHAR(60) NOT NULL,
      action_label VARCHAR(160) NOT NULL,
      actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_role VARCHAR(20),
      actor_name VARCHAR(160),
      notes TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_management_audit_log_target_created_at
    ON user_management_audit_log(target_user_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_management_audit_log_action_type
    ON user_management_audit_log(action_type)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL DEFAULT 'info',
      title VARCHAR(160) NOT NULL,
      message TEXT NOT NULL,
      metadata JSONB,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
    ON notifications(user_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read_at
    ON notifications(user_id, read_at)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      minion_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      phone VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      merchant_request_id VARCHAR(120),
      checkout_request_id VARCHAR(120) UNIQUE,
      mpesa_receipt_number VARCHAR(120),
      result_code INTEGER,
      result_desc TEXT,
      raw_callback JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      paid_at TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_payments_task_id ON payments(task_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS minion_ratings (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      minion_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (task_id, client_id)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_minion_ratings_minion_id ON minion_ratings(minion_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_minion_ratings_task_id ON minion_ratings(task_id)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_audit_log (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      action_type VARCHAR(60) NOT NULL,
      action_label VARCHAR(160) NOT NULL,
      actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_role VARCHAR(20),
      actor_name VARCHAR(160),
      notes TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_task_audit_log_task_id_created_at
    ON task_audit_log(task_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_task_audit_log_action_type
    ON task_audit_log(action_type)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS disputes (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      raised_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason VARCHAR(80) NOT NULL,
      description TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'open',
      admin_note TEXT,
      resolution_action VARCHAR(60),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_disputes_task_id_created_at
    ON disputes(task_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_disputes_status_created_at
    ON disputes(status, created_at DESC)
  `);

  const usersTableCheck = await pool.query(`
    SELECT to_regclass('public.users') AS users_table
  `);

  const tasksTableCheck = await pool.query(`
    SELECT to_regclass('public.tasks') AS tasks_table
  `);

  if (tasksTableCheck.rows[0]?.tasks_table) {
    await pool.query(`
      ALTER TABLE tasks
      DROP CONSTRAINT IF EXISTS tasks_status_check
    `);

    await pool.query(`
      ALTER TABLE tasks
      ADD CONSTRAINT tasks_status_check
      CHECK (status IN ('open', 'pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'paid', 'paused', 'archived'))
    `);

    await pool.query(`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS invited_minion_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_invited_minion_id ON tasks(invited_minion_id)
    `);

    await pool.query(`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'normal'
    `);

    await pool.query(`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP
    `);

    await pool.query(`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS has_active_dispute BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await pool.query(`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS active_dispute_status VARCHAR(30)
    `);

    await pool.query(`
      ALTER TABLE tasks
      DROP CONSTRAINT IF EXISTS tasks_priority_check
    `);

    await pool.query(`
      ALTER TABLE tasks
      ADD CONSTRAINT tasks_priority_check
      CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
    `);

    await pool.query(`
      UPDATE tasks t
      SET has_active_dispute = EXISTS (
            SELECT 1
            FROM disputes d
            WHERE d.task_id = t.id
              AND d.status IN ('open', 'under_review')
          ),
          active_dispute_status = (
            SELECT d.status
            FROM disputes d
            WHERE d.task_id = t.id
              AND d.status IN ('open', 'under_review')
            ORDER BY d.created_at DESC, d.id DESC
            LIMIT 1
          )
    `);
  }

  if (usersTableCheck.rows[0]?.users_table) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS deactivated_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS deleted_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(128)
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(128)
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP
    `);

    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS profile_photo_url TEXT
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email_verification_token
      ON users(email_verification_token)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_password_reset_token
      ON users(password_reset_token)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_is_active
      ON users(is_active)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role_is_active
      ON users(role, is_active)
    `);

    // Preserve access for accounts created before email verification existed.
    await pool.query(`
      UPDATE users
      SET email_verified = TRUE, email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP)
      WHERE email_verified = FALSE
        AND email_verified_at IS NULL
        AND email_verification_token IS NULL
        AND email_verification_expires_at IS NULL
    `);
  }
};

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database error:', err);
  process.exit(-1);
});

export default pool;
