import express from 'express';
import {
    createAdmin,
    getAdmins,
    getAdminById,
    updateAdmin,
    deleteAdmin
} from '../controllers/adminController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Lấy tất cả admin 
router.get('/', authenticateToken, authorize('admin'), getAdmins);

// Lấy admin theo ID
router.get('/:id', authenticateToken, authorize('admin'), getAdminById);

// Tạo admin mới
router.post('/', authenticateToken, authorize('admin'), createAdmin);

// Cập nhật admin
router.put('/:id', authenticateToken, authorize('admin'), updateAdmin);

// Xóa admin
router.delete('/:id', authenticateToken, authorize('admin'), deleteAdmin);

export default router;
