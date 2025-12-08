import { Appointment, Patient, Doctor, User, ExaminationFee } from '../models/index.js';

// Cập nhật các lịch hẹn đã quá 2 tiếng nhưng vẫn 'booked' thành 'late'
const updateLateAppointments = async (extraFilter = {}) => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const andConditions = [
        { status: 'booked' },
        { appointment_time: { $lte: twoHoursAgo } }
    ];
    if (extraFilter && Object.keys(extraFilter).length > 0) {
        andConditions.push(extraFilter);
    }
    await Appointment.updateMany(
        { $and: andConditions },
        { $set: { status: 'late' } }
    );
};

// Tự động hủy các lịch hẹn trễ và chưa hoàn thành/đã hủy nếu đã quá 12 tiếng
const autoCancelLateAppointments = async (extraFilter = {}) => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const andConditions = [
        { status: { $nin: ['completed', 'cancelled'] } },
        { appointment_time: { $lte: twelveHoursAgo } }
    ];
    if (extraFilter && Object.keys(extraFilter).length > 0) {
        andConditions.push(extraFilter);
    }
    const result = await Appointment.updateMany(
        { $and: andConditions },
        { 
            $set: { 
                status: 'cancelled',
                notes: 'Tự động hủy: Trễ hẹn'
            } 
        }
    );

    return result;
};

// Tạo lịch hẹn mới
export const createAppointment = async (req, res) => {
    try {
        const { patient_id, doctor_id, appointment_time, symptoms, notes, status, examination_fee_id, receptionist_id, pharmacist_id } = req.body;
        if (!patient_id || !doctor_id || !appointment_time) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: patient_id, doctor_id, appointment_time'
            });
        }
        const bookedBy = req.user?.id || req.user?._id;
        if (!bookedBy) {
            return res.status(401).json({
                success: false,
                message: 'Không xác định được người đặt lịch. Vui lòng đăng nhập lại.'
            });
        }
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
        const doctorUser = await User.findById(doctor.user_id).select('employment_status full_name');
        if (!doctorUser || doctorUser.employment_status === false) {
            return res.status(400).json({
                success: false,
                message: 'Bác sĩ không có sẵn'
            });
        }
        const appointmentDate = new Date(appointment_time);
        if (appointmentDate <= new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Thời gian hẹn phải trong tương lai'
            });
        }
        const conflictingAppointment = await Appointment.findOne({
            doctor_id,
            appointment_time: appointmentDate,
            status: { $ne: 'cancelled' }
        });

        if (conflictingAppointment) {
            return res.status(400).json({
                success: false,
                message: 'Bác sĩ đã có lịch hẹn vào thời gian này'
            });
        }
        let examinationFee = 0;
        let examinationType = '';
        if (examination_fee_id) {
            const feeInfo = await ExaminationFee.findById(examination_fee_id);
            if (!feeInfo) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dịch vụ khám'
                });
            }
            if (!feeInfo.is_active) {
                return res.status(400).json({
                    success: false,
                    message: 'Dịch vụ khám này đã bị vô hiệu hóa'
                });
            }
            examinationFee = feeInfo.fee;
            examinationType = feeInfo.examination_type || '';
        }
        if (receptionist_id) {
            const receptionist = await User.findById(receptionist_id);
            if (!receptionist || (receptionist.role !== 'admin' && receptionist.role !== 'receptionist')) {
                return res.status(400).json({
                    success: false,
                    message: 'Người đón tiếp phải là admin hoặc lễ tân'
                });
            }
        }
        if (pharmacist_id) {
            const pharmacist = await User.findById(pharmacist_id);
            if (!pharmacist || (pharmacist.role !== 'admin' && pharmacist.role !== 'receptionist')) {
                return res.status(400).json({
                    success: false,
                    message: 'Người bán thuốc phải là admin hoặc lễ tân'
                });
            }
        }

        const appointment = new Appointment({
            patient_id,
            doctor_id,
            appointment_time: appointmentDate,
            symptoms: symptoms ? symptoms.trim() : '',
            notes: notes ? notes.trim() : '',
            status: status || 'booked',
            examination_fee_id: examination_fee_id || null,
            examination_fee: examinationFee,
            examination_type: examinationType,
            booked_by: bookedBy,
            receptionist_id: receptionist_id || null,
            pharmacist_id: pharmacist_id || null
        });
        await appointment.save();
        await appointment.populate([
            {
                path: 'patient_id',
                populate: {
                    path: 'user_id',
                    select: 'full_name phone_number email'
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
                path: 'examination_fee_id'
            },
            {
                path: 'booked_by',
                select: 'full_name email role'
            },
            {
                path: 'receptionist_id',
                select: 'full_name email role'
            },
            {
                path: 'pharmacist_id',
                select: 'full_name email role'
            }
        ]);

        res.status(201).json({
            success: true,
            message: 'Đặt lịch hẹn thành công',
            data: appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo lịch hẹn',
            error: error.message
        });
    }
};

