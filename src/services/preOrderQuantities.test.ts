import { describe, expect, test } from 'bun:test';
import { expandBoxItems, summarizePreOrderItems } from './preOrderQuantities.ts';

const row = (o: Record<string, any>) => ({
  barcode: 'MICH-01', product_name: 'Michoacano', quantity: '1.00', unit: 'Lbs', case_qty: null, ...o,
});

describe('summarizePreOrderItems', () => {
  test('Lbs: cuenta filas como cajas, no suma quantity', () => {
    const [line, ...rest] = summarizePreOrderItems([row({}), row({}), row({})]);
    expect(rest).toHaveLength(0);
    expect(line!.box_count).toBe(3);
    expect(line!.requested_qty).toBe(3);
    expect(line!.quantity).toBe(3); // 3 x 1.00 de relleno, castea string DECIMAL
  });

  test('Lbs con unit vacía (producto sin unit) también cuenta como cajas', () => {
    const [line] = summarizePreOrderItems([row({ unit: null }), row({ unit: null })]);
    expect(line!.box_count).toBe(2);
  });

  test('Case/Unit/Bucket: requested_qty es la suma de quantity y box_count null', () => {
    const [line] = summarizePreOrderItems([
      row({ barcode: 'GEL02', unit: 'Case', case_qty: 24, quantity: '3.00' }),
    ]);
    expect(line!.box_count).toBeNull();
    expect(line!.requested_qty).toBe(3);
  });

  test('Case sin cantidad todavía: requested_qty null', () => {
    const [line] = summarizePreOrderItems([row({ barcode: 'GEL02', unit: 'Case', quantity: null })]);
    expect(line!.requested_qty).toBeNull();
    expect(line!.quantity).toBeNull();
  });

  test('mezcla de productos: una línea por producto', () => {
    const lines = summarizePreOrderItems([
      row({}), row({}),
      row({ barcode: 'BKT-1', unit: 'Bucket', quantity: '2.00' }),
    ]);
    expect(lines.map(l => [l.barcode, l.requested_qty])).toEqual([['MICH-01', 2], ['BKT-1', 2]]);
  });
});

describe('expandBoxItems', () => {
  test('box_count N genera N filas sin el campo box_count', () => {
    const r = expandBoxItems([{ barcode: 'A', unit: 'Lbs', box_count: 3 }]);
    expect('items' in r && r.items).toEqual([
      { barcode: 'A', unit: 'Lbs' }, { barcode: 'A', unit: 'Lbs' }, { barcode: 'A', unit: 'Lbs' },
    ]);
  });

  test('sin box_count el ítem pasa igual', () => {
    const r = expandBoxItems([{ barcode: 'B', quantity: 2 }]);
    expect('items' in r && r.items).toEqual([{ barcode: 'B', quantity: 2 }]);
  });

  test('rechaza 0, negativos, decimales y exceso', () => {
    for (const bad of [0, -1, 1.5, 'x', 201]) {
      expect('error' in expandBoxItems([{ box_count: bad }])).toBe(true);
    }
  });
});
