import pool from '../db/connection.ts';

// Desglose por lote de una línea de ruta (route_items) — lee route_item_lots
// (Fase 112), que ya guardaba qué lote(s) alimentaron cada carga pero no se
// exponía. Sirve para que la ruta y la revisión de devoluciones muestren cada
// caja (lote + peso) en vez de un solo total por producto.

export interface LotDetail {
  lot_id: number;
  lot_number: string | null;
  supplier: string | null;
  expiration_date: string | null;
  quantity: number;     // lo que se cargó A LA RUTA desde este lote (peso si es Lbs)
  received_qty: number; // tamaño original del lote al recibirlo
}

// Number(): las columnas DECIMAL llegan de mysql2 como string (mismo gotcha
// documentado en CLAUDE.md para TINYINT(1)/DECIMAL).
export function groupLotsByItem(rows: any[]): Map<number, LotDetail[]> {
  const byItem = new Map<number, LotDetail[]>();
  for (const r of rows) {
    const itemId = Number(r.route_item_id);
    const list = byItem.get(itemId) ?? [];
    const lotId = Number(r.lot_id);
    // Dos cargas del mismo producto que cayeron en el mismo lote = dos filas
    // en route_item_lots; se muestran como una sola caja con la suma.
    const existing = list.find(l => l.lot_id === lotId);
    if (existing) {
      existing.quantity = Math.round((existing.quantity + Number(r.quantity)) * 100) / 100;
    } else {
      list.push({
        lot_id: lotId,
        lot_number: r.lot_number ?? null,
        supplier: r.supplier ?? null,
        expiration_date: r.expiration_date ?? null,
        quantity: Number(r.quantity),
        received_qty: Number(r.received_qty),
      });
    }
    byItem.set(itemId, list);
  }
  // Expiración ASC (sin fecha al final — igual que computeFifoAllocation),
  // desempate por lot_id.
  for (const list of byItem.values()) {
    // expiration_date puede llegar como Date (DATE de mysql2) o string —
    // se compara por timestamp, no por referencia ni por texto.
    const ts = (d: any) => (d == null ? Infinity : new Date(d).getTime());
    list.sort((a, b) => {
      const ta = ts(a.expiration_date), tb = ts(b.expiration_date);
      if (ta !== tb) return ta < tb ? -1 : 1;
      return a.lot_id - b.lot_id;
    });
  }
  return byItem;
}

// Parte de la línea que no vino de ningún lote (carga con source: 'STOCK'),
// para que el desglose siempre sume al total de la línea.
export function unlottedQty(total: number, lots: Pick<LotDetail, 'quantity'>[]): number {
  const covered = lots.reduce((s, l) => s + l.quantity, 0);
  return Math.max(Math.round((Number(total) - covered) * 100) / 100, 0);
}

export async function loadLotsForRouteItems(routeItemIds: number[]): Promise<Map<number, LotDetail[]>> {
  if (routeItemIds.length === 0) return new Map();
  const [rows] = await pool.query(
    `SELECT ril.route_item_id, ril.lot_id, ril.quantity,
            pl.lot_number, pl.supplier, pl.expiration_date, pl.received_qty
     FROM route_item_lots ril
     JOIN product_lots pl ON pl.id = ril.lot_id
     WHERE ril.route_item_id IN (?)`, [routeItemIds]
  ) as any[];
  return groupLotsByItem(rows as any[]);
}
