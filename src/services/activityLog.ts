import pool from '../db/connection.ts';
import logger from './logger.ts';

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      user_email VARCHAR(255) NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NULL,
      entity_id VARCHAR(50) NULL,
      details TEXT NULL,
      ip VARCHAR(45) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  tableReady = true;
}

export async function logActivity(params: {
  userId?: number | null
  userEmail?: string | null
  action: string
  entityType?: string
  entityId?: string | number
  details?: string
  ip?: string
}) {
  try {
    await ensureTable();
    await pool.query(
      `INSERT INTO activity_log (user_id, user_email, action, entity_type, entity_id, details, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        params.userId ?? null,
        params.userEmail ?? null,
        params.action,
        params.entityType ?? null,
        params.entityId != null ? String(params.entityId) : null,
        params.details ?? null,
        params.ip ?? null,
      ]
    );
  } catch (err) {
    logger.warn('activityLog error (non-critical):', err);
  }
}
