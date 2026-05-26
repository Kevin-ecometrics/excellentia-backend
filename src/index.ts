import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
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

const app = express();
const port = parseInt(process.env.PORT ?? '3000');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Legacy QBO endpoints (v0)
app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', environment: process.env.ENVIRONMENT, realmId: process.env.REALM_ID });
});

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
  logger.error('Error al iniciar servidor:', err);
  process.exit(1);
});
