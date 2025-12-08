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

// Tìm kiếm bệnh nhân theo tên, ID hoặc số điện thoại
export const searchPatients = async (searchTerm) => {
  try {
    const result = await authenticatedApiCall(`/patients?search=${encodeURIComponent(searchTerm)}&limit=20`);
    const patients = result.data?.patients || [];
    
    return {
      success: result.success,
      data: patients,
      error: result.error
    };
  } catch (error) {
    console.error("Error searching patients:", error);
    return {
      success: false,
      data: [],
      error: error.message
    };
  }
};

// Lấy bệnh nhân theo ID
export const getPatientById = async (patientId) => {
  try {
    const result = await authenticatedApiCall(`/patients/${patientId}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading patient:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy bệnh nhân theo ID người dùng
export const getPatientByUserId = async (userId) => {
  try {
    const result = await authenticatedApiCall(`/patients/user/${userId}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading patient by user ID:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Tạo bệnh nhân mới
export const createPatient = async (patientData) => {
  try {
    const result = await authenticatedApiCall('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData)
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error creating patient:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Cập nhật bệnh nhân
export const updatePatient = async (patientId, patientData) => {
  try {
    const result = await authenticatedApiCall(`/patients/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify(patientData)
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error updating patient:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy lịch khám của bệnh nhân
export const getPatientAppointments = async (patientId) => {
  try {
    const result = await authenticatedApiCall(`/patients/${patientId}/appointments`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading patient appointments:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};