import pool from '../db/connection.ts';
import logger from './logger.ts';

export interface CreditTransaction {
  id: number;
  customer_id: string | null;
  customer_name: string | null;
  type: 'EARNED' | 'USED';
  amount: number;
  reference_batch_id: string | null;
  invoice_id: string | null;
  created_at: string;
}

export async function getCustomerBalance(customerId: string): Promise<{
  customer_id: string;
  balance: number;
  earned_total: number;
  used_total: number;
}> {
  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'EARNED' THEN amount ELSE 0 END), 0) AS earned_total,
       COALESCE(SUM(CASE WHEN type = 'USED'   THEN amount ELSE 0 END), 0) AS used_total
     FROM credit_transactions
     WHERE customer_id = ?`,
    [customerId]
  ) as any[];
  const r = rows[0] || { earned_total: 0, used_total: 0 };
  const earned = Number(r.earned_total);
  const used   = Number(r.used_total);
  return {
    customer_id: customerId,
    balance:     Math.round((earned - used) * 100) / 100,
    earned_total: Math.round(earned * 100) / 100,
    used_total:   Math.round(used * 100) / 100,
  };
}

export async function getCustomerCreditHistory(customerId: string): Promise<CreditTransaction[]> {
  const [rows] = await pool.query(
    `SELECT id, customer_id, customer_name, type, amount, reference_batch_id, invoice_id, created_at
     FROM credit_transactions
     WHERE customer_id = ?
     ORDER BY created_at DESC`,
    [customerId]
  ) as any[];
  return rows as CreditTransaction[];
}

export async function applyCustomerCredit(
  customerId: string,
  customerName: string | null,
  amount: number,
  referenceBatchId: string,
  invoiceId?: string | null
): Promise<void> {
  if (amount <= 0) return;
  // Verificar balance suficiente
  const { balance } = await getCustomerBalance(customerId);
  if (balance < amount) {
    throw new Error(`Saldo insuficiente: disponible $${balance.toFixed(2)}, solicitado $${amount.toFixed(2)}`);
  }
  await pool.query(
    `INSERT INTO credit_transactions (customer_id, customer_name, type, amount, reference_batch_id, invoice_id)
     VALUES (?, ?, 'USED', ?, ?, ?)`,
    [customerId, customerName, amount, referenceBatchId, invoiceId ?? null]
  );
  logger.info(`applyCustomerCredit: $${amount.toFixed(2)} usado de ${customerId} en batch ${referenceBatchId}`);
}
