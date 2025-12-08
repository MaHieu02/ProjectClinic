import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
    drug_name: {
        type: String,
        required: true,
        trim: true
    },
    unit: {
        type: String,
        required: true,
        trim: true,
        enum: {
            values: ['viên', 'vỉ', 'lọ', 'ml', 'mg', 'g', 'kg', 'tuýp', 'gói', 'chai', 'hộp', 'ống', 'viên nang', 'viên sủi', 'viên nén', 'khác'],
        },
        default: 'viên'
    },
    stock_quantity: {
        type: Number,
        required: true,
        default: 0
    },
    initial_quantity: {
        type: Number,
        required: true,
        default: 0
    },
    price: {
        type: Number,
        required: true,
        default: 1
    },
    import_price: {
        type: Number,
        required: true,
        default: 0
    },
    supplier_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        default: null
    },
    expiry_date: {
        type: Date,
        required: true,
        validate: {
            validator: function(date) {
                return date > new Date();
            },
            message: 'Ngày hết hạn phải sau ngày hiện tại'
        }
    },
    is_active: {
        type: Boolean,
        default: true
    },
    payment_status: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'medicines'
});

medicineSchema.index({ drug_name: 1 }, { unique: true });
medicineSchema.index({ stock_quantity: 1 });
medicineSchema.index({ price: 1 });
medicineSchema.index({ expiry_date: 1 });
medicineSchema.index({ is_active: 1 });
medicineSchema.index({ drug_name: 'text' }); 

medicineSchema.pre('save', async function(next) {
    const now = new Date();
    if (this.expiry_date <= now) {
        this.is_active = false;
    }
    
    if (this.supplier_id) {
        const Supplier = mongoose.model('Supplier');
        const supplier = await Supplier.findById(this.supplier_id);
        if (supplier && supplier.is_active === false) {
            this.is_active = false;
        }
    }
    
    next();
});

medicineSchema.statics.updateExpiredMedicines = async function() {
    const now = new Date();
    const result = await this.updateMany(
        { 
            expiry_date: { $lte: now },
            is_active: true
        },
        { 
            $set: { is_active: false }
        }
    );
    return result;
};

medicineSchema.statics.deactivateBySupplier = async function(supplierId) {
    const result = await this.updateMany(
        { 
            supplier_id: supplierId,
            is_active: true
        },
        { 
            $set: { is_active: false }
        }
    );
    return result;
};

medicineSchema.set('toJSON', { virtuals: true });

const Medicine = mongoose.model('Medicine', medicineSchema);

export default Medicine;