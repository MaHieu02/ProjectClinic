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

// Lấy lịch khám theo ngày
export const getAppointmentsByDate = async (date) => {
  try {
    const result = await authenticatedApiCall(`/appointments/date/${date}`);
    console.log("Appointments API response:", result);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading appointments by date:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy tất cả lịch khám với phân trang
export const getAllAppointments = async (page = 1, limit = 20) => {
  try {
    const result = await authenticatedApiCall(`/appointments?page=${page}&limit=${limit}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading appointments:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Cập nhật trạng thái lịch khám
export const updateAppointmentStatus = async (appointmentId, newStatus, additionalData = {}) => {
  try {
    const result = await authenticatedApiCall(`/appointments/${appointmentId}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        status: newStatus,
        ...additionalData
      })
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error updating appointment status:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Cập nhật lịch khám
export const updateAppointment = async (appointmentId, appointmentData) => {
  try {
    const result = await authenticatedApiCall(`/appointments/${appointmentId}`, {
      method: 'PUT',
      body: JSON.stringify(appointmentData)
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error updating appointment:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Hủy lịch khám
export const cancelAppointment = async (appointmentId, reason = '') => {
  try {
    const result = await authenticatedApiCall(`/appointments/${appointmentId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Hoàn thành lịch khám
export const completeAppointment = async (appointmentId, notes = '') => {
  try {
    const result = await authenticatedApiCall(`/appointments/${appointmentId}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ notes })
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error completing appointment:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Tạo lịch khám mới
export const createAppointment = async (appointmentData) => {
  try {
    const result = await authenticatedApiCall('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData)
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error creating appointment:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy báo cáo thu nhập
export const getIncomeReport = async (startDate, endDate) => {
  try {
    const result = await authenticatedApiCall(`/appointments/report/income?startDate=${startDate}&endDate=${endDate}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error getting income report:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};