import { User, Patient, Doctor, Receptionist } from "../models/index.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserResponse } from '../middleware/auth.js';


const JWT_SECRET = 'clinic_management_jwt_secret_key_2025_secure_token';

// Đăng nhập người dùng
export const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                message: "Tên đăng nhập và mật khẩu không được để trống" 
            });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: "Tên đăng nhập hoặc mật khẩu không đúng" 
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false,
                message: "Tên đăng nhập hoặc mật khẩu không đúng" 
            });
        }

        if (['doctor', 'receptionist'].includes(user.role) && user.employment_status === false) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản đã nghỉ việc. Vui lòng liên hệ quản trị để được hỗ trợ.'
            });
        }

        let roleInfo = null;
        switch (user.role) {
            case 'patient':
                roleInfo = await Patient.findOne({ user_id: user._id });
                break;
            case 'doctor':
                roleInfo = await Doctor.findOne({ user_id: user._id });
                break;
            case 'receptionist':
                roleInfo = await Receptionist.findOne({ user_id: user._id });
                break;
        }

        const token = jwt.sign(
            { 
                userId: user._id,
                username: user.username,
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const userResponse = {
            id: user._id,
            username: user.username,
            full_name: user.full_name,
            email: user.email,
            phone: user.phone,
            dob: user.dob,
            gender: user.gender,
            address: user.address,
            role: user.role,
            employment_status: user.employment_status,
            roleInfo: roleInfo,
            ...(user.role === 'doctor' && { doctor_id: roleInfo }),
            ...(user.role === 'patient' && { patient_id: roleInfo }),
            ...(user.role === 'receptionist' && { receptionist_id: roleInfo }),
            createdAt: user.createdAt
        };

        res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            user: userResponse,
            token: token
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ 
            success: false,
            message: "Lỗi server khi đăng nhập", 
            error: error.message 
        });
    }
};

// Lấy thông tin người dùng hiện tại
export const getCurrentUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Chưa xác thực người dùng"
            });
        }

        let roleInfo = null;
        switch (req.user.role) {
            case 'patient':
                roleInfo = await Patient.findOne({ user_id: req.user._id });
                break;
            case 'doctor':
                roleInfo = await Doctor.findOne({ user_id: req.user._id });
                break;
            case 'receptionist':
                roleInfo = await Receptionist.findOne({ user_id: req.user._id });
                break;
        }

        const userResponse = getUserResponse(req.user);
        userResponse.roleInfo = roleInfo;

        res.status(200).json({
            success: true,
            message: "Lấy thông tin người dùng thành công",
            user: userResponse
        });
    } catch (error) {
        console.error("Get current user error:", error);
        res.status(500).json({ 
            success: false,
            message: "Lỗi server khi lấy thông tin người dùng", 
            error: error.message 
        });
    }
};

// Đăng xuất người dùng
export const logoutUser = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: "Đăng xuất thành công"
        });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ 
            success: false,
            message: "Lỗi server khi đăng xuất", 
            error: error.message 
        });
    }
};

// Thay đổi mật khẩu người dùng
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu hiện tại và mật khẩu mới không được để trống"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu mới phải có ít nhất 6 ký tự"
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
            });
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu hiện tại không đúng"
            });
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: "Mật khẩu mới phải khác mật khẩu hiện tại"
            });
        }

        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        await User.findByIdAndUpdate(userId, { 
            password_hash: hashedNewPassword 
        });

        res.status(200).json({
            success: true,
            message: "Thay đổi mật khẩu thành công"
        });

    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi thay đổi mật khẩu",
            error: error.message
        });
    }
};