import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb+srv://21021657_db_user:WMaZqhLVUGFvkV2e@cluster0.eakevew.mongodb.net/dev?retryWrites=true&w=majority&appName=Cluster0');
        console.log("MongoDB connected");
        
        // Sync indexes với schema mới
        await syncIndexes();
        
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
}

const syncIndexes = async () => {
    try {
        console.log("Đang đồng bộ indexes với CSDL...");
        
        // Import tất cả models để trigger index creation
        const User = (await import('../models/User.js')).default;
        const Admin = (await import('../models/Admin.js')).default;
        const Patient = (await import('../models/Patient.js')).default;
        const Doctor = (await import('../models/Doctor.js')).default;
        const Receptionist = (await import('../models/Receptionist.js')).default;
        const Appointment = (await import('../models/Appointment.js')).default;
        const MedicalRecord = (await import('../models/MedicalRecord.js')).default;
        const Medicine = (await import('../models/Medicine.js')).default;
        const Supplier = (await import('../models/Supplier.js')).default;
        const Specialty = (await import('../models/Specialty.js')).default;
        const ExaminationFee = (await import('../models/ExaminationFee.js')).default;
        
        
        // Sync indexes cho tất cả models
        await Promise.all([
            User.syncIndexes(),
            Admin.syncIndexes(),
            Patient.syncIndexes(),
            Doctor.syncIndexes(),
            Receptionist.syncIndexes(),
            Appointment.syncIndexes(),
            MedicalRecord.syncIndexes(),
            Medicine.syncIndexes(),
            Supplier.syncIndexes(),
            Specialty.syncIndexes(),
            ExaminationFee.syncIndexes()
        ]);
        
        console.log("✅ Đồng bộ indexes thành công");
    } catch (error) {
        console.warn("⚠️ Lỗi khi đồng bộ indexes:", error.message);
    }
}

export default connectDB;