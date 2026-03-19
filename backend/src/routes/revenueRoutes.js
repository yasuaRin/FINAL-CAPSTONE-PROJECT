import express from 'express';
import {
  getRevenue,
  createRevenue,
  updateRevenue,
  deleteRevenue,
  uploadRevenue,
  getIngestionLogs
} from '../controllers/revenueController.js';
import { authenticateUser, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/read', getRevenue);
router.post('/create', requireRole(['admin', 'super_admin']), createRevenue);
router.put('/update/:id', requireRole(['admin', 'super_admin']), updateRevenue);
router.delete('/delete/:id', requireRole(['super_admin']), deleteRevenue);
router.post('/upload', requireRole(['admin', 'super_admin']), uploadRevenue);
router.get('/ingestion-logs', requireRole(['admin', 'super_admin']), getIngestionLogs);

export default router;