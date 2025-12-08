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

// Lấy tất cả bác sĩ
export const getAllDoctors = async () => {
  try {
    const result = await authenticatedApiCall('/doctors');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading doctors:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy bác sĩ theo chuyên khoa
export const getDoctorsBySpecialty = async (specialtyId, includeInactive = false) => {
  try {
    const query = `/doctors?specialty_id=${encodeURIComponent(specialtyId)}${includeInactive ? '&include_inactive=true' : ''}`;
    const result = await authenticatedApiCall(query);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading doctors by specialty:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Tìm kiếm bác sĩ
export const searchDoctors = async (searchTerm, includeInactive = true) => {
  try {
    const query = `/doctors?search=${encodeURIComponent(searchTerm)}&limit=20${includeInactive ? '&include_inactive=true' : ''}`;
    const result = await authenticatedApiCall(query);
    const doctors = result.data?.doctors || [];
    
    return {
      success: result.success,
      data: doctors,
      error: result.error
    };
  } catch (error) {
    console.error("Error searching doctors:", error);
    return {
      success: false,
      data: [],
      error: error.message
    };
  }
};

// Lấy bác sĩ theo ID người dùng
export const getDoctorByUserId = async (userId) => {
  try {
    const result = await authenticatedApiCall(`/doctors/user/${userId}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading doctor by user ID:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Bật tắt trạng thái hoạt động của bác sĩ
export const toggleDoctorStatus = async (doctorId, isActive) => {
  try {
    const result = await authenticatedApiCall(`/doctors/${doctorId}/toggle-active`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive })
    });
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    console.error("Error toggling doctor status:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Xóa bác sĩ theo doctorId
export const deleteDoctor = async (doctorId) => {
  try {
    const result = await authenticatedApiCall(`/doctors/${doctorId}`, {
      method: 'DELETE'
    });
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    console.error("Error deleting doctor:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Kích hoạt lại bác sĩ
export const reactivateDoctor = async (doctorId) => {
  try {
    const result = await authenticatedApiCall(`/doctors/${doctorId}/reactivate`, {
      method: 'PUT'
    });
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    console.error("Error reactivating doctor:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};
