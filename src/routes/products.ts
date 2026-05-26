import { Router } from 'express';
import { listProducts, getProductByBarcode, getProductPriceHistory, createProduct, updateProduct, deleteProduct } from '../controllers/productController.ts';
import { auth } from '../middleware/auth.ts';
import { adminOnly } from '../middleware/adminOnly.ts';

const router = Router();

router.get('/', auth, listProducts);
router.get('/:barcode/history', auth, getProductPriceHistory);
router.get('/:barcode', auth, getProductByBarcode);
router.post('/', auth, adminOnly, createProduct);
router.put('/:id', auth, adminOnly, updateProduct);
router.delete('/:id', auth, adminOnly, deleteProduct);

export default router;
