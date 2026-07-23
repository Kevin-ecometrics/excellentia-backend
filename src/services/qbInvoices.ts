import { oauthClient, refreshToken } from './qbAuth.ts';
import type { Order } from '../types/index.ts';
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

interface DamageItem { barcode: string; product_name: string; qty: number }

export async function createBatchInvoice(
  items: { qb_item_id: string; product_name: string; price: number; quantity: number; total: number }[],
  customerId?: string | null,
  damageItems: DamageItem[] = [],
  paymentMethod?: string | null,
  classId?: string | null,
  docNumber?: number,
  creditAmount: number = 0
): Promise<any> {
  if (!oauthClient.isAccessTokenValid()) {
    await refreshToken();
  }
  const lines: any[] = items.map(item => {
    const salesItemLineDetail: Record<string, any> = {
      ItemRef: { value: item.qb_item_id },
      Qty: 1,
      UnitPrice: Number(item.total),
    };
    if (classId) salesItemLineDetail.ClassRef = { value: classId };
    return {
      DetailType: 'SalesItemLineDetail' as const,
      Amount: Number(item.total),
      Description: `${item.product_name} - ${item.quantity} lb a $${Number(item.price).toFixed(2)}/lb`,
      SalesItemLineDetail: salesItemLineDetail,
    };
  });

  // Línea negativa por crédito de daño — reduce el total real de la factura,
  // no solo el memo de texto. Requiere un item de QBO configurado en
  // QB_CREDIT_ITEM_ID; si no está configurado, se omite la línea y el crédito
  // queda solo como memo (comportamiento anterior), sin romper la factura.
  const creditItemId = process.env.QB_CREDIT_ITEM_ID;
  if (creditAmount > 0) {
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

  const memoLines: string[] = [];
  if (paymentMethod) memoLines.push(`Payment: ${paymentMethod}`);
  const damagedFiltered = damageItems.filter(d => d.qty > 0);
  if (damagedFiltered.length > 0) {
    const detail = damagedFiltered
      .map(d => `${d.product_name}: ${d.qty} unit(s)`)
      .join(', ');
    memoLines.push(`Negative Sale: ${detail}`);
  }
  if (memoLines.length > 0) {
    body.CustomerMemo = { value: memoLines.join(' | ') };
  }

  const response = await oauthClient.makeApiCall({
    url: `/v3/company/${process.env.REALM_ID}/invoice`,
    method: 'POST',
    body,
  });
  return response.json;
}
