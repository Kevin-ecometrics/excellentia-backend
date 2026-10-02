import { describe, expect, test } from 'bun:test';
import { groupLotsByItem, unlottedQty } from './routeLots.ts';

const row = (o: Record<string, any>) => ({
  route_item_id: 1, lot_id: 1, lot_number: null, supplier: null,
  expiration_date: null, quantity: '10.00', received_qty: '30.00', ...o,
});

describe('groupLotsByItem', () => {
  test('agrupa por route_item_id y castea DECIMAL (string) a number', () => {
    const map = groupLotsByItem([row({ route_item_id: 1, lot_id: 5 }), row({ route_item_id: 2, lot_id: 6, quantity: '2.35' })]);
    expect(map.get(1)).toHaveLength(1);
    expect(map.get(1)![0]!.quantity).toBe(10);
    expect(map.get(2)![0]!.quantity).toBe(2.35);
    expect(map.get(2)![0]!.received_qty).toBe(30);
  });

  test('ordena por expiración ASC, sin fecha al final, desempate por lot_id', () => {
    const map = groupLotsByItem([
      row({ lot_id: 3, expiration_date: null }),
      row({ lot_id: 2, expiration_date: '2026-12-01' }),
      row({ lot_id: 1, expiration_date: '2026-10-01' }),
      row({ lot_id: 4, expiration_date: '2026-10-01' }),
    ]);
    expect(map.get(1)!.map(l => l.lot_id)).toEqual([1, 4, 2, 3]);
  });

  test('expiration_date como objeto Date (mysql2) también ordena bien', () => {
    const map = groupLotsByItem([
      row({ lot_id: 1, expiration_date: new Date('2026-12-01') }),
      row({ lot_id: 2, expiration_date: new Date('2026-10-01') }),
      row({ lot_id: 3, expiration_date: null }),
    ]);
    expect(map.get(1)!.map(l => l.lot_id)).toEqual([2, 1, 3]);
  });

  test('mismo lote dos veces en un ítem (dos cargas) suma la cantidad', () => {
    const map = groupLotsByItem([row({ lot_id: 7, quantity: '10.00' }), row({ lot_id: 7, quantity: '5.50' })]);
    expect(map.get(1)).toHaveLength(1);
    expect(map.get(1)![0]!.quantity).toBe(15.5);
  });

  test('sin filas -> mapa vacío', () => {
    expect(groupLotsByItem([]).size).toBe(0);
  });
});

describe('unlottedQty', () => {
  test('total menos lo cubierto por lotes', () => {
    expect(unlottedQty(75, [{ quantity: 30 }, { quantity: 25.5 }] as any)).toBe(19.5);
  });
  test('sin lotes, todo es stock general', () => {
    expect(unlottedQty(12, [])).toBe(12);
  });
  test('nunca negativo ni ruido de punto flotante', () => {
    expect(unlottedQty(0.3, [{ quantity: 0.1 }, { quantity: 0.2 }] as any)).toBe(0);
    expect(unlottedQty(10, [{ quantity: 12 }] as any)).toBe(0);
  });
});
