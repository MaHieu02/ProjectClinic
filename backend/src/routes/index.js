import express from 'express';
import usersRouter from './usersRouter.js';
import authRouter from './authRouter.js';
import patientRouter from './patientRouter.js';
import doctorRouter from './doctorRouter.js';
import receptionistRouter from './receptionistRouter.js';
import adminRouter from './adminRouter.js';
import appointmentRouter from './appointmentRouter.js';
import medicalRecordRouter from './medicalRecordRouter.js';
import medicineRouter from './medicineRouter.js';
import supplierRouter from './supplierRouter.js';
import examinationFeeRouter from './examinationFeeRouter.js';
import specialtyRouter from './specialtyRouter.js';
import reportRouter from './reportRouter.js';

const router = express.Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/patients', patientRouter);
router.use('/doctors', doctorRouter);
router.use('/receptionists', receptionistRouter);
router.use('/admins', adminRouter);
router.use('/appointments', appointmentRouter);
router.use('/medical-records', medicalRecordRouter);
router.use('/medicines', medicineRouter);
router.use('/suppliers', supplierRouter);
router.use('/examination-fees', examinationFeeRouter);
router.use('/specialties', specialtyRouter);
router.use('/reports', reportRouter);

export default router;