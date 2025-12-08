export { default as User } from './User.js';
export { default as Patient } from './Patient.js';
export { default as Doctor } from './Doctor.js';
export { default as Receptionist } from './Receptionist.js';
export { default as Admin } from './Admin.js';
export { default as Appointment } from './Appointment.js';
export { default as MedicalRecord } from './MedicalRecord.js';
export { default as Medicine } from './Medicine.js';
export { default as Supplier } from './Supplier.js';
export { default as ExaminationFee } from './ExaminationFee.js';
export { default as Specialty } from './Specialty.js';

export const initializeModels = () => {
    console.log('✅ Tất cả models đã được khởi tạo thành công');
};