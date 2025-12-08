import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
    user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        busy_time: {
            type: Date,
            default: null
        },
        specialty_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Specialty',
            required: true
        },
        is_active: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
        collection: 'doctors'
    }
);

doctorSchema.index({ user_id: 1 }, { unique: true });
doctorSchema.index({ specialty_id: 1 });
doctorSchema.index({ is_active: 1 });

doctorSchema.virtual('user_info', {
    ref: 'User',
    localField: 'user_id',
    foreignField: '_id',
    justOne: true
});

doctorSchema.set('toJSON', { virtuals: true });

const Doctor = mongoose.model('Doctor', doctorSchema);

export default Doctor;