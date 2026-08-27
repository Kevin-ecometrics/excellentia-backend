import { Router } from 'express';
import {
  createRoute,
  listRoutes,
  getRoute,
  updateRoute,
  deleteRoute,
  addStop,
  reorderStops,
  removeStop,
  listAvailable,
} from '../controllers/routeController.ts';
import { auth } from '../middleware/auth.ts';
import { warehouseOnly } from '../middleware/warehouseOnly.ts';

const router = Router();

router.get('/available',              auth, warehouseOnly, listAvailable);
router.post('/',                      auth, warehouseOnly, createRoute);
router.get('/',                       auth, warehouseOnly, listRoutes);
router.get('/:id',                    auth, warehouseOnly, getRoute);
router.put('/:id',                    auth, warehouseOnly, updateRoute);
router.delete('/:id',                 auth, warehouseOnly, deleteRoute);
router.post('/:id/stops',             auth, warehouseOnly, addStop);
router.put('/:id/stops/reorder',      auth, warehouseOnly, reorderStops);
router.delete('/:id/stops/:stopId',   auth, warehouseOnly, removeStop);

export default router;
