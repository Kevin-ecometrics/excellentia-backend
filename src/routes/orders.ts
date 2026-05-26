import { Router } from 'express';
import { createOrder, listOrders, getOrder, updateOrderStatus, forceSync, createBatch, exportCsv, getBatchDamage } from '../controllers/orderController.ts';
import { auth } from '../middleware/auth.ts';
import { adminOnly } from '../middleware/adminOnly.ts';

const router = Router();

router.post('/', auth, createOrder);
router.post('/batch', auth, createBatch);
router.get('/export', auth, exportCsv);
router.get('/damage/:batchId', auth, getBatchDamage);
router.get('/', auth, listOrders);
router.get('/:id', auth, getOrder);
router.put('/:id/status', auth, adminOnly, updateOrderStatus);
router.post('/:id/sync', auth, adminOnly, forceSync);

export default router;
