// "Ruta terminada" (2026-10-01) — el almacén marca la ruta como lista
// (routes.ready_at) cuando termina de cargar el camión; hasta entonces el
// operador no puede pasarla a IN_PROGRESS. Reglas puras (sin DB) para poder
// testearlas; cada función devuelve el mensaje de error o null si todo bien.

type RouteTimestamp = Date | string | null | undefined;

export function startBlockReason(current: string, next: string, readyAt: RouteTimestamp): string | null {
  if (next !== 'IN_PROGRESS' || current === 'IN_PROGRESS') return null;
  if (current === 'PLANNED' && !readyAt) {
    return 'El almacén todavía no marcó la ruta como terminada: no se puede iniciar';
  }
  return null;
}

export function readyBlockReason(
  route: { status: string; ready_at: RouteTimestamp; returns_reviewed_at: RouteTimestamp },
  itemCount: number
): string | null {
  if (route.status !== 'PLANNED') return `Solo se puede marcar como terminada una ruta PLANNED (estado actual: ${route.status})`;
  if (route.returns_reviewed_at) return 'Devoluciones ya revisadas: no se puede modificar esta ruta';
  if (route.ready_at) return 'La ruta ya está marcada como terminada';
  if (itemCount < 1) return 'Cargá al menos un producto antes de marcar la ruta como terminada';
  return null;
}

export function reopenBlockReason(route: { status: string; ready_at: RouteTimestamp }): string | null {
  if (route.status === 'IN_PROGRESS') return 'La ruta ya salió a reparto: no se puede reabrir la carga';
  if (route.status !== 'PLANNED') return `No se puede reabrir una ruta ${route.status}`;
  if (!route.ready_at) return 'La ruta no está marcada como terminada';
  return null;
}

// Con la ruta lista y todavía sin salir, la carga/paradas quedan congeladas
// hasta reabrir. En IN_PROGRESS NO se bloquea: ahí ready_at siempre existe y
// el comportamiento previo (cargar/editar con la ruta en reparto) no cambia.
export function editLockedReason(status: string, readyAt: RouteTimestamp): string | null {
  if (status === 'PLANNED' && readyAt) {
    return 'La ruta está marcada como terminada: Reabrí la carga para modificarla';
  }
  return null;
}
