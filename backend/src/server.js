import express from 'express';
import apiRoutes from './routes/index.js';
import connectDB from './config/db.js';

import * as Models from './models/index.js';

const PORT = 5000;

const app = express();

// Middleware       
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    const allowedOrigin = '*';
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Kết nối với cơ sở dữ liệu và khởi tạo mô hình
const initializeServer = async () => {
    try {
        await connectDB();
        console.log('📚 All models loaded:', Object.keys(Models));
        
        app.use('/api', apiRoutes);
        
        app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                message: 'Clinic API Server is running',
                models: Object.keys(Models),
                timestamp: new Date().toISOString()
            });
        });

        app.use('*', (req, res) => {
            res.status(404).json({ 
                message: 'Route not found',
                availableRoutes: [
                    '/api/auth',
                    '/api/users', 
                    '/api/patients',
                    '/api/doctors',
                    '/api/receptionists',
                    '/api/admins',
                    '/api/appointments',
                    '/api/medicines',
                    '/api/medical-records',
                    '/api/health',
                    '/api/examination-fees',
                    '/api/suppliers',
                    '/api/specialties'
                ]
            });
        });

        app.listen(PORT, () => {
            console.log(`🚀 Server is running on localhost:${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
            console.log(`� Auth API: http://localhost:${PORT}/api/auth`);
            console.log(`�👥� Users API: http://localhost:${PORT}/api/users`);
            console.log(`🏥 Clinic Management APIs:`);
            console.log(`   - Patients: http://localhost:${PORT}/api/patients`);
            console.log(`   - Doctors: http://localhost:${PORT}/api/doctors`);
            console.log(`   - Receptionists: http://localhost:${PORT}/api/receptionists`);
            console.log(`   - Admins: http://localhost:${PORT}/api/admins`);
            console.log(`   - Appointments: http://localhost:${PORT}/api/appointments`);
            console.log(`   - Medicines: http://localhost:${PORT}/api/medicines`);
            console.log(`   - Medical Records: http://localhost:${PORT}/api/medical-records`);
            console.log(`   - Examination Fees: http://localhost:${PORT}/api/examination-fees`);
            console.log(`   - Suppliers: http://localhost:${PORT}/api/suppliers`);
            console.log(`   - Specialties: http://localhost:${PORT}/api/specialties`);
        });
        
    } catch (error) {
        console.error('❌ Failed to initialize server:', error);
        process.exit(1);
    }
};

initializeServer();