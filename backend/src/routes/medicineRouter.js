import express from 'express';
import {
    createMedicine,
    getMedicines,
    getMedicineById,
    updateMedicine,
    deleteMedicine,
    updateStock,
    getLowStockMedicines,
    searchMedicines,
    getMedicineStats,
    getMedicinesBySupplier,
    updateExpiredMedicines
} from '../controllers/medicineController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Lấy tất cả thuốc
router.get('/', authenticateToken, authorize('admin', 'doctor', 'receptionist'), getMedicines);

// Tìm kiếm thuốc
router.get('/search', authenticateToken, authorize('admin', 'doctor', 'receptionist'), searchMedicines);

// Lấy thuốc sắp hết
router.get('/low-stock', authenticateToken, authorize('admin', 'doctor', 'receptionist'), getLowStockMedicines);

// Thống kê kho thuốc
router.get('/stats', authenticateToken, authorize('admin', 'doctor', 'receptionist'), getMedicineStats);

// Cập nhật trạng thái thuốc hết hạn
router.post('/update-expired', authenticateToken, authorize('admin'), updateExpiredMedicines);

// Lấy thuốc theo nhà cung cấp (admin và receptionist có thể xem)
router.get('/supplier/:supplierId', authenticateToken, authorize('admin', 'receptionist'), getMedicinesBySupplier);

// Lấy thuốc theo ID
router.get('/:id', authenticateToken, authorize('admin', 'doctor', 'receptionist'), getMedicineById);

// Thêm thuốc mới
router.post('/', authenticateToken, authorize('admin'), createMedicine);

// Cập nhật thuốc
router.put('/:id', authenticateToken, authorize('admin'), updateMedicine);

// Cập nhật tồn kho
router.put('/:id/stock', authenticateToken, authorize('admin'), updateStock);

// Xóa thuốc
router.delete('/:id', authenticateToken, authorize('admin'), deleteMedicine);

export default router;