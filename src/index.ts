import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { makeQboApiCall, loadTokensFromDb, loadTokensFromEnv } from './services/qbAuth.ts';
import { startSyncEngine } from './services/syncEngine.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import logger from './services/logger.ts';

import authRoutes from './routes/auth.ts';
import productRoutes from './routes/products.ts';
import scanRoutes from './routes/scans.ts';
import orderRoutes from './routes/orders.ts';
import deviceRoutes from './routes/devices.ts';
import qbRoutes from './routes/quickbooks.ts';
import userRoutes from './routes/users.ts';
import statsRoutes from './routes/stats.ts';
import customerRoutes from './routes/customers.ts';
import activityRoutes from './routes/activity.ts';
import settingsRoutes from './routes/settings.ts';
import setupRoutes from './routes/setup.ts';
import preOrderRoutes from './routes/preOrders.ts';
import { auth } from './middleware/auth.ts';

const startErrors: string[] = [];

const REQUIRED_ENV = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    const msg = `Variable de entorno requerida no definida: ${key}`;
    console.error(`[FATAL] ${msg}`);
    startErrors.push(msg);
  }
}

const app = express();
const port = parseInt(process.env.PORT ?? '3000');

app.use(helmet());

const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(cors(allowedOrigin
  ? { origin: allowedOrigin, credentials: true }
  : { credentials: true }
));
app.use(express.json({ limit: '10mb' }));

// Cache-Control en todas las rutas API con datos sensibles
app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Diagnostic endpoint
app.get('/api/startup-status', (_req: Request, res: Response) => {
  res.json({
    alive: true,
    node: process.version,
    env: process.env.NODE_ENV,
    cwd: process.cwd(),
    errors: startErrors,
    loaded: {
      jwt: !!process.env.JWT_SECRET,
      refresh: !!process.env.JWT_REFRESH_SECRET,
      dbHost: !!process.env.DB_HOST,
      dbUser: !!process.env.DB_USER,
      dbName: !!process.env.DB_NAME,
    },
  });
});

// Legacy QBO endpoints (v0)
app.get('/api/company', async (_req: Request, res: Response) => {
  try {
    const data = await makeQboApiCall(`/v3/company/${process.env.REALM_ID ?? ''}/companyinfo/${process.env.REALM_ID ?? ''}`);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    res.status(500).json({ error: message });
  }
});

// /api/customers manejado por customerRoutes con cache MySQL


app.get('/api/accounts', async (_req: Request, res: Response) => {
  try {
    const data = await makeQboApiCall(`/v3/company/${process.env.REALM_ID ?? ''}/query?query=select * from Account`);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    res.status(500).json({ error: message });
  }
});

app.get('/api/items', async (_req: Request, res: Response) => {
  try {
    const data = await makeQboApiCall(`/v3/company/${process.env.REALM_ID ?? ''}/query?query=select * from Item`);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    res.status(500).json({ error: message });
  }
});

// REST API (Fase 1)
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/qb', qbRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/preorders', preOrderRoutes);

// Strip trailing slashes for frontend routes
app.use((req, res, next) => {
  if (req.path.length > 1 && req.path.endsWith('/')) {
    const query = req.url.slice(req.path.length)
    res.redirect(301, req.path.slice(0, -1) + query)
    return
  }
  next()
})

// Frontend estático (Next.js export)
const webappDir = process.env.WEBAPP_DIR
  ? path.resolve(process.env.WEBAPP_DIR)
  : path.resolve('../excellentia-webapp/out');

if (fs.existsSync(webappDir)) {
  app.use(express.static(webappDir, { extensions: ['html'] }));
  logger.info(`Sirviendo frontend desde: ${webappDir}`);
} else {
  logger.warn(`Directorio frontend no encontrado: ${webappDir}`);
}

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  const tokensLoaded = await loadTokensFromDb();
  if (tokensLoaded) {
    logger.info('Tokens QBO cargados desde MySQL');
  } else {
    const envLoaded = loadTokensFromEnv();
    if (envLoaded) {
      logger.info('Tokens QBO cargados desde .env');
    } else {
      logger.warn('No hay tokens QBO disponibles. Visita /api/qb/auth para autenticar.');
    }
  }

  app.listen(port, () => {
    logger.info(`Servidor corriendo en http://localhost:${port}`);
    logger.info(`Entorno: ${process.env.ENVIRONMENT}`);
    startSyncEngine();
    logger.info('Sync engine iniciado (intervalo: 5 min)');
  });
}

start().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  logger.error('Error al iniciar servidor (no fatal):', msg);
  startErrors.push(`start(): ${msg}`);
});
