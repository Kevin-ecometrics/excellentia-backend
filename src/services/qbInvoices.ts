import { oauthClient, refreshToken, makeQboApiCall } from './qbAuth.ts';
import type { Order } from '../types/index.ts';
import { isLbsUnit, formatDamageQty } from './creditCalculator.ts';
import logger from './logger.ts';

const DEFAULT_CUSTOMER_REF = process.env.QB_DEFAULT_CUSTOMER_ID ?? '2';

export async function createInvoice(order: Order, qbItemId: string, classId?: string | null, docNumber?: number): Promise<any> {
  if (!oauthClient.isAccessTokenValid()) {
    await refreshToken();
  }
  const desc = `${order.product_name} - ${order.quantity} lb a $${Number(order.price).toFixed(2)}/lb`;
  const salesItemLineDetail: Record<string, any> = {
    ItemRef: { value: qbItemId },
    Qty: 1,
    UnitPrice: Number(order.total),
  };
  if (classId) salesItemLineDetail.ClassRef = { value: classId };

  const response = await oauthClient.makeApiCall({
    url: `/v3/company/${process.env.REALM_ID}/invoice`,
    method: 'POST',
    // Default de intuit-oauth es 30000ms — QBO puede tardar más que eso en
    // responder aunque la factura sí se cree del lado de ellos (ver
    // findInvoiceByDocNumber más abajo, que existe justo para ese caso).
    timeout: 60000,
    body: {
      Line: [
        {
          DetailType: 'SalesItemLineDetail',
          Amount: Number(order.total),
          Description: desc,
          SalesItemLineDetail: salesItemLineDetail,
        },
      ],
      CustomerRef: { value: order.customer_id ?? DEFAULT_CUSTOMER_REF },
      ...(docNumber && { DocNumber: String(docNumber) }),
    },
  });
  return response.json;
}

