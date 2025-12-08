import { MedicalRecord, Patient, Doctor, Appointment } from '../models/index.js';

// Tạo hồ sơ bệnh án mới
export const createMedicalRecord = async (req, res) => {
    try {
        const { 
            patient_id, 
            doctor_id, 
            appointment_id, 
            diagnosis, 
            treatment,
            symptoms,
            follow_up_recommendations,
            medications_prescribed,
            notes,
            prescription_notes
        } = req.body;

        const patient = await Patient.findById(patient_id);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bệnh nhân'
            });
        }
        const doctor = await Doctor.findById(doctor_id);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bác sĩ'
            });
        }
        if (appointment_id) {
            const appointment = await Appointment.findById(appointment_id);
            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy lịch hẹn'
                });
            }
        }

        const medicalRecordData = {
            patient_id,
            doctor_id,
            appointment_id,
            diagnosis,
            treatment
        };

        if (symptoms) medicalRecordData.symptoms = symptoms;
        if (follow_up_recommendations) medicalRecordData.follow_up_recommendations = follow_up_recommendations;
        if (medications_prescribed && medications_prescribed.length > 0) {
            medicalRecordData.medications_prescribed = medications_prescribed;
        }
        if (typeof notes === 'string' && notes.trim().length > 0) {
            medicalRecordData.notes = notes.trim();
        } else if (typeof prescription_notes === 'string' && prescription_notes.trim().length > 0) {
            medicalRecordData.notes = prescription_notes.trim();
        }

        const medicalRecord = new MedicalRecord(medicalRecordData);

        await medicalRecord.save();

        await medicalRecord.populate(['patient_info', 'doctor_info', 'appointment_info']);

        res.status(201).json({
            success: true,
            message: 'Tạo hồ sơ bệnh án thành công',
            data: medicalRecord
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo hồ sơ bệnh án',
            error: error.message
        });
    }
};

// Lấy tất cả hồ sơ bệnh án
export const getMedicalRecords = async (req, res) => {
    try {
        const { page = 1, limit = 10, patient_id, doctor_id } = req.query;
        const skip = (page - 1) * limit;

    let query = {};
        if (patient_id) {
            query.patient_id = patient_id;
        }
        if (doctor_id) {
            query.doctor_id = doctor_id;
        }

        const medicalRecords = await MedicalRecord.find(query)
            .populate(['patient_info', 'doctor_info', 'appointment_info'])
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await MedicalRecord.countDocuments(query);

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách hồ sơ bệnh án thành công',
            data: {
                medical_records: medicalRecords,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    items_per_page: parseInt(limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách hồ sơ bệnh án',
            error: error.message
        });
    }
};

// Lấy thông tin hồ sơ bệnh án theo ID
export const getMedicalRecordById = async (req, res) => {
    try {
        const { id } = req.params;

        const medicalRecord = await MedicalRecord.findById(id)
            .populate(['patient_info', 'doctor_info', 'appointment_info']);

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hồ sơ bệnh án'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lấy thông tin hồ sơ bệnh án thành công',
            data: medicalRecord
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin hồ sơ bệnh án',
            error: error.message
        });
    }
};

// Lấy hồ sơ bệnh án theo bệnh nhân
export const getMedicalRecordsByPatient = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        console.log('getMedicalRecordsByPatient - patientId:', patientId);
        console.log('getMedicalRecordsByPatient - page:', page, 'limit:', limit);
        
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bệnh nhân'
            });
        }

        const medicalRecords = await MedicalRecord.find({ 
            patient_id: patientId
        })
        .populate({
            path: 'doctor_id',
            populate: {
                path: 'user_id',
                select: 'full_name specialty'
            }
        })
        .populate('appointment_id')
        .populate('medications_prescribed.medicine_id')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

        const total = await MedicalRecord.countDocuments({ patient_id: patientId });

        res.status(200).json({
            success: true,
            message: 'Lấy hồ sơ bệnh án của bệnh nhân thành công',
            data: {
                medical_records: medicalRecords,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    items_per_page: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Error in getMedicalRecordsByPatient:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy hồ sơ bệnh án theo bệnh nhân',
            error: error.message
        });
    }
};

// Cập nhật hồ sơ bệnh án
export const updateMedicalRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { diagnosis, treatment, symptoms, follow_up_recommendations, notes, medications_prescribed, status } = req.body;

        const updateData = {};
        if (diagnosis) updateData.diagnosis = diagnosis;
        if (treatment) updateData.treatment = treatment;
        if (typeof symptoms === 'string') updateData.symptoms = symptoms;
        if (typeof follow_up_recommendations === 'string') updateData.follow_up_recommendations = follow_up_recommendations;
        if (typeof notes === 'string') updateData.notes = notes;
        if (Array.isArray(medications_prescribed)) updateData.medications_prescribed = medications_prescribed;
        if (status && ['draft','completed','dispensed'].includes(status)) updateData.status = status;

        const medicalRecord = await MedicalRecord.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate(['patient_info', 'doctor_info', 'appointment_info']);

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hồ sơ bệnh án'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật hồ sơ bệnh án thành công',
            data: medicalRecord
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật hồ sơ bệnh án',
            error: error.message
        });
    }
};

