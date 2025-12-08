import { Medicine, Supplier } from '../models/index.js';

// Tạo thuốc mới
export const createMedicine = async (req, res) => {
    try {
        const { drug_name, unit, stock_quantity, initial_quantity, price, import_price, supplier_id, expiry_date } = req.body;

        if (!drug_name || !unit || stock_quantity === undefined || !price || !expiry_date) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: drug_name, unit, stock_quantity, price, expiry_date'
            });
        }

        // Kiểm tra thuốc đã tồn tại chưa
        const existingMedicine = await Medicine.findOne({ drug_name });
        if (existingMedicine) {
            return res.status(400).json({
                success: false,
                message: 'Thuốc đã tồn tại trong hệ thống'
            });
        }

        if (supplier_id) {
            const supplier = await Supplier.findById(supplier_id);
            if (!supplier) {
                return res.status(400).json({
                    success: false,
                    message: 'Nhà cung cấp không tồn tại'
                });
            }
        }

        const medicine = new Medicine({
            drug_name,
            unit,
            stock_quantity,
            initial_quantity: initial_quantity || stock_quantity,
            price,
            import_price: import_price || 0,
            supplier_id: supplier_id || null,
            expiry_date
        });

        await medicine.save();
        await medicine.populate('supplier_id');

        res.status(201).json({
            success: true,
            message: 'Thêm thuốc mới thành công',
            data: medicine
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi thêm thuốc',
            error: error.message
        });
    }
};

// Lấy tất cả thuốc
export const getMedicines = async (req, res) => {
    try {
        await Medicine.updateExpiredMedicines();
        
        const { page = 1, limit = 20, search, unit, low_stock } = req.query;
        const skip = (page - 1) * limit;

        let query = {};

        if (search) {
            query.drug_name = { $regex: search, $options: 'i' };
        }

        if (unit) {
            query.unit = unit;
        }

        if (low_stock === 'true') {
            query.stock_quantity = { $lte: 10 }; // Tồn kho <= 10
        }

        const medicines = await Medicine.find(query)
            .populate('supplier_id')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ drug_name: 1 });

        const total = await Medicine.countDocuments(query);

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách thuốc thành công',
            data: {
                medicines,
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
            message: 'Lỗi server khi lấy danh sách thuốc',
            error: error.message
        });
    }
};

// Lấy thông tin thuốc theo ID
export const getMedicineById = async (req, res) => {
    try {
        const { id } = req.params;

        const medicine = await Medicine.findById(id).populate('supplier_id');

        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thuốc'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách thuốc thành công',
            data: medicines
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách thuốc',
            error: error.message
        });
    }
};

// Cập nhật trạng thái thuốc hết hạn
export const updateExpiredMedicines = async (req, res) => {
    try {
        const result = await Medicine.updateExpiredMedicines();
        
        res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái thuốc hết hạn thành công',
            data: {
                modifiedCount: result.modifiedCount
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật trạng thái thuốc',
            error: error.message
        });
    }
};

// Cập nhật thông tin thuốc
export const updateMedicine = async (req, res) => {
    try {
        const { id } = req.params;
        const { drug_name, unit, stock_quantity, initial_quantity, price, import_price, supplier_id, expiry_date, payment_status } = req.body;

        if (drug_name) {
            const existingMedicine = await Medicine.findOne({ 
                drug_name, 
                _id: { $ne: id } 
            });
            if (existingMedicine) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên thuốc đã tồn tại'
                });
            }
        }

        if (supplier_id) {
            const supplier = await Supplier.findById(supplier_id);
            if (!supplier) {
                return res.status(400).json({
                    success: false,
                    message: 'Nhà cung cấp không tồn tại'
                });
            }
        }

        const updateData = {};
        if (drug_name) updateData.drug_name = drug_name;
        if (unit) updateData.unit = unit;
        if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity;
        if (initial_quantity !== undefined) updateData.initial_quantity = initial_quantity;
        if (price !== undefined) updateData.price = price;
        if (import_price !== undefined) updateData.import_price = import_price;
        if (supplier_id !== undefined) updateData.supplier_id = supplier_id;
        if (expiry_date) updateData.expiry_date = expiry_date;
        if (payment_status !== undefined) updateData.payment_status = payment_status;

        const medicine = await Medicine.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('supplier_id');

        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thuốc'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin thuốc thành công',
            data: medicine
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật thuốc',
            error: error.message
        });
    }
};

