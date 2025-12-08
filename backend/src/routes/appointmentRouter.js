import express from 'express';
import {
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointment,
    cancelAppointment,
    completeAppointment,
    getAppointmentsByDate,
    getIncomeReport
} from '../controllers/appointmentController.js';
import { authenticateToken, authorize, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Lấy tất cả lịch hẹn 
router.get('/', authenticateToken, authorize('admin', 'doctor', 'receptionist'), getAppointments);

// Báo cáo thu nhập
router.get('/report/income', authenticateToken, authorize('admin'), getIncomeReport);

// Lấy lịch hẹn theo ngày 
router.get('/date/:date', authenticateToken, authorize('admin', 'doctor', 'receptionist'), getAppointmentsByDate);

// Lấy lịch hẹn theo ID 
router.get('/:id', authenticateToken, getAppointmentById);

// Tạo lịch hẹn mới 
router.post('/', authenticateToken, authorize('patient', 'admin', 'receptionist'), createAppointment);

// Cập nhật lịch hẹn 
router.put('/:id', authenticateToken, authorize('admin', 'receptionist', 'patient'), updateAppointment);

// Hủy lịch hẹn 
router.put('/:id/cancel', authenticateToken, authorize('patient', 'admin', 'receptionist'), cancelAppointment);

// Hoàn thành lịch hẹn - chỉ bác sĩ
router.put('/:id/complete', authenticateToken, authorize('doctor'), completeAppointment);

export default router;