// Un timeout (u otro error de red) al crear una factura NO significa
// necesariamente que QBO no la haya creado — la llamada puede haber llegado
// y la respuesta perderse en el camino de vuelta (pasó en producción: la
// factura se creó en QBO, pero el timeout local la marcó FAILED acá).
// approveBatch/retryBatchSync llaman esto ANTES de declarar una venta como
// fallida, para no arriesgar una factura duplicada en un reintento
// posterior sobre un DocNumber que en realidad ya existe.
export async function findInvoiceByDocNumber(docNumber: number | string): Promise<{ Id: string; DocNumber: string } | null> {
  const safeDocNumber = String(docNumber).replace(/'/g, "\\'");
  const query = `SELECT Id, DocNumber FROM Invoice WHERE DocNumber = '${safeDocNumber}'`;
  const endpoint = `/v3/company/${process.env.REALM_ID}/query?query=${encodeURIComponent(query)}`;
  const data = await makeQboApiCall(endpoint);
  const invoices = data.QueryResponse?.Invoice ?? [];
  return invoices[0] ?? null;
}

interface DamageItem { barcode: string; product_name: string; qty: number; unit_price?: number; amount?: number; qb_item_id?: string | null; unit?: string | null }

export async function createBatchInvoice(
  items: { qb_item_id: string; product_name: string; price: number; quantity: number; total: number; is_courtesy?: boolean }[],
  customerId?: string | null,
  damageItems: DamageItem[] = [],
  paymentMethod?: string | null,
  checkNumber?: string | null,
  classId?: string | null,
  docNumber?: number,
  creditAmount: number = 0,
  damageComputed?: { qb_item_id: string | null; product_name: string; qty: number; unit_price: number; amount: number; unit: string | null }[],
  applyCredit?: number
): Promise<any> {
  if (!oauthClient.isAccessTokenValid()) {
    await refreshToken();
  }

  // Un mismo producto puede llegar como varias filas (ej. Lbs: cada pesada
  // individual es una fila separada en `orders`, ver CLAUDE.md del repo
  // Android) — sin esto, la factura de QBO mostraba una línea por fila (10
  // líneas de "Michoacano - 1 lb" en vez de una sola "Michoacano - 10 lb").
  // Se agrupa por qb_item_id + price + is_courtesy (mismo criterio que el
  // ticket de Android, `groupedForTicket()` en data/Models.kt) — si el precio
  // cambió entre filas no se mezclan, igual que en el carrito. is_courtesy
  // entra en la key (Fase 115.5) para que una línea regalada nunca se mezcle
  // con una pagada del mismo producto/precio — cada una factura distinto.
  const grouped = new Map<string, { qb_item_id: string; product_name: string; price: number; quantity: number; total: number; is_courtesy?: boolean }>();
  for (const item of items) {
    const key = `${item.qb_item_id}::${item.price}::${item.is_courtesy ? 1 : 0}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += Number(item.quantity);
      existing.total += Number(item.total);
    } else {
      grouped.set(key, { ...item, quantity: Number(item.quantity), total: Number(item.total) });
    }
  }
  const groupedItems = Array.from(grouped.values());

  // Cortesía: se factura en QBO a $0 (UnitPrice y Amount) — price/total
  // locales en `orders` ya guardaron el valor real de catálogo para
  // reportería ("cuánto se regaló"), acá es donde se aplica el descuento
  // real a la factura, no antes.
  const lines: any[] = groupedItems.map(item => {
    const isCourtesy = !!item.is_courtesy;
    const unitPrice = isCourtesy ? 0 : Number(item.price);
    const amount = isCourtesy ? 0 : Number(item.total);
    const salesItemLineDetail: Record<string, any> = {
      ItemRef: { value: item.qb_item_id },
      Qty: item.quantity,
      UnitPrice: unitPrice,
    };
    if (classId) salesItemLineDetail.ClassRef = { value: classId };
    return {
      DetailType: 'SalesItemLineDetail' as const,
      Amount: amount,
      Description: `${item.product_name} - ${item.quantity} lb a $${Number(item.price).toFixed(2)}/lb${isCourtesy ? ' · Cortesía' : ''}`,
      SalesItemLineDetail: salesItemLineDetail,
    };
  });

  // Líneas negativas por producto dañado — reduce el total real de la factura
  // usando el mismo qb_item_id del producto (no un ítem genérico de crédito).
  // Si damageComputed no tiene qb_item_id (registros viejos), cae al fallback
  // QB_CREDIT_ITEM_ID.
  if (damageComputed && damageComputed.length > 0) {
    const hasQbItemId = damageComputed.some(d => d.qb_item_id);
    if (hasQbItemId) {
      for (const dmg of damageComputed) {
        if (!dmg.qb_item_id || dmg.qty <= 0 || dmg.amount <= 0) continue;
        // Para Lbs, dmg.qty es el peso real dañado (no un conteo de piezas) —
        // igual que una venta normal (ver "QBO Invoices — Qty por venta" en
        // CLAUDE.md), QBO no debe descontar libras del conteo de inventario:
        // Qty fijo en -1 y el monto completo va en UnitPrice. Case/Unit y
        // Bucket sí son conteos reales de piezas — ahí Qty:-dmg.qty tiene
        // sentido tal cual (un descuento de N piezas de inventario).
        const lineDetail: Record<string, any> = isLbsUnit(dmg.unit)
          ? { ItemRef: { value: dmg.qb_item_id }, Qty: -1, UnitPrice: dmg.amount }
          : { ItemRef: { value: dmg.qb_item_id }, Qty: -dmg.qty, UnitPrice: dmg.unit_price };
        if (classId) lineDetail.ClassRef = { value: classId };
        lines.push({
          DetailType: 'SalesItemLineDetail' as const,
          Amount: -dmg.amount,
          Description: `Damaged: ${dmg.product_name} - ${formatDamageQty(dmg.qty, dmg.unit)}`,
          SalesItemLineDetail: lineDetail,
        });
      }
    } else {
      // Fallback: todos sin qb_item_id → usar QB_CREDIT_ITEM_ID si existe
      const creditItemId = process.env.QB_CREDIT_ITEM_ID;
      if (creditItemId && creditAmount > 0) {
        const creditLineDetail: Record<string, any> = {
          ItemRef: { value: creditItemId },
          Qty: 1,
          UnitPrice: -creditAmount,
        };
        if (classId) creditLineDetail.ClassRef = { value: classId };
        lines.push({
          DetailType: 'SalesItemLineDetail' as const,
          Amount: -creditAmount,
          Description: 'Store Credit / Damaged Goods',
          SalesItemLineDetail: creditLineDetail,
        });
      } else if (creditAmount > 0) {
        logger.warn(`createBatchInvoice: crédito de $${creditAmount.toFixed(2)} sin qb_item_id ni QB_CREDIT_ITEM_ID — solo memo`);
      }
    }
  } else if (creditAmount > 0) {
    // Sin damageComputed array (llamadas antiguas sin el parámetro)
    const creditItemId = process.env.QB_CREDIT_ITEM_ID;
    if (creditItemId) {
      const creditLineDetail: Record<string, any> = {
        ItemRef: { value: creditItemId },
        Qty: 1,
        UnitPrice: -creditAmount,
      };
      if (classId) creditLineDetail.ClassRef = { value: classId };
      lines.push({
        DetailType: 'SalesItemLineDetail' as const,
        Amount: -creditAmount,
        Description: 'Store Credit / Damaged Goods',
        SalesItemLineDetail: creditLineDetail,
      });
    } else {
      logger.warn(`createBatchInvoice: crédito de $${creditAmount.toFixed(2)} calculado pero QB_CREDIT_ITEM_ID no está configurado — la factura no incluye la línea negativa, solo el memo`);
    }
  }

  const body: Record<string, any> = {
    Line: lines,
    CustomerRef: { value: customerId ?? DEFAULT_CUSTOMER_REF },
    ...(docNumber && { DocNumber: String(docNumber) }),
  };

  // Discount line por crédito aplicado de saldo disponible del cliente
  if (applyCredit && applyCredit > 0) {
    const creditApplyItemId = process.env.QB_CREDIT_APPLY_ITEM_ID
        ?? process.env.QB_CREDIT_ITEM_ID
        ?? items[0]?.qb_item_id ?? null;
    if (creditApplyItemId) {
      const discountDetail: Record<string, any> = {
        ItemRef: { value: creditApplyItemId },
        Qty: 1,
        UnitPrice: -applyCredit,
      };
      if (classId) discountDetail.ClassRef = { value: classId };
      lines.push({
        DetailType: 'SalesItemLineDetail' as const,
        Amount: -applyCredit,
        Description: `Customer Credit Applied: -$${applyCredit.toFixed(2)}`,
        SalesItemLineDetail: discountDetail,
      });
    } else {
      logger.warn(`createBatchInvoice: crédito de cliente $${applyCredit.toFixed(2)} sin QB_CREDIT_APPLY_ITEM_ID — la factura no incluye la línea de descuento, solo el memo`);
    }
  }

  const memoLines: string[] = [];
  if (paymentMethod) {
    const pm = checkNumber && /^check$/i.test(paymentMethod)
      ? `Check #${checkNumber}` : `Payment: ${paymentMethod}`;
    memoLines.push(pm);
  }
  // Prefiere damageComputed (recalculado fresco desde products, con unit
  // verificado) sobre el damageItems crudo que mandó el cliente — solo cae a
  // este último si por algún motivo no se pasó damageComputed.
  const damagedSource = damageComputed && damageComputed.length > 0 ? damageComputed : damageItems;
  const damagedFiltered = damagedSource.filter(d => d.qty > 0);
  if (damagedFiltered.length > 0) {
    const detail = damagedFiltered
      .map(d => `${d.product_name}: ${formatDamageQty(d.qty, d.unit)}`)
      .join(', ');
    memoLines.push(`Negative Sale: ${detail}`);
  }
  if (applyCredit && applyCredit > 0) {
    memoLines.push(`Credit Applied: -$${applyCredit.toFixed(2)}`);
  }
  if (memoLines.length > 0) {
    body.CustomerMemo = { value: memoLines.join(' | ') };
  }

  const response = await oauthClient.makeApiCall({
    url: `/v3/company/${process.env.REALM_ID}/invoice`,
    method: 'POST',
    timeout: 60000,
    body,
  });
  return response.json;
}
