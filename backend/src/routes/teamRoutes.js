import express from 'express';
import { getTeam } from '../controllers/teamController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authenticateUser);
router.get('/read', getTeam);

export default router;
