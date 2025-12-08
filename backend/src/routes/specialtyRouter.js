import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import {
    getAllSpecialties,
    getActiveSpecialties,
    getSpecialtyById,
    createSpecialty,
    updateSpecialty,
    deleteSpecialty,
    deactivateSpecialty,
    reactivateSpecialty,
    searchSpecialties
} from '../controllers/specialtyController.js';

const router = express.Router();

// Route tìm kiếm chuyên khoa
router.get('/search', authenticateToken, searchSpecialties);

// Route lấy chuyên khoa đang hoạt động
router.get('/active', authenticateToken, getActiveSpecialties);

// Route lấy danh sách tất cả chuyên khoa
router.get('/', authenticateToken, getAllSpecialties);

// Route lấy thông tin một chuyên khoa
router.get('/:id', authenticateToken, getSpecialtyById);

// Route tạo chuyên khoa mới
router.post('/', authenticateToken, authorizeRoles('admin'), createSpecialty);

// Route cập nhật chuyên khoa
router.put('/:id', authenticateToken, authorizeRoles('admin'), updateSpecialty);

// Route vô hiệu hóa chuyên khoa
router.put('/:id/deactivate', authenticateToken, authorizeRoles('admin'), deactivateSpecialty);

// Route kích hoạt lại chuyên khoa
router.put('/:id/reactivate', authenticateToken, authorizeRoles('admin'), reactivateSpecialty);

// Route xóa chuyên khoa
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deleteSpecialty);

export default router;
