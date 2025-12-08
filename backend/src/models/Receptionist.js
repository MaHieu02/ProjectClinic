import mongoose from 'mongoose';

const receptionistSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    collection: 'receptionists'
});

receptionistSchema.index({ user_id: 1 }, { unique: true });

receptionistSchema.virtual('user_info', {
    ref: 'User',
    localField: 'user_id',
    foreignField: '_id',
    justOne: true
});

receptionistSchema.set('toJSON', { virtuals: true });

const Receptionist = mongoose.model('Receptionist', receptionistSchema);

export default Receptionist;