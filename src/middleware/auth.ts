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

function extractToken(req: Request): string | null {
  // 1. HttpOnly cookie — webapp (same-domain)
  const cookieHeader = req.headers.cookie ?? '';
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)jwt=([^;]+)/);
  if (cookieMatch) return decodeURIComponent(cookieMatch[1]);

  // 2. Bearer header — Android app
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  return null;
}

export function auth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }
  try {
    const decoded = verifyToken(token);
    req.user = decoded as User;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
