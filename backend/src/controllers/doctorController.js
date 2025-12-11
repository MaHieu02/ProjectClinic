import { Doctor, User } from '../models/index.js';

// Tạo bác sĩ mới
export const createDoctor = async (req, res) => {
    try {
        const { user_id, specialty, busy_time } = req.body;
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        if (user.role !== 'doctor') {
            return res.status(400).json({
                success: false,
                message: 'Người dùng không có vai trò bác sĩ'
            });
        }

        // Kiểm tra xem bác sĩ đã tồn tại chưa
        const existingDoctor = await Doctor.findOne({ user_id });
        if (existingDoctor) {
            return res.status(400).json({
                success: false,
                message: 'Bác sĩ đã tồn tại'
            });
        }

        const doctor = new Doctor({
            user_id,
            specialty,
            busy_time: busy_time || null
        });

        await doctor.save();
        await doctor.populate('user_info');

        res.status(201).json({
            success: true,
            message: 'Tạo hồ sơ bác sĩ thành công',
            data: doctor
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo bác sĩ',
            error: error.message
        });
    }
};

// Lấy tất cả bác sĩ
export const getDoctors = async (req, res) => {
    try {
        const { page = 1, limit = 10, specialty_id, search, include_inactive } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const skip = (pageNum - 1) * limitNum;

        const query = {};

        // Nếu include_inactive=true thì lấy cả những người đã nghỉ việc
        const userFilter = { role: 'doctor' };
        if (include_inactive !== 'true') {
            userFilter.employment_status = true;
        }
        
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            userFilter.$or = [
                { full_name: searchRegex },
                { phone: searchRegex }
            ];
        }

        const users = await User.find(userFilter).select('_id');
        const userIds = users.map(u => u._id);
        if (userIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Không tìm thấy bác sĩ phù hợp',
                data: {
                    doctors: [],
                    pagination: {
                        current_page: pageNum,
                        total_pages: 0,
                        total_items: 0,
                        items_per_page: limitNum
                    }
                }
            });
        }
        query.user_id = { $in: userIds };
        if (specialty_id) {
            query.specialty_id = specialty_id;
        }

        const doctors = await Doctor.find(query)
            .populate('user_id', 'full_name phone email dob address gender username')
            .populate('specialty_id', 'name code description')
            .skip(skip)
            .limit(limitNum)
            .sort({ createdAt: -1 });

        const total = await Doctor.countDocuments(query);

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách bác sĩ thành công',
            data: {
                doctors,
                pagination: {
                    current_page: pageNum,
                    total_pages: Math.ceil(total / limitNum),
                    total_items: total,
                    items_per_page: limitNum
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách bác sĩ',
            error: error.message
        });
    }
};

// Lấy thông tin bác sĩ theo ID
export const getDoctorById = async (req, res) => {
    try {
        const { id } = req.params;

        const doctor = await Doctor.findById(id)
            .populate('user_info')
            .populate('specialty_id', 'name code description');

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bác sĩ'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lấy thông tin bác sĩ thành công',
            data: doctor
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin bác sĩ',
            error: error.message
        });
    }
};

// Lấy thông tin bác sĩ theo user ID
export const getDoctorByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        const doctor = await Doctor.findOne({ user_id: userId })
            .populate('user_id', 'full_name phone email dob address gender employment_status username')
            .populate('specialty_id', 'name code description');

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bác sĩ'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lấy thông tin bác sĩ thành công',
            data: doctor
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin bác sĩ',
            error: error.message
        });
    }
};

// Lấy bác sĩ theo chuyên khoa
export const getDoctorsBySpecialty = async (req, res) => {
    try {
        const { specialty } = req.params;

        const activeDoctorUsers = await User.find({ role: 'doctor', employment_status: true }).select('_id');
        const activeUserIds = activeDoctorUsers.map(u => u._id);

        const doctors = await Doctor.find({
            specialty_id: specialty,
            user_id: { $in: activeUserIds },
            is_active: true
        })
        .populate('user_id', 'full_name phone email dob address gender username')
        .populate('specialty_id', 'name code description')
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách bác sĩ theo chuyên khoa thành công',
            data: doctors
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy bác sĩ theo chuyên khoa',
            error: error.message
        });
    }
};

