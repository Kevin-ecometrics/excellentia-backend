import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/index.ts';
import logger from '../services/logger.ts';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
