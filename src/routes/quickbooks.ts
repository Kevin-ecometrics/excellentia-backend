import { Router } from 'express';
import { qbStatus, qbAuth, qbCallback, qbDisconnect, syncProducts, listQbClasses } from '../controllers/qbController.ts';
import { auth } from '../middleware/auth.ts';
import { adminOnly } from '../middleware/adminOnly.ts';

const router = Router();

router.get('/status', auth, adminOnly, qbStatus);
router.get('/classes', auth, adminOnly, listQbClasses);
router.get('/auth', qbAuth);
router.get('/callback', qbCallback);
router.get('/disconnect', qbDisconnect);
router.post('/sync-products', auth, adminOnly, syncProducts);

export default router;
