import { describe, expect, test } from 'bun:test';
import { checkQuantityForUnit, respondIfInvalidQuantities } from './quantityWarnings.ts';

describe('checkQuantityForUnit', () => {
  test.each(['Case', 'Unit', 'Bucket'])('%s con decimales -> FRACTIONAL_COUNT', (unit) => {
    const w = checkQuantityForUnit(2.5, unit);
    expect(w?.code).toBe('FRACTIONAL_COUNT');
    expect(w?.message).toContain(unit);
  });

  test.each(['Case', 'Unit', 'Bucket'])('%s con entero -> sin warning', (unit) => {
    expect(checkQuantityForUnit(3, unit)).toBeNull();
  });

  test.each([5, 30, 2.35])('Lbs con %p -> sin warning (enteros exactos son válidos)', (q) => {
    expect(checkQuantityForUnit(q, 'Lbs')).toBeNull();
  });

  test('unit vacío/null se trata como Lbs (nunca warning)', () => {
    expect(checkQuantityForUnit(10, null)).toBeNull();
    expect(checkQuantityForUnit(10.4, '')).toBeNull();
  });

  test('cantidad inválida o <= 0 no genera warning (otra validación la rechaza)', () => {
    expect(checkQuantityForUnit(0, 'Case')).toBeNull();
    expect(checkQuantityForUnit(NaN, 'Lbs')).toBeNull();
  });

  test('DECIMAL de mysql2 llega como string', () => {
    expect(checkQuantityForUnit('2.50' as any, 'Case')?.code).toBe('FRACTIONAL_COUNT');
  });
});

describe('respondIfInvalidQuantities', () => {
  const fakeRes = () => {
    const r: any = { code: 0, body: null };
    r.status = (c: number) => { r.code = c; return r; };
    r.json = (b: any) => { r.body = b; return r; };
    return r;
  };

  test('sin líneas inválidas no responde', () => {
    const res = fakeRes();
    expect(respondIfInvalidQuantities(res, [])).toBe(false);
    expect(res.code).toBe(0);
  });

  test('responde 400 con el mensaje listo para mostrar', () => {
    const res = fakeRes();
    const w = { ...checkQuantityForUnit(6.5, 'Case')!, product_id: 1, product_name: 'Chicharron 10#', barcode: null, unit: 'Case', quantity: 6.5 };
    expect(respondIfInvalidQuantities(res, [w])).toBe(true);
    expect(res.code).toBe(400);
    expect(res.body.error).toBe('Chicharron 10#: Este tipo de producto (Case) no puede ser 6.5 — solo admite cantidades enteras.');
  });
});
