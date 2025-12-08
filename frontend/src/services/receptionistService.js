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

// Tìm kiếm lễ tân theo tên hoặc số điện thoại
export const searchReceptionists = async (searchTerm, includeInactive = true) => {
  try {
    const query = `/receptionists?search=${encodeURIComponent(searchTerm)}&limit=20${includeInactive ? '&include_inactive=true' : ''}`;
    const result = await authenticatedApiCall(query);
    const receptionists = result.data?.receptionists || [];

    return {
      success: result.success,
      data: receptionists,
      error: result.error
    };
  } catch (error) {
    console.error("Error searching receptionists:", error);
    return {
      success: false,
      data: [],
      error: error.message
    };
  }
};

// Lấy lễ tân theo user ID
export const getReceptionistByUserId = async (userId) => {
  try {
    const result = await authenticatedApiCall(`/receptionists/user/${userId}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading receptionist by user ID:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Xóa lễ tân theo receptionistId
export const deleteReceptionist = async (receptionistId) => {
  try {
    const result = await authenticatedApiCall(`/receptionists/${receptionistId}`, {
      method: 'DELETE'
    });
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    console.error("Error deleting receptionist:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Kích hoạt lại lễ tân
export const reactivateReceptionist = async (receptionistId) => {
  try {
    const result = await authenticatedApiCall(`/receptionists/${receptionistId}/reactivate`, {
      method: 'PUT'
    });
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    console.error("Error reactivating receptionist:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};
