import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwtService.ts';
import type { User } from '../types/index.ts';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function auth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }
  const token = header.slice(7);
  try {
    const decoded = verifyToken(token);
    req.user = decoded as User;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