// Xóa hồ sơ bệnh án 
export const deleteMedicalRecord = async (req, res) => {
    try {
        const { id } = req.params;

        const medicalRecord = await MedicalRecord.findById(id);
        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hồ sơ bệnh án'
            });
        }

        await MedicalRecord.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Xóa hồ sơ bệnh án thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa hồ sơ bệnh án',
            error: error.message
        });
    }
};

// Tìm kiếm hồ sơ bệnh án theo chẩn đoán
export const searchMedicalRecordsByDiagnosis = async (req, res) => {
    try {
        const { diagnosis } = req.query;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        if (!diagnosis) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập từ khóa tìm kiếm'
            });
        }

        const medicalRecords = await MedicalRecord.find({
            diagnosis: { $regex: diagnosis, $options: 'i' }
        })
        .populate(['patient_info', 'doctor_info'])
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

        const total = await MedicalRecord.countDocuments({
            diagnosis: { $regex: diagnosis, $options: 'i' }
        });

        res.status(200).json({
            success: true,
            message: `Tìm kiếm hồ sơ bệnh án với chẩn đoán "${diagnosis}" thành công`,
            data: {
                medical_records: medicalRecords,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    items_per_page: parseInt(limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tìm kiếm hồ sơ bệnh án',
            error: error.message
        });
    }
};

// Lấy hồ sơ bệnh án theo appointment_id
export const getMedicalRecordByAppointment = async (req, res) => {
    try {
        const { appointment_id } = req.params;

        const medicalRecord = await MedicalRecord.findOne({ appointment_id })
            .populate({
                path: 'patient_id',
                populate: {
                    path: 'user_id',
                    select: 'full_name phone email'
                }
            })
            .populate({
                path: 'doctor_id',
                populate: {
                    path: 'user_id',
                    select: 'full_name specialty'
                }
            })
            .populate('appointment_id')
            .populate('medications_prescribed.medicine_id');

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hồ sơ bệnh án cho lịch hẹn này'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lấy thông tin hồ sơ bệnh án thành công',
            data: medicalRecord
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin hồ sơ bệnh án',
            error: error.message
        });
    }
};

// In đơn thuốc - giảm số lượng thuốc trong kho
export const dispensePrescription = async (req, res) => {
    try {
        const { id } = req.params; 

        const medicalRecord = await MedicalRecord.findById(id)
            .populate('medications_prescribed.medicine_id');

        if (!medicalRecord) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hồ sơ bệnh án'
            });
        }

        if (medicalRecord.status === 'dispensed') {
            return res.status(400).json({
                success: false,
                message: 'Đơn thuốc này đã được in và xuất kho trước đó'
            });
        }

        const Medicine = (await import('../models/index.js')).Medicine;
        const insufficientStock = [];

        for (const med of medicalRecord.medications_prescribed) {
            const medicine = await Medicine.findById(med.medicine_id);
            if (!medicine) {
                insufficientStock.push(`Không tìm thấy thuốc: ${med.medicine_name}`);
            } else if (medicine.stock_quantity < med.quantity) {
                insufficientStock.push(
                    `${med.medicine_name}: Tồn kho ${medicine.stock_quantity}, cần ${med.quantity}`
                );
            }
        }

        if (insufficientStock.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng thuốc trong kho không đủ',
                details: insufficientStock
            });
        }

        for (const med of medicalRecord.medications_prescribed) {
            await Medicine.findByIdAndUpdate(
                med.medicine_id,
                { $inc: { stock_quantity: -med.quantity } }
            );
        }

        medicalRecord.status = 'dispensed';
        await medicalRecord.save();

        if (medicalRecord.appointment_id && req.user && req.user._id) {
            await Appointment.findByIdAndUpdate(
                medicalRecord.appointment_id,
                { pharmacist_id: req.user._id }
            );
        }

        await medicalRecord.populate([
            {
                path: 'patient_id',
                populate: {
                    path: 'user_id',
                    select: 'full_name phone email'
                }
            },
            {
                path: 'doctor_id',
                populate: {
                    path: 'user_id',
                    select: 'full_name specialty'
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: 'In đơn thuốc và xuất kho thành công',
            data: medicalRecord
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi in đơn thuốc',
            error: error.message
        });
    }
};