// Lấy tất cả lịch hẹn
export const getAllAppointments = async (req, res) => {
    try {
        await updateLateAppointments();
        // Tự động hủy các lịch hẹn trễ
        await autoCancelLateAppointments();
        
        const appointments = await Appointment.find()
            .populate([
                {
                    path: 'patient_id',
                    populate: {
                        path: 'user_id',
                        select: 'full_name phone_number email'
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
                }
            ])
            .sort({ appointment_time: -1 });

        res.status(200).json({
            success: true,
            data: {
                appointments
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách lịch hẹn',
            error: error.message
        });
    }
};

// Lấy lịch hẹn theo ngày
export const getAppointmentsByDate = async (req, res) => {
    try {
        const { date } = req.params;
        
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        await updateLateAppointments({ appointment_time: { $gte: startDate, $lte: endDate } });
        await autoCancelLateAppointments({ appointment_time: { $gte: startDate, $lte: endDate } });

        const appointments = await Appointment.find({
            appointment_time: {
                $gte: startDate,
                $lte: endDate
            }
        })
        .populate([
            {
                path: 'patient_id',
                populate: {
                    path: 'user_id',
                    select: 'full_name phone_number email'
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
            }
        ])
        .sort({ appointment_time: 1 });

        res.status(200).json({
            success: true,
            data: appointments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy lịch hẹn theo ngày',
            error: error.message
        });
    }
};

// Lấy lịch hẹn theo ID
export const getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;
        
        let appointment = await Appointment.findById(id)
            .populate([
                {
                    path: 'patient_id',
                    populate: {
                        path: 'user_id',
                        select: 'full_name phone_number email'
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
                }
            ]);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch hẹn'
            });
        }

        // Nếu đã quá 2 tiếng và vẫn booked, cập nhật thành late
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        if (appointment.status === 'booked' && new Date(appointment.appointment_time) <= twoHoursAgo) {
            await Appointment.findByIdAndUpdate(id, { status: 'late' });
            appointment = await Appointment.findById(id)
                .populate([
                    {
                        path: 'patient_id',
                        populate: {
                            path: 'user_id',
                            select: 'full_name phone_number email'
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
                    }
                ]);
        }

        res.status(200).json({
            success: true,
            data: appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin lịch hẹn',
            error: error.message
        });
    }
};

// Cập nhật lịch hẹn
export const updateAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        if (updateData && typeof updateData.status === 'string' && updateData.status.toLowerCase() === 'completed') {
            if (!req.user || req.user.role !== 'doctor') {
                return res.status(403).json({
                    success: false,
                    message: 'Chỉ bác sĩ mới có thể hoàn thành lịch hẹn'
                });
            }
        }
        if (updateData && updateData.status === 'checked') {
            if (req.user && req.user._id) {
                updateData.receptionist_id = req.user._id;
            }
            if (updateData.examination_fee_id) {
                const feeInfo = await ExaminationFee.findById(updateData.examination_fee_id);
                if (!feeInfo) {
                    return res.status(404).json({
                        success: false,
                        message: 'Không tìm thấy dịch vụ khám'
                    });
                }
                if (!feeInfo.is_active) {
                    return res.status(400).json({
                        success: false,
                        message: 'Dịch vụ khám này đã bị vô hiệu hóa'
                    });
                }
                updateData.examination_fee = feeInfo.fee;
                updateData.examination_type = feeInfo.examination_type || '';
            }
        }
        const appointment = await Appointment.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        )
        .populate([
            {
                path: 'patient_id',
                populate: {
                    path: 'user_id',
                    select: 'full_name phone_number email'
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
            }
        ]);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch hẹn'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật lịch hẹn thành công',
            data: appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật lịch hẹn',
            error: error.message
        });
    }
};

// Xóa lịch hẹn
export const deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findByIdAndDelete(id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch hẹn'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Xóa lịch hẹn thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa lịch hẹn',
            error: error.message
        });
    }
};

// Lấy tất cả lịch hẹn 
export const getAppointments = getAllAppointments;

// Hủy lịch hẹn
export const cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const current = await Appointment.findById(id)
            .populate([
                {
                    path: 'patient_id',
                    populate: {
                        path: 'user_id',
                        select: 'full_name phone_number email'
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
                }
            ]);

        if (!current) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch hẹn'
            });
        }
        if (req.user && req.user.role === 'patient') {
            const now = new Date();
            const apptTime = new Date(current.appointment_time);
            const diffMs = apptTime.getTime() - now.getTime();
            const twelveHoursMs = 12 * 60 * 60 * 1000;
            if (diffMs < twelveHoursMs) {
                return res.status(400).json({
                    success: false,
                    message: 'Bạn chỉ có thể hủy lịch hẹn trước thời gian khám ít nhất 12 giờ'
                });
            }
        }
        const currentNotes = (current.notes || '').trim();
        const cleanReason = (reason || '').trim();
        const mergedNotes = cleanReason
            ? (currentNotes ? `${currentNotes} - ${cleanReason}` : cleanReason)
            : currentNotes;

        const appointment = await Appointment.findByIdAndUpdate(
            id,
            { 
                status: 'cancelled',
                notes: mergedNotes
            },
            { new: true }
        )
        .populate([
            {
                path: 'patient_id',
                populate: {
                    path: 'user_id',
                    select: 'full_name phone_number email'
                }
            },
            {
                path: 'doctor_id',
                populate: {
                    path: 'user_id',
                    select: 'full_name'
                }
            }
        ]);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch hẹn'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Hủy lịch hẹn thành công',
            data: appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi hủy lịch hẹn',
            error: error.message
        });
    }
};

