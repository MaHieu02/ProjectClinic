import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    contact_person: {
        type: String,
        trim: true,
        default: ''
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    address: {
        type: String,
        trim: true,
        default: ''
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    collection: 'suppliers'
});

supplierSchema.index({ name: 1 }, { unique: true });
supplierSchema.index({ name: 'text' });

supplierSchema.pre('save', async function(next) {
    if (this.isModified('is_active') && this.is_active === false) {
        const Medicine = mongoose.model('Medicine');
        await Medicine.deactivateBySupplier(this._id);
    }
    next();
});

supplierSchema.post('findOneAndUpdate', async function(doc) {
    if (doc && doc.is_active === false) {
        const Medicine = mongoose.model('Medicine');
        await Medicine.deactivateBySupplier(doc._id);
    }
});

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;
