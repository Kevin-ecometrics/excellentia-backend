import { Router } from 'express';
import {
  listWarehouses,
  createReceipt,
  listLots,
  suggestLots,
  listAvailableProducts,
  setLotCondition,
  updateLot,
  listMovements,
  listSettlements,
  getSettlement,
  previewSettlement,
  confirmSettlement,
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
router.post('/lots/:id/condition',       auth, warehouseOnly, setLotCondition);
router.put('/lots/:id',                  auth, warehouseOnly, updateLot);
router.get('/movements',                 auth, warehouseOnly, listMovements);
// Liquidación diaria: a pedido del usuario, es tarea exclusiva del admin
// desde la webapp — el almacenista ya no la ve ni en Android ni acá.
router.get('/settlements',               auth, adminOnly,     listSettlements);
router.get('/settlements/:id',           auth, adminOnly,     getSettlement);
router.post('/settlements/preview',      auth, adminOnly,     previewSettlement);
router.post('/settlements/:id/confirm',  auth, adminOnly,     confirmSettlement);

export default router;
