import { User, Patient, Doctor, Receptionist, Admin } from "../models/index.js";
import bcrypt from 'bcryptjs';

// Lấy tất cả user
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password_hash');
        res.status(200).json(users);
    } catch (error) {
        console.error("Error retrieving users:", error);
        res.status(500).json({ message: "Error retrieving users", error });
    }
}

// Lấy user theo ID
export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password_hash');
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error("Error retrieving user:", error);
        res.status(500).json({ message: "Lỗi lấy thông tin người dùng", error: error.message });
    }
}

// Lấy user theo vai trò
export const getUserByRole = async (req, res) => {
    try {
        const { role } = req.params;
        const users = await User.find({ role }).select('-password_hash');
        res.status(200).json(users);
    } catch (error) {
        console.error("Error retrieving users by role:", error);
        res.status(500).json({ message: "Lỗi lấy danh sách người dùng theo vai trò", error: error.message });
    }
}

// Tạo user mới
export const createUser = async (req, res) => {
    try {
        const { role, specialty_id, password_hash, patient_notes, ...userData } = req.body;

        const isAdminRequest = !!req.user && req.user.role === 'admin';

        if (!isAdminRequest && role && role !== 'patient') {
            return res.status(403).json({ 
                success: false,
                message: 'Chỉ được phép tạo tài khoản bệnh nhân' 
            });
        }

        const allowedRoles = ['patient', 'doctor', 'receptionist', 'admin'];
        let userRole = role || 'patient';
        if (!allowedRoles.includes(userRole)) {
            userRole = 'patient';
        }

        if (!password_hash) {
            return res.status(400).json({ message: "Mật khẩu không được để trống" });
        }

        const email = (userData.email || "").trim();
        const phone = (userData.phone || "").trim();
        if (!email && !phone) {
            return res.status(400).json({ 
                success: false,
                message: 'Phải cung cấp ít nhất Email hoặc Số điện thoại' 
            });
        }

        if (!email) userData.email = null; else userData.email = email;
        if (!phone) userData.phone = null; else userData.phone = phone;

        if (userData.date_of_birth && !userData.dob) {
            userData.dob = userData.date_of_birth;
            delete userData.date_of_birth;
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password_hash, saltRounds);

        const newUser = new User({ 
            ...userData, 
            role: userRole,
            password_hash: hashedPassword 
        });
        await newUser.save();

        if (userRole === 'patient') {
            await new Patient({ 
                user_id: newUser._id,
                notes: typeof patient_notes === 'string' ? patient_notes : ''
            }).save();
        } else if (userRole === 'doctor') {
            if (!isAdminRequest) {
                return res.status(403).json({
                    success: false,
                    message: 'Chỉ quản trị viên mới được tạo tài khoản bác sĩ'
                });
            }
            if (!specialty_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu chuyên khoa cho tài khoản bác sĩ'
                });
            }
            await new Doctor({
                user_id: newUser._id,
                specialty_id: specialty_id,
                is_active: true
            }).save();
        } else if (userRole === 'receptionist') {
            if (!isAdminRequest) {
                return res.status(403).json({
                    success: false,
                    message: 'Chỉ quản trị viên mới được tạo tài khoản lễ tân'
                });
            }
            await new (await import('../models/Receptionist.js')).default({
                user_id: newUser._id
            }).save();
        } else if (userRole === 'admin') {
            if (!isAdminRequest) {
                return res.status(403).json({
                    success: false,
                    message: 'Chỉ quản trị viên có thể tạo tài khoản quản trị'
                });
            }
            try {
                const AdminModel = (await import('../models/Admin.js')).default;
                await new AdminModel({ user_id: newUser._id }).save();
            } catch {}
        }

        const userResponse = newUser.toObject();
        delete userResponse.password_hash;

        res.status(201).json({ 
            success: true,
            message: 'Tạo tài khoản thành công!', 
            data: userResponse 
        });
    } catch (error) {
        console.error("Error creating user:", error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            if (field === 'username') {
                return res.status(400).json({ 
                    success: false,
                    message: 'Tên đăng nhập đã tồn tại!' 
                });
            }
            return res.status(400).json({ 
                success: false,
                message: 'Dữ liệu đã tồn tại trong hệ thống!' 
            });
        }
        res.status(500).json({ 
            success: false,
            message: "Lỗi server khi tạo tài khoản", 
            error: error.message 
        });
    }
}

// Kiểm tra tên đăng nhập tồn tại
export const checkUsernameExists = async (req, res) => {
    try {
        const { username } = req.params;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập không được để trống'
            });
        }

        const user = await User.findOne({ username });
        
        res.status(200).json({
            success: true,
            exists: !!user
        });
    } catch (error) {
        console.error('Error checking username:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi kiểm tra tên đăng nhập',
            error: error.message
        });
    }
};

// Cập nhật user
export const updateUser = async (req, res) => {
    const userId = req.params.id;
    const currentUserId = req.user._id.toString();
    
    try {
        const userToUpdate = await User.findById(userId);
        if (!userToUpdate) {
            return res.status(404).json({ 
                success: false,
                message: "Không tìm thấy người dùng" 
            });
        }

        // Kiểm tra quyền:
        // - Admin: cập nhật tất cả
        // - Chính chủ: được phép
        // - Lễ tân: chỉ được cập nhật thông tin của người dùng có role 'patient'
        const isAdmin = req.user.role === 'admin';
        const isSelf = userId === currentUserId;
        const isReceptionistUpdatingPatient = req.user.role === 'receptionist' && userToUpdate.role === 'patient';

        if (!(isAdmin || isSelf || isReceptionistUpdatingPatient)) {
            return res.status(403).json({ 
                success: false,
                message: 'Bạn không có quyền cập nhật người dùng này' 
            });
        }

        const { password_hash, role, username, ...allowedUpdates } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            allowedUpdates, 
            { new: true, runValidators: true }
        ).select('-password_hash');

        res.status(200).json({ 
            success: true,
            message: "Cập nhật thông tin thành công",
            data: updatedUser 
        });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ 
            success: false,
            message: "Lỗi cập nhật thông tin người dùng", 
            error: error.message 
        });
    }
}

// Xóa user
export const deleteUser = async (req, res) => {
    const userId = req.params.id;
    try {
        await User.findByIdAndDelete(userId);
        res.status(200).json({ message: `User with ID ${userId} deleted` });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Error deleting user", error });
    }
};

// Đặt lại mật khẩu
export const resetPassword = async (req, res) => {
    try {
        const { username, emailOrPhone, newPassword } = req.body;
        
        console.log('Reset password request:', {
            username,
            emailOrPhone,
            newPasswordLength: newPassword ? newPassword.length : 0
        });
        
        if (!username || !emailOrPhone || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu phải có ít nhất 6 ký tự'
            });
        }

        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Tên tài khoản không tồn tại'
            });
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
        const isPhone = /^[0-9]{10,11}$/.test(emailOrPhone.replace(/\s/g, ''));
        
        let isValid = false;
        
        if (isEmail) {
            isValid = user.email === emailOrPhone;
        } else if (isPhone) {
            isValid = user.phone === emailOrPhone;
        }
        
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Email hoặc số điện thoại không khớp với tài khoản'
            });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await User.findByIdAndUpdate(user._id, { password_hash: hashedPassword });

        res.status(200).json({
            success: true,
            message: 'Mật khẩu đã được đặt lại thành công'
        });
        
    } catch (error) {
        console.error('Error resetting password:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đặt lại mật khẩu',
            error: error.message
        });
    }
};