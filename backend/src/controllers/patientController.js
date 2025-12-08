import { Patient, User } from '../models/index.js';

// Lấy hồ sơ bệnh nhân theo user ID
export const getPatientByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        const patient = await Patient.findOne({ user_id: userId })
            .populate('user_id', 'full_name phone email dob address gender');
        
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hồ sơ bệnh nhân'
            });
        }

        if (req.user.role === 'patient' && req.user._id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Bạn chỉ có thể xem hồ sơ của chính mình'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lấy hồ sơ bệnh nhân thành công',
            data: patient
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy hồ sơ bệnh nhân',
            error: error.message
        });
    }
};

// Tạo hồ sơ bệnh nhân mới
export const createPatient = async (req, res) => {
    try {
        const { user_id, notes } = req.body;

        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        if (user.role !== 'patient') {
            return res.status(400).json({
                success: false,
                message: 'Người dùng không có vai trò bệnh nhân'
            });
        }

        const existingPatient = await Patient.findOne({ user_id });
        if (existingPatient) {
            return res.status(400).json({
                success: false,
                message: 'Bệnh nhân đã tồn tại'
            });
        }

        const patient = new Patient({
            user_id,
            notes: notes || ''
        });

        await patient.save();

        await patient.populate('user_id', 'full_name phone email dob address gender');

        res.status(201).json({
            success: true,
            message: 'Tạo hồ sơ bệnh nhân thành công',
            data: patient
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo bệnh nhân',
            error: error.message
        });
    }
};

// Lấy tất cả bệnh nhân
export const getPatients = async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const skip = (page - 1) * limit;

        let query = {};

        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            
            const users = await User.find({
                $or: [
                    { full_name: searchRegex },
                    { phone: searchRegex }
                ],
                role: 'patient'
            }).select('_id');
            
            const userIds = users.map(user => user._id);
            
            if (userIds.length > 0) {
                query.user_id = { $in: userIds };
            } else {
                return res.status(200).json({
                    success: true,
                    message: 'Không tìm thấy bệnh nhân phù hợp',
                    data: {
                        patients: [],
                        pagination: {
                            current_page: parseInt(page),
                            total_pages: 0,
                            total_items: 0,
                            items_per_page: parseInt(limit)
                        }
                    }
                });
            }
        }

        const patients = await Patient.find(query)
            .populate('user_id', 'full_name phone email dob address gender')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Patient.countDocuments(query);

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách bệnh nhân thành công',
            data: {
                patients,
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
            message: 'Lỗi server khi lấy danh sách bệnh nhân',
            error: error.message
        });
    }
};

// Lấy thông tin bệnh nhân theo ID
export const getPatientById = async (req, res) => {
    try {
        const { id } = req.params;

        const patient = await Patient.findById(id)
            .populate('user_id', 'full_name phone email dob address gender');

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bệnh nhân'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lấy thông tin bệnh nhân thành công',
            data: patient
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin bệnh nhân',
            error: error.message
        });
    }
};

// Cập nhật thông tin bệnh nhân 
export const updatePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const existing = await Patient.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bệnh nhân'
            });
        }

        const isStaff = ['admin', 'receptionist'].includes(req.user.role);
        const isOwnerPatient = req.user.role === 'patient' && existing.user_id?.toString() === req.user._id.toString();
        if (notes !== undefined && !(isStaff || isOwnerPatient)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền cập nhật ghi chú bệnh nhân'
            });
        }

        const updateData = {};
        if (typeof notes === 'string') updateData.notes = notes;

        const patient = await Patient.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('user_id', 'full_name phone email dob address gender');

        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin bệnh nhân thành công',
            data: patient
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật bệnh nhân',
            error: error.message
        });
    }
};

// Xóa bệnh nhân 
export const deletePatient = async (req, res) => {
    try {
        const { id } = req.params;

        const patient = await Patient.findByIdAndDelete(id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bệnh nhân'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Xóa bệnh nhân thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa bệnh nhân',
            error: error.message
        });
    }
};
