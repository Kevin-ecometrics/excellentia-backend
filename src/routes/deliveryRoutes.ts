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
  createDayStop,
  copyDayStops,
  listDayStops,
  deleteDayStop,
  getExpectedStopItems,
} from '../controllers/routeController.ts';
import { auth } from '../middleware/auth.ts';
import { warehouseOnly } from '../middleware/warehouseOnly.ts';
import { adminOnly } from '../middleware/adminOnly.ts';

const router = Router();

// listRoutes/getRoute/updateStopStatus/updateRoute(status) también los usa el
// repartidor (operator) para sus propias rutas — el filtro/chequeo de
// ownership vive dentro de cada controller, no acá (warehouseOnly seguiría
// bloqueando a operator de raíz). El resto (crear/armar/cancelar rutas,
// cargar productos) sigue exclusivo de admin/almacenista.
//
// route_day_stops (2026-09-18) — el admin arma en el dashboard, por día, la
// lista de clientes/pedidos/pre-órdenes a visitar (antes de que exista
// ninguna ruta/camión — puede haber varios camiones el mismo día). Rutas
// registradas ANTES de "/:id" para que Express no confunda "day-stops" con
// un :id. addStop vuelve a ser warehouseOnly (el almacenista sigue armando
// la ruta exactamente igual que antes — nombre, repartidor, paradas, orden,
// carga del camión) pero el controller ahora exige que el cliente/pedido
// que intenta agregar ya esté en route_day_stops sin tomar, así que en la
// práctica ya no puede elegir libremente a quién visita, solo a quién
// asigna en qué camión y en qué orden.
router.get('/day-stops',              auth, warehouseOnly, listDayStops);
router.post('/day-stops',             auth, adminOnly, createDayStop);
router.post('/day-stops/copy',        auth, adminOnly, copyDayStops);
router.delete('/day-stops/:dayStopId', auth, adminOnly, deleteDayStop);
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
router.get('/:id/stops/:stopId/expected-items', auth, warehouseOnly, getExpectedStopItems);
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
