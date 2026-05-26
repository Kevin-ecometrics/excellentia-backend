import { makeQboApiCall, oauthClient, refreshToken } from './qbAuth.ts';

export async function findAllItems(): Promise<any[]> {
  const data = await makeQboApiCall(
    `/v3/company/${process.env.REALM_ID}/query?query=select * from Item`
  );
  return data.QueryResponse?.Item ?? [];
}

export async function findItemsUpdatedSince(since: string): Promise<any[]> {
  const data = await makeQboApiCall(
    `/v3/company/${process.env.REALM_ID}/query?query=select * from Item WHERE Metadata.LastUpdatedTime > '${since}'`
  );
  return data.QueryResponse?.Item ?? [];
}

async function getInventoryAccountRefs(): Promise<{ income: any; asset: any; expense: any } | null> {
  // Toma las cuentas contables de un ítem Inventory existente para reutilizarlas
  const data = await makeQboApiCall(
    `/v3/company/${process.env.REALM_ID}/query?query=select * from Item WHERE Type = 'Inventory' MAXRESULTS 1`
  );
  const item = data.QueryResponse?.Item?.[0];
  if (!item) return null;
  return {
    income:  item.IncomeAccountRef,
    asset:   item.AssetAccountRef,
    expense: item.ExpenseAccountRef,
  };
}

export async function createItem(name: string, price: number, description?: string, sku?: string | null, qty = 0): Promise<any> {
  if (!oauthClient.isAccessTokenValid()) {
    await refreshToken();
  }

  const refs = await getInventoryAccountRefs();
  const today = new Date().toISOString().split('T')[0];

  let body: Record<string, any>;

  if (refs) {
    // Crear como Inventory usando las mismas cuentas que los demás ítems
    body = {
      Name: name,
      Description: description ?? name,
      Active: true,
      Taxable: false,
      UnitPrice: price,
      Type: 'Inventory',
      QtyOnHand: qty,
      InvStartDate: today,
      IncomeAccountRef:  refs.income,
      AssetAccountRef:   refs.asset,
      ExpenseAccountRef: refs.expense,
    };
  } else {
    // Fallback a Service si no hay ningún ítem Inventory de referencia
    body = {
      Name: name,
      Description: description ?? name,
      Active: true,
      Taxable: false,
      UnitPrice: price,
      Type: 'Service',
      IncomeAccountRef: { value: '1', name: 'Services' },
    };
  }

  if (sku) body.Sku = sku;

  const response = await oauthClient.makeApiCall({
    url: `/v3/company/${process.env.REALM_ID}/item`,
    method: 'POST',
    body,
  });
  return response.json;
}

export async function createItemsBatch(items: { name: string; price: number; description?: string }[]): Promise<any> {
  if (items.length === 0) return { BatchItemResponse: [] };

  if (!oauthClient.isAccessTokenValid()) {
    await refreshToken();
  }

  const batchItems = items.slice(0, 25).map((item, i) => ({
    bId: `item-${i}`,
    operation: 'create',
    Item: {
      Name: item.name,
      Description: item.description ?? item.name,
      Active: true,
      Taxable: false,
      UnitPrice: item.price,
      Type: 'Service',
      IncomeAccountRef: { value: '1', name: 'Services' },
    },
  }));

  const response = await oauthClient.makeApiCall({
    url: `/v3/company/${process.env.REALM_ID}/batch`,
    method: 'POST',
    body: { BatchItemRequest: batchItems },
  });
  return response.json;
}

export async function updateItemMeta(
  itemId: string,
  fields: { name?: string; description?: string; sku?: string | null; unitPrice?: number }
): Promise<any | null> {
  const item = await getItemById(itemId);
  if (!item) return null;

  if (!oauthClient.isAccessTokenValid()) {
    await refreshToken();
  }
  const body: Record<string, any> = {
    sparse: true,
    Id: item.Id,
    SyncToken: item.SyncToken,
  };
  if (fields.name !== undefined) body.Name = fields.name;
  if (fields.description !== undefined) body.Description = fields.description ?? '';
  if (fields.sku !== undefined) body.Sku = fields.sku ?? '';
  if (fields.unitPrice !== undefined) body.UnitPrice = fields.unitPrice;

  const response = await oauthClient.makeApiCall({
    url: `/v3/company/${process.env.REALM_ID}/item`,
    method: 'POST',
    body,
  });
  return response.json;
}

export async function updateItemQtyOnHand(itemId: string, qty: number): Promise<any | null> {
  const item = await getItemById(itemId);
  if (!item || item.Type !== 'Inventory') return null;

  if (!oauthClient.isAccessTokenValid()) {
    await refreshToken();
  }
  const response = await oauthClient.makeApiCall({
    url: `/v3/company/${process.env.REALM_ID}/item`,
    method: 'POST',
    body: {
      sparse: true,
      Id: item.Id,
      SyncToken: item.SyncToken,
      QtyOnHand: qty,
      InvStartDate: item.InvStartDate ?? new Date().toISOString().split('T')[0],
    },
  });
  return response.json;
}

export async function findItemBySku(sku: string): Promise<any | null> {
  const data = await makeQboApiCall(
    `/v3/company/${process.env.REALM_ID}/query?query=select * from Item WHERE Name = '${sku.replace(/'/g, "\\'")}'`
  );
  const items = data.QueryResponse?.Item ?? [];
  return items[0] ?? null;
}

export async function getItemById(id: string): Promise<any | null> {
  const data = await makeQboApiCall(
    `/v3/company/${process.env.REALM_ID}/item/${id}`
  );
  return data.Item ?? null;
}
