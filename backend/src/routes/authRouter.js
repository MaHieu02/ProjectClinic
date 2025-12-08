import express from 'express';
import {
    loginUser,
    getCurrentUser,
    logoutUser,
    changePassword
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Đăng nhập 
router.post('/login', loginUser);

// Lấy thông tin user hiện tại 
router.get('/me', authenticateToken, getCurrentUser);

// Đăng xuất 
router.post('/logout', authenticateToken, logoutUser);

// Thay đổi mật khẩu 
router.put('/change-password', authenticateToken, changePassword);

export default router;