import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    collection: 'admins'
});

adminSchema.index({ user_id: 1 }, { unique: true });

adminSchema.set('toJSON', { virtuals: true });

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
