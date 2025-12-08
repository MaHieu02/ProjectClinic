import express from 'express';
import {
    createReceptionist,
    getReceptionists,
    getReceptionistById,
    getReceptionistByUserId,
    updateReceptionist,
    deleteReceptionist,
    reactivateReceptionist
} from '../controllers/receptionistController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Lấy tất cả lễ tân 
router.get('/', authenticateToken, authorize('admin'), getReceptionists);

// Lấy lễ tân theo ID
router.get('/:id', authenticateToken, authorize('admin'), getReceptionistById);

// Lấy lễ tân theo user ID
router.get('/user/:userId', authenticateToken, authorize('admin'), getReceptionistByUserId);

// Tạo lễ tân mới
router.post('/', authenticateToken, authorize('admin'), createReceptionist);

// Cập nhật lễ tân
router.put('/:id', authenticateToken, authorize('admin'), updateReceptionist);

// Xóa lễ tân
router.delete('/:id', authenticateToken, authorize('admin'), deleteReceptionist);

// Kích hoạt lại lễ tân
router.put('/:id/reactivate', authenticateToken, authorize('admin'), reactivateReceptionist);

export default router;