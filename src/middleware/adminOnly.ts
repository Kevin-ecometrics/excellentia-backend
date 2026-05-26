import type { Request, Response, NextFunction } from 'express';

export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Acceso denegado: se requiere rol admin' });
    return;
  }
  next();
}
