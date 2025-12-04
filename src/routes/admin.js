import express from 'express';
import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/admin.js';
import {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  getAllLogs
} from '../controllers/adminController.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.put('/users/:userId/status', updateUserStatus);
router.get('/logs', getAllLogs);

export default router;