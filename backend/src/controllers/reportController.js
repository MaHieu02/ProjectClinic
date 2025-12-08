import { Appointment, MedicalRecord, Medicine } from '../models/index.js';

// Báo cáo doanh thu chi tiết
export const getRevenueDetailReport = async (req, res) => {
    try {
        const { startDate, endDate, doctor_id, patient_id, status } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin: startDate và endDate'
            });
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filter = {
            appointment_time: { $gte: start, $lte: end }
        };

        if (doctor_id) filter.doctor_id = doctor_id;
        if (patient_id) filter.patient_id = patient_id;
        if (status) filter.status = status;

        const appointments = await Appointment.find(filter)
            .populate([
                {
                    path: 'patient_id',
                    populate: {
                        path: 'user_id',
                        select: 'full_name phone email'
                    }
                },
                {
                    path: 'doctor_id',
                    populate: [
                        {
                            path: 'user_id',
                            select: 'full_name'
                        },
                        {
                            path: 'specialty_id',
                            select: 'name code description'
                        }
                    ]
                },
                {
                    path: 'examination_fee_id',
                    select: 'examination_type fee description'
                },
                {
                    path: 'medical_record_id'
                }
            ])
            .sort({ appointment_time: -1 });

        const detailedAppointments = await Promise.all(appointments.map(async (appointment) => {
            let medicineCost = 0;
            let medicineCount = 0;
            let medicalRecordData = null;
            let medicalRecord = null;
            
            if (appointment.medical_record_id) {
                medicalRecord = await MedicalRecord.findById(appointment.medical_record_id);
            } else {
                medicalRecord = await MedicalRecord.findOne({ appointment_id: appointment._id });
            }
            
            if (medicalRecord) {
                medicalRecordData = medicalRecord.toObject();
                if (medicalRecord.status === 'dispensed' && medicalRecord.medications_prescribed && medicalRecord.medications_prescribed.length > 0) {
                    for (const med of medicalRecord.medications_prescribed) {
                        if (med.medicine_id) {
                            const medicine = await Medicine.findById(med.medicine_id);
                            if (medicine) {
                                medicineCost += (medicine.price || 0) * (med.quantity || 0);
                                medicineCount += med.quantity || 0;
                            }
                        }
                    }
                }
            }

            const examinationFee = appointment.status === 'completed' ? (appointment.examination_fee || 0) : 0;
            const totalCost = examinationFee + medicineCost;

            const appointmentObj = appointment.toObject();
            
            return {
                ...appointmentObj,
                medical_record_id: medicalRecordData,
                medicineCost,
                medicineCount,
                totalCost
            };
        }));

        const summary = {
            totalAppointments: detailedAppointments.length,
            totalExaminationFee: detailedAppointments.reduce((sum, apt) => {
                // CHỈ tính phí khám nếu status là 'completed'
                return sum + (apt.status === 'completed' ? (apt.examination_fee || 0) : 0);
            }, 0),
            totalMedicineFee: detailedAppointments.reduce((sum, apt) => sum + (apt.medicineCost || 0), 0),
            totalRevenue: detailedAppointments.reduce((sum, apt) => sum + (apt.totalCost || 0), 0)
        };

        res.status(200).json({
            success: true,
            message: 'Lấy báo cáo doanh thu chi tiết thành công',
            data: {
                appointments: detailedAppointments,
                summary
            }
        });
    } catch (error) {
        console.error('Error getting revenue detail report:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy báo cáo doanh thu chi tiết',
            error: error.message
        });
    }
};
