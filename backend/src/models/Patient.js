import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true,
    collection: 'patients'
});

patientSchema.index({ user_id: 1 }, { unique: true });

patientSchema.virtual('user_info', {
    ref: 'User',
    localField: 'user_id',
    foreignField: '_id',
    justOne: true
});

patientSchema.set('toJSON', { virtuals: true });

const Patient = mongoose.model('Patient', patientSchema);

export default Patient;