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

// Tạo hồ sơ bệnh án mới
export const createMedicalRecord = async (medicalRecordData) => {
  try {
    const result = await authenticatedApiCall('/medical-records', {
      method: 'POST',
      body: JSON.stringify(medicalRecordData)
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error creating medical record:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy tất cả hồ sơ bệnh án
export const getAllMedicalRecords = async (page = 1, limit = 10, filters = {}) => {
  try {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    
    const result = await authenticatedApiCall(`/medical-records?${queryParams}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading medical records:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy hồ sơ bệnh án theo ID
export const getMedicalRecordById = async (recordId) => {
  try {
    const result = await authenticatedApiCall(`/medical-records/${recordId}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading medical record:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy hồ sơ bệnh án theo bệnh nhân
export const getMedicalRecordsByPatient = async (patientId, page = 1, limit = 10) => {
  try {
    console.log('Calling API for patientId:', patientId, 'page:', page, 'limit:', limit);
    const result = await authenticatedApiCall(
      `/medical-records/patient/${patientId}?page=${page}&limit=${limit}`
    );
    console.log('API response:', result);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading patient medical records:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Cập nhật hồ sơ bệnh án
export const updateMedicalRecord = async (recordId, updateData) => {
  try {
    const result = await authenticatedApiCall(`/medical-records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error updating medical record:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Xóa hồ sơ bệnh án
export const deleteMedicalRecord = async (recordId) => {
  try {
    const result = await authenticatedApiCall(`/medical-records/${recordId}`, {
      method: 'DELETE'
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error deleting medical record:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Tìm kiếm hồ sơ bệnh án theo chẩn đoán
export const searchMedicalRecordsByDiagnosis = async (diagnosis, page = 1, limit = 10) => {
  try {
    const result = await authenticatedApiCall(
      `/medical-records/search?diagnosis=${encodeURIComponent(diagnosis)}&page=${page}&limit=${limit}`
    );
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error searching medical records:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy hồ sơ bệnh án theo ID lịch khám
export const getMedicalRecordByAppointment = async (appointmentId) => {
  try {
    const result = await authenticatedApiCall(`/medical-records/appointment/${appointmentId}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading medical record by appointment:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Xuất đơn thuốc 
export const dispensePrescription = async (medicalRecordId) => {
  try {
    const result = await authenticatedApiCall(`/medical-records/${medicalRecordId}/dispense`, {
      method: 'POST'
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error dispensing prescription:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};