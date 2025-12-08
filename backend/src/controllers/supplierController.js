import { Supplier } from '../models/index.js';

// Lấy danh sách tất cả nhà cung cấp
export const getAllSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ name: 1 });
        res.json({
            success: true,
            data: suppliers
        });
    } catch (error) {
        console.error('Error getting suppliers:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi lấy danh sách nhà cung cấp'
        });
    }
};

// Lấy danh sách nhà cung cấp đang hoạt động
export const getActiveSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.find({ is_active: true }).sort({ name: 1 });
        res.json({
            success: true,
            data: suppliers
        });
    } catch (error) {
        console.error('Error getting active suppliers:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi lấy danh sách nhà cung cấp'
        });
    }
};

// Lấy thông tin một nhà cung cấp
export const getSupplierById = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        
        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy nhà cung cấp'
            });
        }
        
        res.json({
            success: true,
            data: supplier
        });
    } catch (error) {
        console.error('Error getting supplier:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi lấy thông tin nhà cung cấp'
        });
    }
};

// Tạo nhà cung cấp mới
export const createSupplier = async (req, res) => {
    try {
        const { name, contact_person, phone, email, address } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Tên nhà cung cấp không được để trống'
            });
        }
        
        const existingSupplier = await Supplier.findOne({ name: name.trim() });
        if (existingSupplier) {
            return res.status(400).json({
                success: false,
                error: 'Tên nhà cung cấp đã tồn tại'
            });
        }
        
        const supplier = new Supplier({
            name: name.trim(),
            contact_person: contact_person?.trim() || '',
            phone: phone?.trim() || '',
            email: email?.trim() || '',
            address: address?.trim() || ''
        });
        
        await supplier.save();
        
        res.status(201).json({
            success: true,
            data: supplier
        });
    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi tạo nhà cung cấp'
        });
    }
};

// Cập nhật thông tin nhà cung cấp
export const updateSupplier = async (req, res) => {
    try {
        const { name, contact_person, phone, email, address, is_active } = req.body;
        
        const supplier = await Supplier.findById(req.params.id);
        
        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy nhà cung cấp'
            });
        }
        
        if (name && name.trim() !== supplier.name) {
            const existingSupplier = await Supplier.findOne({ 
                name: name.trim(),
                _id: { $ne: req.params.id }
            });
            if (existingSupplier) {
                return res.status(400).json({
                    success: false,
                    error: 'Tên nhà cung cấp đã tồn tại'
                });
            }
            supplier.name = name.trim();
        }
        
        if (contact_person !== undefined) supplier.contact_person = contact_person?.trim() || '';
        if (phone !== undefined) supplier.phone = phone?.trim() || '';
        if (email !== undefined) supplier.email = email?.trim() || '';
        if (address !== undefined) supplier.address = address?.trim() || '';
        
        if (is_active !== undefined && supplier.is_active !== is_active) {
            supplier.is_active = is_active;
            
            const { Medicine } = await import('../models/index.js');
            
            if (!is_active) {
                await Medicine.updateMany(
                    { supplier_id: req.params.id },
                    { $set: { is_active: false } }
                );
            }
        }
        
        await supplier.save();
        
        res.json({
            success: true,
            data: supplier
        });
    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi cập nhật nhà cung cấp'
        });
    }
};

// Xóa nhà cung cấp
export const deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        
        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy nhà cung cấp'
            });
        }
        
        await Supplier.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: 'Đã xóa nhà cung cấp thành công'
        });
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi xóa nhà cung cấp'
        });
    }
};

// Tìm kiếm nhà cung cấp
export const searchSuppliers = async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query || !query.trim()) {
            return res.json({
                success: true,
                data: []
            });
        }
        
        const suppliers = await Supplier.find({
            $or: [
                { name: { $regex: query.trim(), $options: 'i' } },
                { contact_person: { $regex: query.trim(), $options: 'i' } },
                { phone: { $regex: query.trim(), $options: 'i' } }
            ]
        }).sort({ name: 1 });
        
        res.json({
            success: true,
            data: suppliers
        });
    } catch (error) {
        console.error('Error searching suppliers:', error);
        res.status(500).json({
            success: false,
            error: 'Lỗi khi tìm kiếm nhà cung cấp'
        });
    }
};
