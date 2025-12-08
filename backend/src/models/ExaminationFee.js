import mongoose from 'mongoose';

const examinationFeeSchema = new mongoose.Schema({
    examination_type: {
        type: String,
        required: true,
        trim: true
    },
    specialty_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Specialty',
        default: null
    },
    fee: {
        type: Number,
        required: true,
        min: 0,
        default: 0
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
    collection: 'examination_fees'
});

examinationFeeSchema.index({ examination_type: 1 }, { unique: true });
examinationFeeSchema.index({ is_active: 1 });

const ExaminationFee = mongoose.model('ExaminationFee', examinationFeeSchema);

export default ExaminationFee;
