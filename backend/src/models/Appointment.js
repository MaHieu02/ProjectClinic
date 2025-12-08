import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
    patient_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    doctor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    appointment_time: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value > new Date();
            }
        }
    },
    status: {
        type: String,
        enum: {
            values: ['booked', 'checked', 'completed', 'cancelled', 'late']
        },
        default: 'booked'
    },
    symptoms: {
        type: String,
        required: false,
        trim: true,
        maxlength: 1000,
        default: ''
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    examination_fee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExaminationFee',
        default: null
    },
    examination_fee: {
        type: Number,
        default: 0
    },
    examination_type: {
        type: String,
        trim: true,
        default: ''
    },
    medical_record_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MedicalRecord',
        default: null
    },
    booked_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receptionist_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        validate: {
            validator: async function(value) {
                if (!value) return true;
                const User = mongoose.model('User');
                const user = await User.findById(value);
                return user && (user.role === 'admin' || user.role === 'receptionist');
            },
            message: 'Người đón tiếp phải là admin hoặc lễ tân'
        }
    },
    pharmacist_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        validate: {
            validator: async function(value) {
                if (!value) return true;
                const User = mongoose.model('User');
                const user = await User.findById(value);
                return user && (user.role === 'admin' || user.role === 'receptionist');
            },
            message: 'Người bán thuốc phải là admin hoặc lễ tân'
        }
    }
}, {
    timestamps: true,
    collection: 'appointments'
});

appointmentSchema.index({ patient_id: 1 });
appointmentSchema.index({ doctor_id: 1 });
appointmentSchema.index({ appointment_time: 1 });
appointmentSchema.index({ doctor_id: 1, appointment_time: 1 });
appointmentSchema.index({ examination_fee_id: 1 });
appointmentSchema.index({ medical_record_id: 1 });
appointmentSchema.index({ booked_by: 1 });
appointmentSchema.index({ receptionist_id: 1 });
appointmentSchema.index({ pharmacist_id: 1 });

appointmentSchema.virtual('patient_info', {
    ref: 'Patient',
    localField: 'patient_id',
    foreignField: '_id',
    justOne: true
});

appointmentSchema.virtual('doctor_info', {
    ref: 'Doctor',
    localField: 'doctor_id',
    foreignField: '_id',
    justOne: true
});

appointmentSchema.virtual('examination_fee_info', {
    ref: 'ExaminationFee',
    localField: 'examination_fee_id',
    foreignField: '_id',
    justOne: true
});

appointmentSchema.virtual('medical_record_info', {
    ref: 'MedicalRecord',
    localField: 'medical_record_id',
    foreignField: '_id',
    justOne: true
});

appointmentSchema.virtual('booked_by_info', {
    ref: 'User',
    localField: 'booked_by',
    foreignField: '_id',
    justOne: true
});

appointmentSchema.virtual('receptionist_info', {
    ref: 'User',
    localField: 'receptionist_id',
    foreignField: '_id',
    justOne: true
});

appointmentSchema.virtual('pharmacist_info', {
    ref: 'User',
    localField: 'pharmacist_id',
    foreignField: '_id',
    justOne: true
});

appointmentSchema.set('toJSON', { virtuals: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;