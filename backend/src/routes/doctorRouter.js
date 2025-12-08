import express from 'express';
import {
    createDoctor,
    getDoctors,
    getDoctorById,
    getDoctorByUserId,
    getDoctorsBySpecialty,
    updateDoctor,
    deleteDoctor,
    reactivateDoctor,
    checkDoctorAvailability,
    toggleDoctorActiveStatus,
    getActiveDoctors
} from '../controllers/doctorController.js';
import { authenticateToken, authorize, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Lấy tất cả bác sĩ
router.get('/', authenticateToken, authorize('admin', 'doctor', 'receptionist', 'patient'), getDoctors);

// Lấy bác sĩ đang hoạt động
router.get('/active', authenticateToken, authorize('admin', 'doctor', 'receptionist', 'patient'), getActiveDoctors);

// Lấy bác sĩ theo chuyên khoa
router.get('/specialty/:specialty', authenticateToken, authorize('admin', 'doctor', 'patient'), getDoctorsBySpecialty);

// Lấy bác sĩ theo user ID
router.get('/user/:userId', authenticateToken, authorize('admin', 'doctor'), getDoctorByUserId);

// Lấy bác sĩ theo ID
router.get('/:id', authenticateToken, authorize('admin', 'doctor'), getDoctorById);

// Kiểm tra lịch bận 
router.get('/:id/availability', authenticateToken, checkDoctorAvailability);

// Tạo bác sĩ mới 
router.post('/', authenticateToken, authorize('admin'), createDoctor);

// Cập nhật bác sĩ 
router.put('/:id', authenticateToken, authorize('admin', 'doctor'), updateDoctor);

// Thay đổi trạng thái hoạt động 
router.put('/:id/toggle-active', authenticateToken, authorize('admin', 'doctor'), toggleDoctorActiveStatus);

// Xóa bác sĩ 
router.delete('/:id', authenticateToken, authorize('admin'), deleteDoctor);

// Kích hoạt lại bác sĩ
router.put('/:id/reactivate', authenticateToken, authorize('admin'), reactivateDoctor);

export default router;