// Consulta por cliente en el Sub-inventario (solo lectura): lo que hay en su
// tienda (consignación) y lo que se le vendió. Reglas puras acá para poder
// probarlas sin base de datos — el SQL vive en customerInventoryController.ts.

export const DEFAULT_SALES_DAYS = 30;
const MAX_SALES_DAYS = 3650;

/** `?days=` del historial de ventas: sin valor → 30, "all" → sin filtro (null), número entero positivo → ese rango. */
export function parseSalesDays(raw: unknown): number | null {
  if (typeof raw !== 'string' || raw.trim() === '') return DEFAULT_SALES_DAYS;
  if (raw.trim().toLowerCase() === 'all') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return DEFAULT_SALES_DAYS;
  return Math.min(n, MAX_SALES_DAYS);
}

/**
 * Lo que sigue en la tienda del cliente: dejado − vendido − devuelto.
 * Las columnas DECIMAL llegan de mysql2 como string, de ahí el Number().
 * Nunca negativo (una liquidación mal cargada no debe mostrar saldo < 0).
 */
export function consignmentRemaining(left: unknown, sold: unknown, returned: unknown): number {
  const remaining = (Number(left) || 0) - (Number(sold) || 0) - (Number(returned) || 0);
  return Math.max(Math.round(remaining * 100) / 100, 0);
}
