import type { Response } from 'express';
import pool from '../db/connection.ts';
import { isLbsUnit } from './creditCalculator.ts';

// Validación de "cantidad vs tipo de producto" del módulo Almacén (recepción,
// carga a ruta, edición de lote, devoluciones): Case/Unit/Bucket solo admiten
// cantidades enteras. Si alguna línea no cuadra, el endpoint RECHAZA con 400 y
// un mensaje claro (no guarda nada) — Android lo muestra como notificación.
// Lbs nunca se valida (5 lb exactas es normal). (Intentos previos descartados:
// 409 con confirmación, y "guardar y avisar".)

export type QuantityWarningCode = 'FRACTIONAL_COUNT';

export interface QuantityCheck {
  code: QuantityWarningCode;
  message: string;
}

export interface QuantityWarning extends QuantityCheck {
  product_id: number;
  product_name: string | null;
  barcode: string | null;
  unit: string | null;
  quantity: number;
}

// Number(quantity): las columnas DECIMAL llegan de mysql2 como string.
export function checkQuantityForUnit(quantity: number, unit: string | null | undefined): QuantityCheck | null {
  const q = Number(quantity);
  if (!Number.isFinite(q) || q <= 0) return null; // lo rechaza la validación propia del endpoint

  // Lbs nunca genera warning: un peso entero exacto (ej. cajas de 5 lb) es
  // legítimo — la regla "entero sospechoso en Lbs" daba falsos positivos y
  // bloqueaba recepciones reales (2026-09-30).
  if (isLbsUnit(unit)) return null;

  if (!Number.isInteger(q)) {
    return {
      code: 'FRACTIONAL_COUNT',
      message: `Este tipo de producto (${unit}) no puede ser ${q} — solo admite cantidades enteras.`,
    };
  }
  return null;
}

// Revisa varias líneas { product_id, quantity } contra el `unit` actual del
// producto (una sola query). Líneas sin product_id o con producto inexistente
// se ignoran — cada endpoint ya las reporta con su propio error.
export async function collectQuantityWarnings(
  lines: { product_id?: number | null; barcode?: string | null; quantity: number }[]
): Promise<QuantityWarning[]> {
  const ids = [...new Set(lines.filter(l => l.product_id).map(l => Number(l.product_id)))];
  const barcodes = [...new Set(lines.filter(l => !l.product_id && l.barcode).map(l => String(l.barcode)))];
  if (ids.length === 0 && barcodes.length === 0) return [];

  // `IN (NULL)` no matchea nada — evita armar un `IN ()` inválido.
  const [rows] = await pool.query(
    'SELECT id, name, barcode, unit FROM products WHERE id IN (?) OR barcode IN (?)',
    [ids.length ? ids : [null], barcodes.length ? barcodes : [null]]
  ) as any[];
  const byId = new Map<number, any>(rows.map((r: any) => [Number(r.id), r]));
  const byBarcode = new Map<string, any>(rows.filter((r: any) => r.barcode).map((r: any) => [String(r.barcode), r]));

  const warnings: QuantityWarning[] = [];
  for (const line of lines) {
    const product = line.product_id
      ? byId.get(Number(line.product_id))
      : line.barcode ? byBarcode.get(String(line.barcode)) : undefined;
    if (!product) continue;
    const check = checkQuantityForUnit(line.quantity, product.unit);
    if (!check) continue;
    warnings.push({
      ...check,
      product_id: Number(product.id),
      product_name: product.name ?? null,
      barcode: product.barcode ?? null,
      unit: product.unit ?? null,
      quantity: Number(line.quantity),
    });
  }
  return warnings;
}

// Si alguna línea es inválida responde 400 (nada se guardó) y devuelve true — el
// caller debe hacer `return`. `error` ya viene listo para mostrarse tal cual:
// "Chicharron 10#: Este tipo de producto (Case) no puede ser 6.5 — solo admite
// cantidades enteras."
export function respondIfInvalidQuantities(res: Response, invalid: QuantityWarning[]): boolean {
  if (invalid.length === 0) return false;
  res.status(400).json({
    error: invalid.map(w => `${w.product_name ?? 'Producto'}: ${w.message}`).join('\n'),
    invalid_quantities: invalid,
  });
  return true;
}
