import { Router } from 'express';
import {
  createPreOrder,
  listPreOrders,
  getPreOrder,
  updatePreOrder,
  deletePreOrder,
  convertPreOrder,
} from '../controllers/preOrderController.ts';
import { auth } from '../middleware/auth.ts';

const router = Router();

router.post('/',            auth, createPreOrder);
router.get('/',             auth, listPreOrders);
router.get('/:id',          auth, getPreOrder);
router.put('/:id',          auth, updatePreOrder);
router.delete('/:id',       auth, deletePreOrder);
router.post('/:id/convert', auth, convertPreOrder);

export default router;
