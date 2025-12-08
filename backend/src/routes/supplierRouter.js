import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import {
    getAllSuppliers,
    getActiveSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    searchSuppliers
} from '../controllers/supplierController.js';

const router = express.Router();

// Route tìm kiếm nhà cung cấp
router.get('/search', authenticateToken, authorizeRoles('admin', 'receptionist'), searchSuppliers);

// Route lấy nhà cung cấp đang hoạt động
router.get('/active', authenticateToken, authorizeRoles('admin', 'receptionist'), getActiveSuppliers);

// Route lấy danh sách tất cả nhà cung cấp
router.get('/', authenticateToken, authorizeRoles('admin', 'receptionist'), getAllSuppliers);

// Route lấy thông tin một nhà cung cấp
router.get('/:id', authenticateToken, authorizeRoles('admin', 'receptionist'), getSupplierById);

// Route tạo nhà cung cấp mới
router.post('/', authenticateToken, authorizeRoles('admin'), createSupplier);

// Route cập nhật nhà cung cấp
router.put('/:id', authenticateToken, authorizeRoles('admin'), updateSupplier);

// Route xóa nhà cung cấp
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deleteSupplier);

export default router;
