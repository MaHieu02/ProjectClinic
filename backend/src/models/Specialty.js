import mongoose from 'mongoose';

const specialtySchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
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
    collection: 'specialties'
});

specialtySchema.index({ code: 1 }, { unique: true });
specialtySchema.index({ name: 1 });
specialtySchema.index({ is_active: 1 });

const Specialty = mongoose.model('Specialty', specialtySchema);

export default Specialty;
