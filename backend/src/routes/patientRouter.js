import express from 'express';
import {
    createPatient,
    getPatients,
    getPatientById,
    getPatientByUserId,
    updatePatient,
    deletePatient
} from '../controllers/patientController.js';
import { getAppointmentsByPatient } from '../controllers/appointmentController.js';
import { authenticateToken, authorize, checkResourceOwnership } from '../middleware/auth.js';

const router = express.Router();

// Lấy tất cả bệnh nhân 
router.get('/', authenticateToken, authorize('admin', 'doctor', 'receptionist'), getPatients);

// Lấy bệnh nhân theo user ID 
router.get('/user/:userId', authenticateToken, getPatientByUserId);

// Lấy bệnh nhân theo ID 
router.get('/:id', authenticateToken, getPatientById);

// Lấy tất cả lịch hẹn của một bệnh nhân
router.get('/:id/appointments', authenticateToken, authorize('admin', 'doctor', 'receptionist', 'patient'), getAppointmentsByPatient);

// Tạo bệnh nhân mới 
router.post('/', authenticateToken, authorize('admin', 'receptionist'), createPatient);

// Cập nhật bệnh nhân 
router.put('/:id', authenticateToken, authorize('admin', 'patient', 'receptionist'), updatePatient);

// Xóa bệnh nhân 
router.delete('/:id', authenticateToken, authorize('admin'), deletePatient);


export default router;