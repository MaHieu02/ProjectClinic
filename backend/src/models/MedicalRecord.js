import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema({
    appointment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true
    },
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
    diagnosis: {
        type: String,
        required: true,
        trim: true
    },
    treatment: {
        type: String,
        required: true,
        trim: true
    },
    medications_prescribed: [{
        medicine_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Medicine',
            required: true
        },
        medicine_name: {
            type: String,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        dosage: {
            type: String,
            required: true
        },
        frequency: {
            type: String,
            required: true
        },
        duration: {
            type: String,
            required: true
        },
        instructions: {
            type: String,
            trim: true
        }
    }],
    follow_up_recommendations: {
        type: String,
        trim: true,
        default: null
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    symptoms: {
        type: String,
        trim: true,
        default: null
    },
    total_cost: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: {
            values: ['draft', 'completed', 'dispensed']
        },
        default: 'completed'
    }
}, {
    timestamps: true,
    collection: 'medical_records'
});

medicalRecordSchema.index({ appointment_id: 1 }, { unique: true });
medicalRecordSchema.index({ patient_id: 1 });
medicalRecordSchema.index({ doctor_id: 1 });
medicalRecordSchema.index({ patient_id: 1, createdAt: -1 });
medicalRecordSchema.index({ status: 1 });


medicalRecordSchema.virtual('appointment_info', {
    ref: 'Appointment',
    localField: 'appointment_id',
    foreignField: '_id',
    justOne: true
});

medicalRecordSchema.virtual('patient_info', {
    ref: 'Patient',
    localField: 'patient_id',
    foreignField: '_id',
    justOne: true
});

medicalRecordSchema.virtual('doctor_info', {
    ref: 'Doctor',
    localField: 'doctor_id',
    foreignField: '_id',
    justOne: true
});

medicalRecordSchema.methods.calculateTotalCost = async function() {
    let total = 0;
    
    for (const med of this.medications_prescribed) {
        if (med.medicine_id) {
            const medicine = await mongoose.model('Medicine').findById(med.medicine_id);
            if (medicine) {
                total += medicine.price * med.quantity;
            }
        }
    }
    
    this.total_cost = total;
    return total;
};

medicalRecordSchema.pre('save', async function(next) {
    if (this.isModified('medications_prescribed')) {
        await this.calculateTotalCost();
    }
    next();
});

medicalRecordSchema.set('toJSON', { virtuals: true });

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

export default MedicalRecord;