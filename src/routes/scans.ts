import { Router } from 'express';
import { createScan, listScans } from '../controllers/scanController.ts';
import { auth } from '../middleware/auth.ts';

const router = Router();

router.post('/', auth, createScan);
router.get('/', auth, listScans);

export default router;
