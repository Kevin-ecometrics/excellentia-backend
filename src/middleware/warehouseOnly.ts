import type { Request, Response, NextFunction } from 'express';

export function warehouseOnly(req: Request, res: Response, next: NextFunction): void {
  if (!['admin', 'almacenista'].includes(req.user?.role ?? '')) {
    res.status(403).json({ error: 'Acceso denegado: se requiere rol admin o almacenista' });
    return;
  }
  next();
}
