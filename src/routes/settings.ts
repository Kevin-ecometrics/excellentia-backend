import { Router } from 'express';
import { getSettings, updateSettings, updateInvoiceCounter } from '../controllers/settingsController.ts';
import { auth } from '../middleware/auth.ts';
import { adminOnly } from '../middleware/adminOnly.ts';

const router = Router();

router.get('/', auth, getSettings);
router.put('/', auth, adminOnly, updateSettings);
router.put('/invoice-counter', auth, adminOnly, updateInvoiceCounter);

export default router;
