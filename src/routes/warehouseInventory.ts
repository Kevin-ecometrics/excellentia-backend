import { Router } from 'express';
import {
  listWarehouses,
  createReceipt,
  listLots,
  suggestLots,
  listAvailableProducts,
  backfillLots,
  setLotCondition,
  updateLot,
  listMovements,
} from '../controllers/warehouseController.ts';
import { auth } from '../middleware/auth.ts';
import { warehouseOnly } from '../middleware/warehouseOnly.ts';
import { adminOnly } from '../middleware/adminOnly.ts';

const router = Router();

router.get('/warehouses',                auth,               listWarehouses);
router.post('/receipts',                 auth, warehouseOnly, createReceipt);
router.get('/lots',                      auth, warehouseOnly, listLots);
router.get('/lots/suggest',              auth, warehouseOnly, suggestLots);
router.get('/lots/available-products',   auth, warehouseOnly, listAvailableProducts);
// Backfill de apertura: convierte stock pre-existente (sin lote) en lotes
// reales, para que el FIFO de rutas lo pueda usar — adminOnly, es una
// operación de una sola vez sobre datos históricos, no una tarea diaria del
// almacenista.
router.post('/lots/backfill',            auth, adminOnly,     backfillLots);
router.post('/lots/:id/condition',       auth, warehouseOnly, setLotCondition);
router.put('/lots/:id',                  auth, warehouseOnly, updateLot);
router.get('/movements',                 auth, warehouseOnly, listMovements);

export default router;
