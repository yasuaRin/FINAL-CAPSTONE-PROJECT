import express from 'express';
import { getLeads, convertLead } from '../controllers/leadsController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/read', getLeads);
router.post('/convert', convertLead);

export default router;