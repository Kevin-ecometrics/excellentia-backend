import { Router } from 'express';
import { listProducts, listCategories, getProductByBarcode, getProductPriceHistory, createProduct, updateProduct, updateProductBarcode, deleteProduct, migrateSkuNomenclature } from '../controllers/productController.ts';
import { auth } from '../middleware/auth.ts';
import { adminOnly } from '../middleware/adminOnly.ts';
import { warehouseOnly } from '../middleware/warehouseOnly.ts';

const router = Router();

router.get('/', auth, listProducts);
router.get('/categories', auth, listCategories);
router.post('/migrate-sku', auth, adminOnly, migrateSkuNomenclature);
router.get('/:barcode/history', auth, getProductPriceHistory);
router.get('/:barcode', auth, getProductByBarcode);
router.post('/', auth, adminOnly, createProduct);
router.put('/:id', auth, adminOnly, updateProduct);
// Backlog cliente (2026-09-28) — almacenista puede editar SOLO barcode,
// sin abrirle el resto de updateProduct (precio/stock/sku, adminOnly).
router.patch('/:id/barcode', auth, warehouseOnly, updateProductBarcode);
router.delete('/:id', auth, adminOnly, deleteProduct);

export default router;
