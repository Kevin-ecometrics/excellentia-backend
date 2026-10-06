import { describe, expect, test } from 'bun:test';
import { parseSalesDays, consignmentRemaining, DEFAULT_SALES_DAYS } from './customerInventory.ts';

describe('parseSalesDays', () => {
  test('sin valor o vacío usa el default de 30 días', () => {
    expect(parseSalesDays(undefined)).toBe(DEFAULT_SALES_DAYS);
    expect(parseSalesDays('')).toBe(DEFAULT_SALES_DAYS);
    expect(DEFAULT_SALES_DAYS).toBe(30);
  });
  test('"all" (cualquier mayúscula) quita el filtro', () => {
    expect(parseSalesDays('all')).toBeNull();
    expect(parseSalesDays('ALL')).toBeNull();
  });
  test('un entero positivo es el rango pedido', () => {
    expect(parseSalesDays('7')).toBe(7);
    expect(parseSalesDays('90')).toBe(90);
  });
  test('valores inválidos caen al default, no a "todo"', () => {
    expect(parseSalesDays('0')).toBe(30);
    expect(parseSalesDays('-5')).toBe(30);
    expect(parseSalesDays('abc')).toBe(30);
    expect(parseSalesDays('2.5')).toBe(30);
    expect(parseSalesDays(['30'])).toBe(30);
  });
  test('un rango enorme se acota', () => {
    expect(parseSalesDays('999999')).toBe(3650);
  });
});

describe('consignmentRemaining', () => {
  test('dejado − vendido − devuelto', () => {
    expect(consignmentRemaining(10, 3, 2)).toBe(5);
  });
  test('acepta strings DECIMAL de mysql2', () => {
    expect(consignmentRemaining('10.50', '3.25', '0.00')).toBe(7.25);
  });
  test('nunca negativo', () => {
    expect(consignmentRemaining(5, 4, 3)).toBe(0);
  });
  test('valores nulos cuentan como 0', () => {
    expect(consignmentRemaining(null, null, null)).toBe(0);
    expect(consignmentRemaining(4, null, undefined)).toBe(4);
  });
  test('sin ruido de punto flotante', () => {
    expect(consignmentRemaining(0.3, 0.1, 0.1)).toBe(0.1);
  });
});