// Hoàn thành lịch hẹn
export const completeAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const currentAppointment = await Appointment.findById(id);
        if (!currentAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch hẹn'
            });
        }
        const appointment = await Appointment.findByIdAndUpdate(
            id,
            { 
                status: 'completed',
                notes: notes || currentAppointment.notes
            },
            { new: true }
        )
        .populate([
            {
                path: 'patient_id',
                populate: {
                    path: 'user_id',
                    select: 'full_name phone_number email'
                }
            },
            {
                path: 'doctor_id',
                populate: {
                    path: 'user_id',
                    select: 'full_name'
                }
            }
        ]);
        res.status(200).json({
            success: true,
            message: 'Hoàn thành lịch hẹn thành công',
            data: appointment
        });
    } catch (error) {
        console.error('Error completing appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi hoàn thành lịch hẹn',
            error: error.message
        });
    }
};

// Lấy tất cả lịch hẹn theo bệnh nhân
export const getAppointmentsByPatient = async (req, res) => {
    try {
        const { id: requestedPatientId } = req.params;
        if (req.user?.role === 'patient') {
            const me = await Patient.findOne({ user_id: req.user._id }).select('_id');
            if (!me) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy hồ sơ bệnh nhân của bạn'
                });
            }
            if (me._id.toString() !== requestedPatientId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn chỉ có thể xem lịch hẹn của chính mình'
                });
            }
        }
        await updateLateAppointments({ patient_id: requestedPatientId });
        await autoCancelLateAppointments({ patient_id: requestedPatientId });
        const appointments = await Appointment.find({ patient_id: requestedPatientId })
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
                }
            ])
            .sort({ appointment_time: -1 });

        return res.status(200).json({
            success: true,
            data: appointments
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy lịch hẹn của bệnh nhân',
            error: error.message
        });
    }
};

// Báo cáo thu nhập theo khoảng thời gian
export const getIncomeReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
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
        const totalAppointments = await Appointment.countDocuments({
            createdAt: { $gte: start, $lte: end }
        });
        const completedAppointments = await Appointment.countDocuments({
            createdAt: { $gte: start, $lte: end },
            status: 'completed'
        });
        const cancelledAppointments = await Appointment.countDocuments({
            createdAt: { $gte: start, $lte: end },
            status: 'cancelled'
        });
        const bookedAppointments = await Appointment.countDocuments({
            createdAt: { $gte: start, $lte: end },
            status: { $in: ['booked', 'checked', 'late'] }
        });
        const appointmentsWithFees = await Appointment.find({
            createdAt: { $gte: start, $lte: end },
            status: 'completed',
            examination_fee_id: { $exists: true, $ne: null }
        }).populate('examination_fee_id');
        const examinationFeeIncome = appointmentsWithFees.reduce((sum, apt) => {
            return sum + (apt.examination_fee_id?.fee || 0);
        }, 0);
        const { MedicalRecord, Medicine } = await import('../models/index.js');
        const dispensedRecords = await MedicalRecord.find({
            createdAt: { $gte: start, $lte: end },
            status: 'dispensed'
        });
        let medicineIncome = 0;
        let totalMedicinesSold = 0;
        for (const record of dispensedRecords) {
            if (record.medications_prescribed && Array.isArray(record.medications_prescribed)) {
                for (const med of record.medications_prescribed) {
                    if (med.medicine_id) {
                        const medicine = await Medicine.findById(med.medicine_id);
                        if (medicine) {
                            const quantity = med.quantity || 0;
                            const price = medicine.price || 0;
                            medicineIncome += quantity * price;
                            totalMedicinesSold += quantity;
                        }
                    }
                }
            }
        }
        const totalIncome = examinationFeeIncome + medicineIncome;
        res.status(200).json({
            success: true,
            message: 'Lấy báo cáo thu nhập thành công',
            data: {
                period: {
                    startDate: start,
                    endDate: end
                },
                appointments: {
                    total: totalAppointments,
                    completed: completedAppointments,
                    cancelled: cancelledAppointments,
                    booked: bookedAppointments
                },
                medicine: {
                    totalSold: totalMedicinesSold,
                    income: medicineIncome
                },
                examination: {
                    income: examinationFeeIncome
                },
                totalIncome: totalIncome
            }
        });
    } catch (error) {
        console.error('Error getting income report:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy báo cáo thu nhập',
            error: error.message
        });
    }
};