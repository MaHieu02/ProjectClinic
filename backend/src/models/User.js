import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 50,
        minlength: 3
    },
    password_hash: {
        type: String,
        required: true,
        maxlength: 255,
        minlength: 4,
        trim: true
    },
    full_name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    phone: {
        type: String,
        trim: true,
        default: null,
        maxlength: [11],
        match: /^0[0-9]{9,11}$/
    },
    email: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
        lowercase: true,
        match: /.+@.+\..+/
    },
    dob: {
        type: Date,
        default: null
    },
    gender: {
        type: String,
        enum: {
            values: ['male', 'female']
        },
        default: 'male'
    },
    address: {
        type: String,
        trim: true,
        maxlength: 255,
        default: null
    },
    role: {
        type: String,
        enum: ['patient', 'doctor', 'receptionist', 'admin'],
        required: true,
        default: 'patient'
    },
    employment_status: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    collection: 'users'
});

userSchema.index({ role: 1, employment_status: 1 });

const User = mongoose.model("User", userSchema);

export default User;
