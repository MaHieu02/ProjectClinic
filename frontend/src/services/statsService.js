import { apiCall } from '@/utils/api.js';
import { getToken } from '@/utils/auth.js';

// Gọi API được xác thực chung
const authenticatedApiCall = async (endpoint, options = {}) => {
  const token = getToken();
  if (!token) {
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const authOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  };

  return apiCall(endpoint, authOptions);
};

// Lấy thống kê dashboard của lễ tân
export const getReceptionistStats = async () => {
  try {
    const [appointmentResult, doctorResult, medicineStatsResult] = await Promise.all([
      authenticatedApiCall('/appointments'),
      authenticatedApiCall('/doctors'),
      authenticatedApiCall('/medicines/stats')
    ]);
    
    if (appointmentResult.success && doctorResult.success) {
      const today = new Date().toDateString();
      const appointments = appointmentResult.data?.appointments || [];
      const todayAppointments = appointments.filter(apt => 
        new Date(apt.appointment_time).toDateString() === today
      );
      
      const doctors = doctorResult.data?.doctors || [];
      const medicineStats = medicineStatsResult.success ? medicineStatsResult.data : null;
      
      return {
        success: true,
        data: {
          totalPatientsToday: todayAppointments.length,
          completedAppointments: todayAppointments.filter(apt => apt.status === 'completed').length,
          waitingAppointments: todayAppointments.filter(apt => apt.status === 'booked').length,
          inProgressAppointments: todayAppointments.filter(apt => apt.status === 'checked').length,
          totalDoctors: doctors.length,
          activeDoctors: doctors.filter(doctor => doctor.is_active).length,
          lowStockMedicines: medicineStats?.low_stock_count || 0,
          totalMedicines: medicineStats?.total_medicines || 0,
          outOfStockMedicines: medicineStats?.out_of_stock_count || 0,
          expiringSoonMedicines: medicineStats?.expiring_soon_count || 0,
          totalMedicineQuantity: medicineStats?.total_quantity || 0,
          totalInventoryValue: medicineStats?.total_inventory_value || 0
        }
      };
    } else {
      return {
        success: false,
        error: "Failed to load statistics"
      };
    }
  } catch (error) {
    console.error("Error loading receptionist stats:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy thống kê dashboard của bác sĩ
export const getDoctorStats = async (doctorId) => {
  try {
    const result = await authenticatedApiCall(`/appointments?doctor_id=${doctorId}`);
    
    if (result.success) {
      const appointments = result.data?.appointments || [];
      const today = new Date().toDateString();
      const todayAppointments = appointments.filter(apt => 
        new Date(apt.appointment_time).toDateString() === today
      );
      
      return {
        success: true,
        data: {
          totalAppointmentsToday: todayAppointments.length,
          completedToday: todayAppointments.filter(apt => apt.status === 'completed').length,
          waitingToday: todayAppointments.filter(apt => apt.status === 'booked').length,
          inProgressToday: todayAppointments.filter(apt => apt.status === 'checked').length,
          totalPatients: appointments.length
        }
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error("Error loading doctor stats:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy thống kê dashboard của bệnh nhân
export const getPatientStats = async (patientId) => {
  try {
    const result = await authenticatedApiCall(`/appointments?patient_id=${patientId}`);
    
    if (result.success) {
      const appointments = result.data?.appointments || [];
      
      return {
        success: true,
        data: {
          totalAppointments: appointments.length,
          completedAppointments: appointments.filter(apt => apt.status === 'completed').length,
          upcomingAppointments: appointments.filter(apt => 
            apt.status === 'booked' && new Date(apt.appointment_time) >= new Date()
          ).length
        }
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error("Error loading patient stats:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy thống kê dashboard chung
export const getDashboardStats = async () => {
  try {
    return await getReceptionistStats();
  } catch (error) {
    console.error("Error loading dashboard stats:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};