import { Receptionist, User } from '../models/index.js';

// Tạo lễ tân mới
export const createReceptionist = async (req, res) => {
    try {
        const { user_id } = req.body;

        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        if (user.role !== 'receptionist') {
            return res.status(400).json({
                success: false,
                message: 'Người dùng không có vai trò lễ tân'
            });
        }

        const existingReceptionist = await Receptionist.findOne({ user_id });
        if (existingReceptionist) {
            return res.status(400).json({
                success: false,
                message: 'Lễ tân đã tồn tại'
            });
        }

        const receptionist = new Receptionist({
            user_id
        });

        await receptionist.save();

        await receptionist.populate('user_info');

        res.status(201).json({
            success: true,
            message: 'Tạo hồ sơ lễ tân thành công',
            data: receptionist
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo lễ tân',
            error: error.message
        });
    }
};

// Lấy tất cả lễ tân
export const getReceptionists = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, include_inactive } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const skip = (pageNum - 1) * limitNum;

        let query = {};

        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            const userFilter = {
                role: 'receptionist',
                $or: [
                    { full_name: searchRegex },
                    { phone: searchRegex }
                ]
            };
            if (include_inactive !== 'true') {
                userFilter.employment_status = true;
            }
            const users = await User.find(userFilter).select('_id');
            const userIds = users.map(user => user._id);
            if (userIds.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'Không tìm thấy lễ tân phù hợp',
                    data: {
                        receptionists: [],
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
        } else {
            const userFilter = { role: 'receptionist' };
            if (include_inactive !== 'true') {
                userFilter.employment_status = true;
            }
            const users = await User.find(userFilter).select('_id');
            const userIds = users.map(user => user._id);
            if (userIds.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'Không tìm thấy lễ tân phù hợp',
                    data: {
                        receptionists: [],
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
        }

        const receptionists = await Receptionist.find(query)
            .populate('user_info')
            .skip(skip)
            .limit(limitNum)
            .sort({ createdAt: -1 });

        const total = await Receptionist.countDocuments(query);

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách lễ tân thành công',
            data: {
                receptionists,
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
            message: 'Lỗi server khi lấy danh sách lễ tân',
            error: error.message
        });
    }
};

// Lấy thông tin lễ tân theo ID
export const getReceptionistById = async (req, res) => {
    try {
        const { id } = req.params;

        const receptionist = await Receptionist.findById(id)
            .populate('user_info');

        if (!receptionist) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lễ tân'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lấy thông tin lễ tân thành công',
            data: receptionist
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin lễ tân',
            error: error.message
        });
    }
};

// Lấy thông tin lễ tân theo user ID
export const getReceptionistByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        const receptionist = await Receptionist.findOne({ user_id: userId })
            .populate('user_info');

        if (!receptionist) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lễ tân'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lấy thông tin lễ tân thành công',
            data: receptionist
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin lễ tân theo user',
            error: error.message
        });
    }
};

// Cập nhật thông tin lễ tân
export const updateReceptionist = async (req, res) => {
    try {
        const { id } = req.params;

        const receptionist = await Receptionist.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        ).populate('user_info');

        if (!receptionist) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lễ tân'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin lễ tân thành công',
            data: receptionist
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật lễ tân',
            error: error.message
        });
    }
};

// Xóa lễ tân
export const deleteReceptionist = async (req, res) => {
    try {
        const { id } = req.params;

        const receptionist = await Receptionist.findById(id);
        if (!receptionist) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lễ tân'
            });
        }

        await User.findByIdAndUpdate(receptionist.user_id, { employment_status: false });

        res.status(200).json({
            success: true,
            message: 'Đã chuyển trạng thái làm việc của lễ tân thành đã nghỉ (employment_status=false)'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật trạng thái lễ tân',
            error: error.message
        });
    }
};

// Kích hoạt lại lễ tân
export const reactivateReceptionist = async (req, res) => {
    try {
        const { id } = req.params;

        const receptionist = await Receptionist.findById(id);
        if (!receptionist) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lễ tân'
            });
        }

        await User.findByIdAndUpdate(receptionist.user_id, { employment_status: true });

        res.status(200).json({
            success: true,
            message: 'Đã kích hoạt lại tài khoản lễ tân'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi kích hoạt lại lễ tân',
            error: error.message
        });
    }
};