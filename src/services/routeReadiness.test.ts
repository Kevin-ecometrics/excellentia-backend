import { describe, expect, test } from 'bun:test';
import { startBlockReason, readyBlockReason, reopenBlockReason, editLockedReason } from './routeReadiness.ts';

const NOW = new Date('2026-10-01T10:00:00Z');

describe('startBlockReason', () => {
  test('bloquea PLANNED -> IN_PROGRESS sin ready_at', () => {
    expect(startBlockReason('PLANNED', 'IN_PROGRESS', null)).toContain('no marcó la ruta como terminada');
  });
  test('permite PLANNED -> IN_PROGRESS con ready_at (string o Date)', () => {
    expect(startBlockReason('PLANNED', 'IN_PROGRESS', NOW)).toBeNull();
    expect(startBlockReason('PLANNED', 'IN_PROGRESS', '2026-10-01 10:00:00')).toBeNull();
  });
  test('no afecta otras transiciones ni IN_PROGRESS -> IN_PROGRESS', () => {
    expect(startBlockReason('PLANNED', 'CANCELLED', null)).toBeNull();
    expect(startBlockReason('IN_PROGRESS', 'COMPLETED', null)).toBeNull();
    expect(startBlockReason('IN_PROGRESS', 'IN_PROGRESS', null)).toBeNull();
  });
});

describe('readyBlockReason', () => {
  const ok = { status: 'PLANNED', ready_at: null, returns_reviewed_at: null };
  test('ok con ruta PLANNED y al menos un producto', () => {
    expect(readyBlockReason(ok, 1)).toBeNull();
  });
  test('rechaza sin productos cargados', () => {
    expect(readyBlockReason(ok, 0)).toContain('al menos un producto');
  });
  test('rechaza si no está PLANNED', () => {
    expect(readyBlockReason({ ...ok, status: 'IN_PROGRESS' }, 3)).toContain('PLANNED');
    expect(readyBlockReason({ ...ok, status: 'CANCELLED' }, 3)).not.toBeNull();
  });
  test('rechaza si ya está lista o con devoluciones revisadas', () => {
    expect(readyBlockReason({ ...ok, ready_at: NOW }, 3)).toContain('ya está marcada');
    expect(readyBlockReason({ ...ok, returns_reviewed_at: NOW }, 3)).not.toBeNull();
  });
});

describe('reopenBlockReason', () => {
  test('ok con PLANNED y ready_at', () => {
    expect(reopenBlockReason({ status: 'PLANNED', ready_at: NOW })).toBeNull();
  });
  test('rechaza si ya salió a reparto', () => {
    expect(reopenBlockReason({ status: 'IN_PROGRESS', ready_at: NOW })).toContain('ya salió');
  });
  test('rechaza si no estaba lista', () => {
    expect(reopenBlockReason({ status: 'PLANNED', ready_at: null })).toContain('no está marcada');
  });
});

describe('editLockedReason', () => {
  test('bloquea edición solo con PLANNED + ready_at', () => {
    expect(editLockedReason('PLANNED', NOW)).toContain('Reabrí la carga');
    expect(editLockedReason('PLANNED', null)).toBeNull();
  });
  test('no bloquea una ruta ya en reparto (comportamiento previo)', () => {
    expect(editLockedReason('IN_PROGRESS', NOW)).toBeNull();
  });
});
