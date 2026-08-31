import { Router } from 'express';
import {
  listWarehouses,
  createReceipt,
  listLots,
  suggestLots,
  setLotCondition,
  listMovements,
  listSettlements,
  getSettlement,
  previewSettlement,
  confirmSettlement,
} from '../controllers/warehouseController.ts';
import { auth } from '../middleware/auth.ts';
import { warehouseOnly } from '../middleware/warehouseOnly.ts';

const router = Router();

router.get('/warehouses',                auth,               listWarehouses);
router.post('/receipts',                 auth, warehouseOnly, createReceipt);
router.get('/lots',                      auth, warehouseOnly, listLots);
router.get('/lots/suggest',              auth, warehouseOnly, suggestLots);
router.post('/lots/:id/condition',       auth, warehouseOnly, setLotCondition);
router.get('/movements',                 auth, warehouseOnly, listMovements);
router.get('/settlements',               auth, warehouseOnly, listSettlements);
router.get('/settlements/:id',           auth, warehouseOnly, getSettlement);
router.post('/settlements/preview',      auth, warehouseOnly, previewSettlement);
router.post('/settlements/:id/confirm',  auth, warehouseOnly, confirmSettlement);

export default router;
