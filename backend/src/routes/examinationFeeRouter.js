import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import {
    getAllExaminationFees,
    getActiveExaminationFees,
    getExaminationFeeById,
    createExaminationFee,
    updateExaminationFee,
    deleteExaminationFee,
    deactivateExaminationFee,
    reactivateExaminationFee,
    searchExaminationFees
} from '../controllers/examinationFeeController.js';

const router = express.Router();

// Route tìm kiếm dịch vụ khám
router.get('/search', authenticateToken, searchExaminationFees);

// Route lấy giá khám đang hoạt động
router.get('/active', authenticateToken, getActiveExaminationFees);

// Route lấy danh sách tất cả giá khám
router.get('/', authenticateToken, authorizeRoles('admin', 'receptionist', 'patient'), getAllExaminationFees);

// Route lấy thông tin một giá khám
router.get('/:id', authenticateToken, authorizeRoles('admin', 'receptionist', 'patient'), getExaminationFeeById);

// Route tạo giá khám mới
router.post('/', authenticateToken, authorizeRoles('admin'), createExaminationFee);

// Route cập nhật giá khám
router.put('/:id', authenticateToken, authorizeRoles('admin'), updateExaminationFee);

// Route vô hiệu hóa dịch vụ khám
router.put('/:id/deactivate', authenticateToken, authorizeRoles('admin'), deactivateExaminationFee);

// Route kích hoạt lại dịch vụ khám
router.put('/:id/reactivate', authenticateToken, authorizeRoles('admin'), reactivateExaminationFee);

// Route xóa giá khám
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deleteExaminationFee);

export default router;
