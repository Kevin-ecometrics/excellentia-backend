import { Router } from 'express';
import { getStats } from '../controllers/statsController.ts';
import { auth } from '../middleware/auth.ts';

const router = Router();

router.get('/', auth, getStats);

export default router;
