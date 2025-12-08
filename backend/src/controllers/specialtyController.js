import { Specialty } from '../models/index.js';

// Lấy danh sách tất cả chuyên khoa
export const getAllSpecialties = async (req, res) => {
    try {
        const specialties = await Specialty.find().sort({ name: 1 });
        res.json({
            success: true,
            data: specialties
        });
    } catch (error) {
        console.error('Error getting specialties:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi lấy danh sách chuyên khoa'
        });
    }
};

// Lấy danh sách chuyên khoa đang hoạt động
export const getActiveSpecialties = async (req, res) => {
    try {
        const specialties = await Specialty.find({ is_active: true }).sort({ name: 1 });
        res.json({
            success: true,
            data: specialties
        });
    } catch (error) {
        console.error('Error getting active specialties:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi lấy danh sách chuyên khoa'
        });
    }
};

// Lấy thông tin một chuyên khoa
export const getSpecialtyById = async (req, res) => {
    try {
        const specialty = await Specialty.findById(req.params.id);
        
        if (!specialty) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy chuyên khoa'
            });
        }
        
        res.json({
            success: true,
            data: specialty
        });
    } catch (error) {
        console.error('Error getting specialty:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi lấy thông tin chuyên khoa'
        });
    }
};

// Tạo chuyên khoa mới
export const createSpecialty = async (req, res) => {
    try {
        const { code, name, description } = req.body;
        
        if (!code || !code.trim() || !name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Mã và tên chuyên khoa không được để trống'
            });
        }
        
        const existingSpecialty = await Specialty.findOne({ code: code.trim().toLowerCase() });
        if (existingSpecialty) {
            return res.status(400).json({
                success: false,
                error: 'Mã chuyên khoa đã tồn tại'
            });
        }
        
        const specialty = new Specialty({
            code: code.trim().toLowerCase(),
            name: name.trim(),
            description: description?.trim() || ''
        });
        
        await specialty.save();
        
        res.status(201).json({
            success: true,
            data: specialty
        });
    } catch (error) {
        console.error('Error creating specialty:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi tạo chuyên khoa'
        });
    }
};

// Cập nhật chuyên khoa
export const updateSpecialty = async (req, res) => {
    try {
        const { code, name, description, is_active } = req.body;
        
        const specialty = await Specialty.findById(req.params.id);
        
        if (!specialty) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy chuyên khoa'
            });
        }
        
        if (code && code.trim().toLowerCase() !== specialty.code) {
            const existingSpecialty = await Specialty.findOne({ 
                code: code.trim().toLowerCase(),
                _id: { $ne: req.params.id }
            });
            if (existingSpecialty) {
                return res.status(400).json({
                    success: false,
                    error: 'Mã chuyên khoa đã tồn tại'
                });
            }
            specialty.code = code.trim().toLowerCase();
        }
        
        if (name) specialty.name = name.trim();
        if (description !== undefined) specialty.description = description?.trim() || '';
        if (is_active !== undefined) specialty.is_active = is_active;
        
        await specialty.save();
        
        res.json({
            success: true,
            data: specialty
        });
    } catch (error) {
        console.error('Error updating specialty:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi cập nhật chuyên khoa'
        });
    }
};

// Vô hiệu hóa chuyên khoa
export const deactivateSpecialty = async (req, res) => {
    try {
        const specialty = await Specialty.findById(req.params.id);
        
        if (!specialty) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy chuyên khoa'
            });
        }
        
        specialty.is_active = false;
        await specialty.save();
        
        res.json({
            success: true,
            message: 'Đã vô hiệu hóa chuyên khoa thành công',
            data: specialty
        });
    } catch (error) {
        console.error('Error deactivating specialty:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi vô hiệu hóa chuyên khoa'
        });
    }
};

// Kích hoạt lại chuyên khoa
export const reactivateSpecialty = async (req, res) => {
    try {
        const specialty = await Specialty.findById(req.params.id);
        
        if (!specialty) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy chuyên khoa'
            });
        }
        
        specialty.is_active = true;
        await specialty.save();
        
        res.json({
            success: true,
            message: 'Đã kích hoạt lại chuyên khoa thành công',
            data: specialty
        });
    } catch (error) {
        console.error('Error reactivating specialty:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi kích hoạt lại chuyên khoa'
        });
    }
};

// Tìm kiếm chuyên khoa
export const searchSpecialties = async (req, res) => {
    try {
        const { query, include_inactive } = req.query;
        
        if (!query || !query.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Từ khóa tìm kiếm không được để trống'
            });
        }
        
        const searchRegex = new RegExp(query.trim(), 'i');
        const filter = {
            $or: [
                { code: searchRegex },
                { name: searchRegex },
                { description: searchRegex }
            ]
        };
        
        if (include_inactive !== 'true') {
            filter.is_active = true;
        }
        
        const specialties = await Specialty.find(filter).sort({ name: 1 });
        
        res.json({
            success: true,
            data: specialties
        });
    } catch (error) {
        console.error('Error searching specialties:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi tìm kiếm chuyên khoa'
        });
    }
};

// Xóa chuyên khoa
export const deleteSpecialty = async (req, res) => {
    try {
        const specialty = await Specialty.findById(req.params.id);
        
        if (!specialty) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy chuyên khoa'
            });
        }
        
        await Specialty.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: 'Đã xóa chuyên khoa thành công'
        });
    } catch (error) {
        console.error('Error deleting specialty:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi xóa chuyên khoa'
        });
    }
};
