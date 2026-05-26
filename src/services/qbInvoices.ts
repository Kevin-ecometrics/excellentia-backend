import { oauthClient, refreshToken } from './qbAuth.ts';
import type { Order } from '../types/index.ts';

const DEFAULT_CUSTOMER_REF = process.env.QB_DEFAULT_CUSTOMER_ID ?? '2';

export async function createInvoice(order: Order, qbItemId: string): Promise<any> {
  if (!oauthClient.isAccessTokenValid()) {
    await refreshToken();
  }
  const desc = `${order.product_name} - ${order.quantity} lb a $${Number(order.price).toFixed(2)}/lb`;
  const response = await oauthClient.makeApiCall({
    url: `/v3/company/${process.env.REALM_ID}/invoice`,
    method: 'POST',
    body: {
      Line: [
        {
          DetailType: 'SalesItemLineDetail',
          Amount: Number(order.total),
          Description: desc,
          SalesItemLineDetail: {
            ItemRef: { value: qbItemId },
            Qty: 1,
            UnitPrice: Number(order.total),
          },
        },
      ],
      CustomerRef: { value: order.customer_id ?? DEFAULT_CUSTOMER_REF },
    },
  });
  return response.json;
}

interface DamageItem { barcode: string; product_name: string; qty: number }

export async function createBatchInvoice(
  items: { qb_item_id: string; product_name: string; price: number; quantity: number; total: number }[],
  customerId?: string | null,
  damageItems: DamageItem[] = [],
  paymentMethod?: string | null
): Promise<any> {
  if (!oauthClient.isAccessTokenValid()) {
    await refreshToken();
  }
  const lines: any[] = items.map(item => ({
    DetailType: 'SalesItemLineDetail' as const,
    Amount: Number(item.total),
    Description: `${item.product_name} - ${item.quantity} lb a $${Number(item.price).toFixed(2)}/lb`,
    SalesItemLineDetail: {
      ItemRef: { value: item.qb_item_id },
      Qty: 1,
      UnitPrice: Number(item.total),
    },
  }));

  const body: Record<string, any> = {
    Line: lines,
    CustomerRef: { value: customerId ?? DEFAULT_CUSTOMER_REF },
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
