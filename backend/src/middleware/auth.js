import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';


const JWT_SECRET = 'clinic_management_jwt_secret_key_2025_secure_token';

// Middleware xác thực token
export const authenticateToken = async (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1]; 

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token xác thực không được cung cấp'
        });
      }

      const decoded = jwt.verify(token, JWT_SECRET);
    
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token không hợp lệ - Người dùng không tồn tại'
        });
      }
      if (['doctor', 'receptionist'].includes(user.role) && user.employment_status === false) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã nghỉ việc. Quyền truy cập đã bị vô hiệu hoá.'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token không hợp lệ'
        });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token đã hết hạn'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Lỗi server khi xác thực',
          error: error.message
        });
      }
    }
};

// Middleware phân quyền theo role
export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Chưa xác thực người dùng'
        });
      }

      const userRole = req.user.role;
    
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Bạn không có quyền truy cập. Yêu cầu role: ${allowedRoles.join(', ')}, Role hiện tại: ${userRole}`
        });
      }

      next();
    };
};

// Alias cho authorize
export const authorizeRoles = authorize;

// Middleware kiểm tra quyền truy cập resource
export const checkResourceOwnership = (resourceField = 'user_id') => {
    return (req, res, next) => {
      const userId = req.user._id.toString();
      const resourceUserId = req.body[resourceField] || req.params[resourceField];

      if (req.user.role === 'admin') {
        return next();
      }

      if (req.user.role === 'doctor' && resourceField === 'patient_id') {
        return next();
      }

      if (resourceUserId && resourceUserId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn chỉ có thể truy cập dữ liệu của chính mình'
        });
      }

      next();
    };
};

// Middleware cho các route public 
export const optionalAuth = async (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (user) {
          req.user = user;
        }
      }
    
      next();
    } catch (error) {
      next();
    }
};

// Helper function để tạo response với thông tin user
export const getUserResponse = (user) => {
    const { password_hash, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword;
};