import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { getRevenueDetailReport } from '../controllers/reportController.js';

const router = express.Router();

// Route lấy báo cáo doanh thu chi tiết
router.get('/revenue-detail', authenticateToken, authorize('admin'), getRevenueDetailReport);

export default router;
