import express from 'express';
import {
    createMedicalRecord,
    getMedicalRecords,
    getMedicalRecordById,
    getMedicalRecordsByPatient,
    updateMedicalRecord,
    deleteMedicalRecord,
    searchMedicalRecordsByDiagnosis,
    getMedicalRecordByAppointment,
    dispensePrescription
} from '../controllers/medicalRecordController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();

// Lấy tất cả hồ sơ bệnh án
router.get('/', authenticateToken, authorize('admin', 'doctor'), getMedicalRecords);

// Tìm kiếm theo chẩn đoán
router.get('/search', authenticateToken, authorize('admin', 'doctor'), searchMedicalRecordsByDiagnosis);

// Lấy hồ sơ theo bệnh nhân
router.get('/patient/:patientId', authenticateToken, getMedicalRecordsByPatient);

// Lấy hồ sơ theo appointment
router.get('/appointment/:appointment_id', authenticateToken, getMedicalRecordByAppointment);

// In đơn thuốc và xuất kho
router.post('/:id/dispense', authenticateToken, authorize('admin', 'receptionist'), dispensePrescription);

// Lấy hồ sơ theo ID
router.get('/:id', authenticateToken, getMedicalRecordById);

// Tạo hồ sơ bệnh án mới
router.post('/', authenticateToken, authorize('admin', 'doctor'), createMedicalRecord);

// Cập nhật hồ sơ
router.put('/:id', authenticateToken, authorize('admin', 'doctor'), updateMedicalRecord);

// Xóa hồ sơ
router.delete('/:id', authenticateToken, authorize('admin'), deleteMedicalRecord);

export default router;