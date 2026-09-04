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
  updateStopStatus,
  addRouteItem,
  removeRouteItem,
  listAvailable,
  getExpectedReturns,
  createReturns,
  listReturns,
  registerConsignment,
  getConsignment,
  settleConsignment,
} from '../controllers/routeController.ts';
import { auth } from '../middleware/auth.ts';
import { warehouseOnly } from '../middleware/warehouseOnly.ts';

const router = Router();

// listRoutes/getRoute/updateStopStatus/updateRoute(status) también los usa el
// repartidor (operator) para sus propias rutas — el filtro/chequeo de
// ownership vive dentro de cada controller, no acá (warehouseOnly seguiría
// bloqueando a operator de raíz). El resto (crear/armar/cancelar rutas,
// cargar productos) sigue exclusivo de admin/almacenista.
router.get('/available',              auth, warehouseOnly, listAvailable);
router.post('/',                      auth, warehouseOnly, createRoute);
router.get('/',                       auth, listRoutes);
router.get('/:id',                    auth, getRoute);
router.put('/:id',                    auth, updateRoute);
router.delete('/:id',                 auth, warehouseOnly, deleteRoute);
router.post('/:id/stops',             auth, warehouseOnly, addStop);
router.put('/:id/stops/reorder',      auth, warehouseOnly, reorderStops);
router.delete('/:id/stops/:stopId',   auth, warehouseOnly, removeStop);
router.put('/:id/stops/:stopId/status', auth, updateStopStatus);
router.post('/:id/items',             auth, warehouseOnly, addRouteItem);
router.delete('/:id/items/:itemId',   auth, warehouseOnly, removeRouteItem);
router.get('/:id/returns/expected',   auth, getExpectedReturns);
router.post('/:id/returns',           auth, warehouseOnly, createReturns);
router.get('/:id/returns',            auth, listReturns);
// Sin warehouseOnly: registrar/liquidar consignación es acción de campo del
// operator (repartidor) dueño de la ruta, no del almacenista — mismo
// criterio que updateStopStatus. El ownership (operator solo su propia
// ruta) se resuelve dentro de cada controller.
router.post('/:id/stops/:stopId/consignment',        auth, registerConsignment);
router.get('/:id/stops/:stopId/consignment',         auth, getConsignment);
router.post('/:id/stops/:stopId/consignment/settle', auth, settleConsignment);

export default router;