// Cập nhật thông tin bác sĩ
export const updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { specialty_id, busy_time } = req.body;

        const updateData = {};
        if (specialty_id) updateData.specialty_id = specialty_id;
        if (busy_time !== undefined) updateData.busy_time = busy_time;

        const doctor = await Doctor.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        )
        .populate('user_info')
        .populate('specialty_id', 'name code description');

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bác sĩ'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin bác sĩ thành công',
            data: doctor
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật bác sĩ',
            error: error.message
        });
    }
};

// Xóa bác sĩ 
export const deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;

        const doctor = await Doctor.findById(id);

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bác sĩ'
            });
        }
        if (doctor.is_active !== false) {
            doctor.is_active = false;
            await doctor.save();
        }
        await User.findByIdAndUpdate(doctor.user_id, { employment_status: false });

        res.status(200).json({
            success: true,
            message: 'Đã vô hiệu hoá tài khoản bác sĩ và trạng thái làm việc'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa bác sĩ',
            error: error.message
        });
    }
};

// Kích hoạt lại bác sĩ
export const reactivateDoctor = async (req, res) => {
    try {
        const { id } = req.params;

        const doctor = await Doctor.findById(id);

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bác sĩ'
            });
        }
        if (doctor.is_active !== true) {
            doctor.is_active = true;
            await doctor.save();
        }
        await User.findByIdAndUpdate(doctor.user_id, { employment_status: true });

        res.status(200).json({
            success: true,
            message: 'Đã kích hoạt lại tài khoản bác sĩ và trạng thái làm việc'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi kích hoạt lại bác sĩ',
            error: error.message
        });
    }
};

// Kiểm tra thời gian bác sĩ có bận không
export const checkDoctorAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { date_time } = req.query;

        const doctor = await Doctor.findById(id);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bác sĩ'
            });
        }

        const checkTime = new Date(date_time);
        const isAvailable = !doctor.busy_time || doctor.busy_time.getTime() !== checkTime.getTime();

        res.status(200).json({
            success: true,
            message: 'Kiểm tra lịch bác sĩ thành công',
            data: {
                is_available: isAvailable,
                busy_time: doctor.busy_time,
                check_time: checkTime
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi kiểm tra lịch bác sĩ',
            error: error.message
        });
    }
};

// Thay đổi trạng thái hoạt động của bác sĩ
export const toggleDoctorActiveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        const doctor = await Doctor.findById(id);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bác sĩ'
            });
        }
        const updatedDoctor = await Doctor.findByIdAndUpdate(
            id,
            { is_active: is_active !== undefined ? is_active : !doctor.is_active },
            { new: true }
        ).populate('user_id', 'full_name email phone username');

        res.status(200).json({
            success: true,
            message: `Bác sĩ đã ${updatedDoctor.is_active ? 'online' : 'offline'}`,
            data: updatedDoctor
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật trạng thái bác sĩ',
            error: error.message
        });
    }
};

// Lấy danh sách bác sĩ đang hoạt động
export const getActiveDoctors = async (req, res) => {
    try {
        const { specialty_id } = req.query;
        
        const filter = { is_active: true };
        if (specialty_id) {
            filter.specialty_id = specialty_id;
        }

        const activeDoctorUsers = await User.find({ role: 'doctor', employment_status: true }).select('_id');
        const activeUserIds = activeDoctorUsers.map(u => u._id);

        const activeDoctors = await Doctor.find({ ...filter, user_id: { $in: activeUserIds } })
            .populate('user_id', 'full_name email phone username')
            .populate('specialty_id', 'name code description')
            .sort({ specialty_id: 1, 'user_id.full_name': 1 });

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách bác sĩ đang hoạt động thành công',
            data: activeDoctors,
            total: activeDoctors.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách bác sĩ đang hoạt động',
            error: error.message
        });
    }
};