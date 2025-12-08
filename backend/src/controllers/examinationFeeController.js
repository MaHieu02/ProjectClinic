import { ExaminationFee } from '../models/index.js';

// Lấy danh sách tất cả giá khám bệnh
export const getAllExaminationFees = async (req, res) => {
    try {
        const { specialty_id } = req.query;
        
        const query = {};
        if (specialty_id) {
            query.specialty_id = specialty_id;
        }
        
        const fees = await ExaminationFee.find(query)
            .populate('specialty_id', 'name code description')
            .sort({ examination_type: 1 });
        res.json({
            success: true,
            data: fees
        });
    } catch (error) {
        console.error('Error getting examination fees:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi lấy danh sách giá khám bệnh'
        });
    }
};

// Lấy danh sách giá khám đang hoạt động
export const getActiveExaminationFees = async (req, res) => {
    try {
        const { specialty_id } = req.query;
        
        const query = { is_active: true };
        if (specialty_id) {
            query.specialty_id = specialty_id;
        }
        
        const fees = await ExaminationFee.find(query)
            .populate('specialty_id', 'name code description')
            .sort({ examination_type: 1 });
        res.json({
            success: true,
            data: fees
        });
    } catch (error) {
        console.error('Error getting active examination fees:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi lấy danh sách giá khám bệnh'
        });
    }
};

// Lấy thông tin một loại giá khám
export const getExaminationFeeById = async (req, res) => {
    try {
        const fee = await ExaminationFee.findById(req.params.id)
            .populate('specialty_id', 'name code description');
        
        if (!fee) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy loại hình khám'
            });
        }
        
        res.json({
            success: true,
            data: fee
        });
    } catch (error) {
        console.error('Error getting examination fee:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi lấy thông tin giá khám'
        });
    }
};

// Tạo loại giá khám mới
export const createExaminationFee = async (req, res) => {
    try {
        const { examination_type, fee, description, specialty_id } = req.body;
        
        if (!examination_type || !examination_type.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Loại hình khám không được để trống'
            });
        }
        
        if (fee === undefined || fee < 0) {
            return res.status(400).json({
                success: false,
                error: 'Giá khám không hợp lệ'
            });
        }
        const existingFee = await ExaminationFee.findOne({ examination_type: examination_type.trim() });
        if (existingFee) {
            return res.status(400).json({
                success: false,
                error: 'Loại hình khám đã tồn tại'
            });
        }
        const examinationFee = new ExaminationFee({
            examination_type: examination_type.trim(),
            fee: fee,
            description: description?.trim() || '',
            specialty_id: specialty_id || null
        });
        
        await examinationFee.save();
        
        res.status(201).json({
            success: true,
            data: examinationFee
        });
    } catch (error) {
        console.error('Error creating examination fee:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi tạo giá khám bệnh'
        });
    }
};

// Cập nhật giá khám
export const updateExaminationFee = async (req, res) => {
    try {
        const { examination_type, fee, description, is_active, specialty_id } = req.body;
        
        const examinationFee = await ExaminationFee.findById(req.params.id);
        
        if (!examinationFee) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy loại hình khám'
            });
        }
        if (examination_type && examination_type.trim() !== examinationFee.examination_type) {
            const existingFee = await ExaminationFee.findOne({ 
                examination_type: examination_type.trim(),
                _id: { $ne: req.params.id }
            });
            if (existingFee) {
                return res.status(400).json({
                    success: false,
                    error: 'Loại hình khám đã tồn tại'
                });
            }
            examinationFee.examination_type = examination_type.trim();
        }
        
        if (fee !== undefined && fee >= 0) examinationFee.fee = fee;
        if (description !== undefined) examinationFee.description = description?.trim() || '';
        if (is_active !== undefined) examinationFee.is_active = is_active;
        if (specialty_id !== undefined) examinationFee.specialty_id = specialty_id || null;
        
        await examinationFee.save();
        
        res.json({
            success: true,
            data: examinationFee
        });
    } catch (error) {
        console.error('Error updating examination fee:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi cập nhật giá khám'
        });
    }
};

// Vô hiệu hóa dịch vụ khám
export const deactivateExaminationFee = async (req, res) => {
    try {
        const fee = await ExaminationFee.findById(req.params.id);
        
        if (!fee) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy loại hình khám'
            });
        }
        
        fee.is_active = false;
        await fee.save();
        
        res.json({
            success: true,
            message: 'Đã vô hiệu hóa dịch vụ khám thành công',
            data: fee
        });
    } catch (error) {
        console.error('Error deactivating examination fee:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi vô hiệu hóa dịch vụ khám'
        });
    }
};

// Kích hoạt lại dịch vụ khám
export const reactivateExaminationFee = async (req, res) => {
    try {
        const fee = await ExaminationFee.findById(req.params.id);
        
        if (!fee) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy loại hình khám'
            });
        }
        
        fee.is_active = true;
        await fee.save();
        
        res.json({
            success: true,
            message: 'Đã kích hoạt lại dịch vụ khám thành công',
            data: fee
        });
    } catch (error) {
        console.error('Error reactivating examination fee:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi kích hoạt lại dịch vụ khám'
        });
    }
};

// Tìm kiếm dịch vụ khám
export const searchExaminationFees = async (req, res) => {
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
                { examination_type: searchRegex },
                { description: searchRegex }
            ]
        };
        
        if (include_inactive !== 'true') {
            filter.is_active = true;
        }
        
        const fees = await ExaminationFee.find(filter)
            .populate('specialty_id', 'name code description')
            .sort({ examination_type: 1 });
        
        res.json({
            success: true,
            data: fees
        });
    } catch (error) {
        console.error('Error searching examination fees:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi tìm kiếm dịch vụ khám'
        });
    }
};

// Xóa dịch vụ khám
export const deleteExaminationFee = async (req, res) => {
    try {
        const fee = await ExaminationFee.findById(req.params.id);
        
        if (!fee) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy loại hình khám'
            });
        }
        
        await ExaminationFee.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: 'Đã xóa dịch vụ khám thành công'
        });
    } catch (error) {
        console.error('Error deleting examination fee:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi xóa dịch vụ khám'
        });
    }
};
