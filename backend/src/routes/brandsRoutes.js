import express from 'express';
import {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  getRiskSignals
} from '../controllers/brandsController.js';
import { authenticateUser, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/read', getBrands);
router.get('/risk-signals', getRiskSignals);
router.post('/create', requireRole(['admin', 'super_admin']), createBrand);
router.put('/update/:id', requireRole(['admin', 'super_admin']), updateBrand);
router.delete('/delete/:id', requireRole(['super_admin']), deleteBrand);

export default router;