// Xóa thuốc 
export const deleteMedicine = async (req, res) => {
    try {
        const { id } = req.params;

        const medicine = await Medicine.findByIdAndDelete(id);

        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thuốc'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Xóa thuốc thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa thuốc',
            error: error.message
        });
    }
};

// Cập nhật tồn kho
export const updateStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, operation } = req.body;

        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng phải lớn hơn 0'
            });
        }

        if (!['add', 'subtract'].includes(operation)) {
            return res.status(400).json({
                success: false,
                message: 'Thao tác phải là "add" hoặc "subtract"'
            });
        }

        const medicine = await Medicine.findById(id);
        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thuốc'
            });
        }

        if (operation === 'add') {
            medicine.stock_quantity += quantity;
        } else {
            if (medicine.stock_quantity < quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Số lượng tồn kho không đủ'
                });
            }
            medicine.stock_quantity -= quantity;
        }

        await medicine.save();

        res.status(200).json({
            success: true,
            message: `${operation === 'add' ? 'Nhập' : 'Xuất'} kho thành công`,
            data: medicine
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật tồn kho',
            error: error.message
        });
    }
};

// Lấy danh sách thuốc sắp hết
export const getLowStockMedicines = async (req, res) => {
    try {
        const lowStockMedicines = await Medicine.find({
            stock_quantity: { $lte: 10 }
        }).populate('supplier_id').sort({ stock_quantity: 1 });

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách thuốc sắp hết thành công',
            data: lowStockMedicines
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách thuốc sắp hết',
            error: error.message
        });
    }
};

// Tìm kiếm thuốc
export const searchMedicines = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập từ khóa tìm kiếm'
            });
        }

        const medicines = await Medicine.find({
            drug_name: { $regex: query, $options: 'i' }
        }).populate('supplier_id').limit(20);

        res.status(200).json({
            success: true,
            message: `Tìm kiếm thuốc với từ khóa "${query}" thành công`,
            data: medicines
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tìm kiếm thuốc',
            error: error.message
        });
    }
};

// Lấy thống kê thuốc
export const getMedicineStats = async (req, res) => {
    try {
        const totalMedicines = await Medicine.countDocuments();
        const lowStockCount = await Medicine.countDocuments({ 
            stock_quantity: { $lte: 10 }
        });
        const outOfStockCount = await Medicine.countDocuments({ 
            stock_quantity: 0
        });

        const aggregateResult = await Medicine.aggregate([
            { $group: { 
                _id: null, 
                total_value: { $sum: { $multiply: ['$stock_quantity', '$price'] } },
                total_quantity: { $sum: '$stock_quantity' }
            }}
        ]);

        const expiringSoonDate = new Date();
        expiringSoonDate.setDate(expiringSoonDate.getDate() + 60);
        
        const expiringSoonCount = await Medicine.countDocuments({
            expiry_date: { $lte: expiringSoonDate, $gt: new Date() }
        });

        res.status(200).json({
            success: true,
            message: 'Lấy thống kê thuốc thành công',
            data: {
                total_medicines: totalMedicines,
                low_stock_count: lowStockCount,
                out_of_stock_count: outOfStockCount,
                expiring_soon_count: expiringSoonCount,
                total_quantity: aggregateResult[0]?.total_quantity || 0,
                total_inventory_value: aggregateResult[0]?.total_value || 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê thuốc',
            error: error.message
        });
    }
};

// Lấy danh sách thuốc theo nhà cung cấp
export const getMedicinesBySupplier = async (req, res) => {
    try {
        const { supplierId } = req.params;

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhà cung cấp'
            });
        }

        const medicines = await Medicine.find({ supplier_id: supplierId })
            .populate('supplier_id')
            .sort({ drug_name: 1 });

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách thuốc thành công',
            data: medicines
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách thuốc',
            error: error.message
        });
    }
};