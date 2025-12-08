import { Admin, User } from '../models/index.js';

// Tạo admin mới
export const createAdmin = async (req, res) => {
    try {
        const { user_id } = req.body;
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        if (user.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Người dùng không có vai trò admin'
            });
        }
        const existingAdmin = await Admin.findOne({ user_id });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Admin đã tồn tại'
            });
        }

        const admin = new Admin({
            user_id
        });

        await admin.save();

        await admin.populate('user_info');

        res.status(201).json({
            success: true,
            message: 'Tạo hồ sơ admin thành công',
            data: admin
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo admin',
            error: error.message
        });
    }
};

// Lấy tất cả admin
export const getAdmins = async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        if (search) {
            const users = await User.find({
                full_name: { $regex: search, $options: 'i' }
            }).select('_id');
            const userIds = users.map(user => user._id);
            query.user_id = { $in: userIds };
        }
        const admins = await Admin.find(query)
            .populate('user_info')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Admin.countDocuments(query);

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách admin thành công',
            data: {
                admins,
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
            message: 'Lỗi server khi lấy danh sách admin',
            error: error.message
        });
    }
};

// Lấy thông tin admin theo ID
export const getAdminById = async (req, res) => {
    try {
        const { id } = req.params;

        const admin = await Admin.findById(id)
            .populate('user_info');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy admin'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lấy thông tin admin thành công',
            data: admin
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin admin',
            error: error.message
        });
    }
};

// Cập nhật thông tin admin
export const updateAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const admin = await Admin.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        ).populate('user_info');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy admin'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin admin thành công',
            data: admin
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật admin',
            error: error.message
        });
    }
};

// Xóa admin
export const deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const admin = await Admin.findByIdAndDelete(id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy admin'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Xóa admin thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa admin',
            error: error.message
        });
    }
};
