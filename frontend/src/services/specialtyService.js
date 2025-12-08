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

// Lấy tất cả chuyên khoa
export const getAllSpecialties = async () => {
  try {
    const result = await authenticatedApiCall('/specialties');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading specialties:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy các chuyên khoa đang hoạt động
export const getActiveSpecialties = async () => {
  try {
    const result = await authenticatedApiCall('/specialties/active');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading active specialties:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy chuyên khoa theo ID
export const getSpecialtyById = async (specialtyId) => {
  try {
    const result = await authenticatedApiCall(`/specialties/${specialtyId}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading specialty by ID:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Tạo chuyên khoa mới
export const createSpecialty = async (specialtyData) => {
  try {
    const result = await authenticatedApiCall('/specialties', {
      method: 'POST',
      body: JSON.stringify(specialtyData)
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error creating specialty:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Cập nhật chuyên khoa
export const updateSpecialty = async (specialtyId, specialtyData) => {
  try {
    const result = await authenticatedApiCall(`/specialties/${specialtyId}`, {
      method: 'PUT',
      body: JSON.stringify(specialtyData)
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error updating specialty:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Tìm kiếm chuyên khoa
export const searchSpecialties = async (query, includeInactive = true) => {
  try {
    const params = new URLSearchParams({
      query,
      include_inactive: includeInactive.toString()
    });
    const result = await authenticatedApiCall(`/specialties/search?${params.toString()}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error searching specialties:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Vô hiệu hóa chuyên khoa
export const deactivateSpecialty = async (specialtyId) => {
  try {
    const result = await authenticatedApiCall(`/specialties/${specialtyId}/deactivate`, {
      method: 'PUT'
    });
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    console.error("Error deactivating specialty:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Kích hoạt lại chuyên khoa
export const reactivateSpecialty = async (specialtyId) => {
  try {
    const result = await authenticatedApiCall(`/specialties/${specialtyId}/reactivate`, {
      method: 'PUT'
    });
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    console.error("Error reactivating specialty:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Xóa chuyên khoa
export const deleteSpecialty = async (specialtyId) => {
  try {
    const result = await authenticatedApiCall(`/specialties/${specialtyId}`, {
      method: 'DELETE'
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error deleting specialty:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};
