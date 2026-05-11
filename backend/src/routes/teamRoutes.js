import express from 'express';
import { getTeam, createAdmin, createStaff, updateMember, deleteMember } from '../controllers/teamController.js';
import { authenticateUser, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/read',           requireRole(['admin', 'super_admin']), getTeam);
router.post('/create-admin',  requireRole(['admin', 'super_admin']), createAdmin);
router.post('/create-staff',  requireRole(['admin', 'super_admin']), createStaff);
router.post('/update-member', requireRole(['admin', 'super_admin']), updateMember);
router.post('/delete-member', requireRole(['admin', 'super_admin']), deleteMember);

export default router;