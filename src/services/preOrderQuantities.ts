import { isLbsUnit } from './creditCalculator.ts';

// Cuántas cajas/baldes pidió una pre-orden por producto — para que Warehouse
// vea "Producto – 3 cajas" sin elegir cajas puntuales (Fase 146).
//
// - Lbs: cada caja es UNA fila de pre_order_items (antes y después de
//   convertir), así que "cuántas cajas" = cuántas filas tiene ese producto.
//   `quantity` en Lbs es peso (o un relleno 1.00 en borrador), nunca cajas.
// - Case/Unit/Bucket: `quantity` ya son cajas/baldes (NULL si la pre-orden
//   todavía no trae la cantidad).

export interface PreOrderItemRow {
  barcode: string;
  product_name: string;
  quantity: number | string | null;
  unit: string | null;
  case_qty: number | null;
}

export interface PreOrderSummaryLine {
  barcode: string;
  product_name: string;
  unit: string | null;
  case_qty: number | null;
  // Solo Lbs: número de cajas (filas). null para Case/Unit/Bucket.
  box_count: number | null;
  // Cajas/baldes pedidos: box_count en Lbs, suma de quantity en el resto
  // (null si ninguna fila trae cantidad).
  requested_qty: number | null;
  // Suma de quantity tal cual (peso en Lbs). null si ninguna fila la trae.
  quantity: number | null;
}

// `unit` ya viene resuelto (COALESCE(pi.unit, products.unit)) — una pre-orden
// sin detallar tiene pi.unit NULL y isLbsUnit(null) es true, así que sin
// resolverla contra products todo borrador pasaría por Lbs.
export function summarizePreOrderItems(rows: PreOrderItemRow[]): PreOrderSummaryLine[] {
  const groups = new Map<string, PreOrderItemRow[]>();
  for (const r of rows) {
    const key = isLbsUnit(r.unit) ? `${r.barcode}|LBS` : `${r.barcode}|${r.unit}|${r.case_qty ?? ''}`;
    const g = groups.get(key);
    if (g) g.push(r); else groups.set(key, [r]);
  }

  const lines: PreOrderSummaryLine[] = [];
  for (const g of groups.values()) {
    const first = g[0]!;
    const quantities = g.filter(r => r.quantity != null).map(r => Number(r.quantity) || 0);
    const qtySum = quantities.length > 0 ? quantities.reduce((a, b) => a + b, 0) : null;
    const lbs = isLbsUnit(first.unit);
    lines.push({
      barcode: first.barcode,
      product_name: first.product_name,
      unit: first.unit,
      case_qty: first.case_qty,
      box_count: lbs ? g.length : null,
      requested_qty: lbs ? g.length : qtySum,
      quantity: qtySum,
    });
  }
  return lines;
}

export const MAX_BOX_COUNT = 200;

// El vendedor manda un ítem Lbs con `box_count: N` (stepper de cajas) y se
// guardan N filas — el mismo formato que ya tenían las cajas elegidas una por
// una, así lo demás (conversión, ruta) no cambia.
export function expandBoxItems<T extends Record<string, unknown>>(
  items: T[]
): { items: Omit<T, 'box_count'>[] } | { error: string } {
  const out: Omit<T, 'box_count'>[] = [];
  for (const item of items) {
    const { box_count, ...rest } = item;
    if (box_count == null) {
      out.push(rest as Omit<T, 'box_count'>);
      continue;
    }
    const n = Number(box_count);
    if (!Number.isInteger(n) || n < 1 || n > MAX_BOX_COUNT) {
      return { error: `box_count debe ser un entero entre 1 y ${MAX_BOX_COUNT}` };
    }
    for (let i = 0; i < n; i++) out.push({ ...rest } as Omit<T, 'box_count'>);
  }
  return { items: out };
}
