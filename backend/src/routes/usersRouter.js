import express from 'express';
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUserByRole,
    checkUsernameExists,
    resetPassword
} from '../controllers/usersController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Lấy tất cả users 
router.get('/', authenticateToken, authorize('admin'), getAllUsers);

// Lấy users theo role 
router.get('/role/:role', authenticateToken, authorize('admin'), getUserByRole);

// Kiểm tra username có tồn tại không 
router.get('/check-username/:username', checkUsernameExists);

// Đăng ký tài khoản bệnh nhân
router.post('/register', createUser);

// Đặt lại mật khẩu 
router.post('/reset-password', resetPassword);

// Lấy user theo ID 
router.get('/:id', authenticateToken, getUserById);

// Tạo user mới
router.post('/', authenticateToken, authorize('admin'), createUser);

// Cập nhật user 
router.put('/:id', authenticateToken, updateUser);

// Xóa user 
router.delete('/:id', authenticateToken, authorize('admin'), deleteUser);

export default router;