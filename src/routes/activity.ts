import { Router } from 'express';
import { listActivity } from '../controllers/activityController.ts';
import { auth } from '../middleware/auth.ts';
import { adminOnly } from '../middleware/adminOnly.ts';

const router = Router();

router.get('/', auth, adminOnly, listActivity);

export default router;
