import express from 'express';
import { login, signup, getMe } from '../controllers/authController.js';
import { authenticateUser } from '../middleware/authMiddleware.js'; 

const router = express.Router();

router.post('/login', login);
router.post('/signup', signup);
router.get('/profile', authenticateUser, getMe);

export default router;
