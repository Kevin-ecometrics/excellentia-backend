import { Router } from 'express';
import { listUsers, listSalespersons, updateUser, deleteUser } from '../controllers/userController.ts';
import { auth } from '../middleware/auth.ts';
import { adminOnly } from '../middleware/adminOnly.ts';

const router = Router();

router.get('/', auth, adminOnly, listUsers);
router.get('/salespersons', auth, listSalespersons);
router.put('/:id', auth, adminOnly, updateUser);
router.delete('/:id', auth, adminOnly, deleteUser);

export default router;
