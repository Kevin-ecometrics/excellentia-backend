import { Router } from 'express';
import { registerDevice, listDevices, heartbeat } from '../controllers/deviceController.ts';
import { auth } from '../middleware/auth.ts';

const router = Router();

router.post('/register', auth, registerDevice);
router.get('/', auth, listDevices);
router.put('/:id/heartbeat', auth, heartbeat);

export default router;
