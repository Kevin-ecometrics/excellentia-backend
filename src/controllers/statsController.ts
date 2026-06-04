import type { Request, Response } from 'express';
import pool from '../db/connection.ts';
import logger from '../services/logger.ts';

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

function buildDateRange(
  period: Period,
  customFrom?: string,
  customTo?: string
): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  if (period === 'custom' && customFrom && customTo) {
    return { from: customFrom, to: customTo };
  }

  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo  = new Date(today); weekAgo.setDate(today.getDate() - 6);
  const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 29);

  switch (period) {
    case 'yesterday': return { from: fmt(yesterday), to: fmt(yesterday) };
    case 'week':      return { from: fmt(weekAgo),   to: fmt(today) };
    case 'month':     return { from: fmt(monthAgo),  to: fmt(today) };
    default:          return { from: fmt(today),      to: fmt(today) };
  }
}

export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const isOperator = req.user?.role === 'operator';
    const userId = req.user?.id;
    const userFilter = isOperator ? `AND user_id = ${userId}` : '';

    const period = (req.query.period as Period) ?? 'today';
    const customFrom = req.query.from as string | undefined;
    const customTo   = req.query.to   as string | undefined;
    const { from, to } = buildDateRange(period, customFrom, customTo);

    // Filtro de fecha para las queries dinámicas
    const dateWhere = `AND DATE(created_at) BETWEEN '${from}' AND '${to}'`;

    // Para byHour: siempre las últimas 24h del período
    const hourFrom = period === 'yesterday'
      ? `'${from} 00:00:00'`
      : `NOW() - INTERVAL 24 HOUR`;

    // Para byDay: rango según período
    const dayInterval = period === 'month' ? 29 : period === 'week' ? 6 : 0;

    const [[kpis], [byHour], [byDay], [top5], [recent], [[products]]] = await Promise.all([
      // KPIs del período
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM orders WHERE DATE(created_at) BETWEEN '${from}' AND '${to}' ${userFilter}) AS orders_period,
          (SELECT COALESCE(SUM(total),0) FROM orders WHERE DATE(created_at) BETWEEN '${from}' AND '${to}' AND status='SENT' ${userFilter}) AS revenue_period,
          (SELECT COALESCE(SUM(total),0) FROM orders WHERE status='SENT' ${userFilter}) AS revenue_total,
          (SELECT COUNT(*) FROM orders WHERE status='PENDING' ${userFilter}) AS pending,
          (SELECT COUNT(*) FROM orders WHERE status='SENT' ${userFilter}) AS sent,
          (SELECT COUNT(*) FROM orders WHERE status='FAILED' ${userFilter}) AS failed
      `),
      // Pedidos por hora
      pool.query(`
        SELECT HOUR(created_at) AS hour, COUNT(*) AS count
        FROM orders
        WHERE created_at >= ${hourFrom} ${userFilter}
        GROUP BY HOUR(created_at)
      `),
      // Tasa sync por día del período
      pool.query(`
        SELECT
          DATE_FORMAT(created_at, '%m/%d') AS day,
          SUM(CASE WHEN status='SENT' THEN 1 ELSE 0 END) AS sent,
          SUM(CASE WHEN status='FAILED' THEN 1 ELSE 0 END) AS failed
        FROM orders
        WHERE DATE(created_at) BETWEEN '${from}' AND '${to}' ${userFilter}
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
      `),
      // Top 5 productos del período
      pool.query(`
        SELECT product_name AS name, SUM(total) AS total, COUNT(*) AS count
        FROM orders WHERE status='SENT' ${dateWhere} ${userFilter}
        GROUP BY product_name
        ORDER BY total DESC
        LIMIT 5
      `),
      // Actividad reciente del período
      pool.query(`
        SELECT id, product_name, customer_name, total, status, created_at, batch_id
        FROM orders
        WHERE DATE(created_at) BETWEEN '${from}' AND '${to}'
        ${isOperator ? `AND user_id = ${userId}` : ''}
        ORDER BY created_at DESC LIMIT 6
      `),
      // Productos no ocultos (siempre global)
      pool.query(`
        SELECT
          COUNT(*) AS total,
          SUM(qb_item_id IS NOT NULL) AS with_qb,
          SUM(barcode IS NULL OR barcode = '') AS no_barcode,
          SUM(weight_per_unit IS NULL) AS no_weight
        FROM products
        WHERE hidden = 0
      `),
    ]) as any[];

    // Llenar horas sin datos con 0
    const hourMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourMap[h] = 0;
    for (const row of byHour) hourMap[Number(row.hour)] = Number(row.count);
    const byHourFull = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap[h] }));

    // Llenar días del rango con 0
    const pad = (n: number) => String(n).padStart(2, '0');
    const rangeStart = new Date(from);
    const rangeEnd   = new Date(to);
    const days: string[] = [];
    for (const d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
      days.push(`${pad(d.getMonth()+1)}/${pad(d.getDate())}`);
    }
    const dayMap: Record<string, { sent: number; failed: number }> = {};
    for (const d of days) dayMap[d] = { sent: 0, failed: 0 };
    for (const row of byDay) {
      if (dayMap[row.day]) dayMap[row.day] = { sent: Number(row.sent), failed: Number(row.failed) };
    }
    const byDayFull = days.map(d => ({ day: d, ...dayMap[d] }));

    const k = (kpis as any[])[0];

    res.json({
      period,
      kpis: {
        ordersPeriod:  Number(k.orders_period),
        revenuePeriod: Number(k.revenue_period),
        revenueTotal:  Number(k.revenue_total),
        pending:       Number(k.pending),
        sent:          Number(k.sent),
        failed:        Number(k.failed),
      },
      byHour: byHourFull,
      byDay:  byDayFull,
      top5:   (top5 as any[]).map(r => ({ name: r.name, total: Number(r.total), count: Number(r.count) })),
      recent: recent as any[],
      products: {
        total:     Number(products.total),
        withQb:    Number(products.with_qb),
        noBarcode: Number(products.no_barcode),
        noWeight:  Number(products.no_weight),
      },
    });
  } catch (err) {
    logger.error('getStats error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
