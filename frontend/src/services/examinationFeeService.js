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

// Lấy tất cả giá khám
export const getAllExaminationFees = async () => {
  try {
    const result = await authenticatedApiCall('/examination-fees');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading examination fees:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy các giá khám đang hoạt động
export const getActiveExaminationFees = async () => {
  try {
    const result = await authenticatedApiCall('/examination-fees/active');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading active examination fees:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy giá khám theo chuyên khoa
export const getExaminationFeesBySpecialty = async (specialtyId) => {
  try {
    const result = await authenticatedApiCall(`/examination-fees/active?specialty_id=${specialtyId}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading examination fees by specialty:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy giá khám theo ID
export const getExaminationFeeById = async (feeId) => {
  try {
    const result = await authenticatedApiCall(`/examination-fees/${feeId}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading examination fee by ID:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Tạo giá khám mới
export const createExaminationFee = async (feeData) => {
  try {
    const result = await authenticatedApiCall('/examination-fees', {
      method: 'POST',
      body: JSON.stringify(feeData)
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error creating examination fee:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Cập nhật giá khám
export const updateExaminationFee = async (feeId, feeData) => {
  try {
    const result = await authenticatedApiCall(`/examination-fees/${feeId}`, {
      method: 'PUT',
      body: JSON.stringify(feeData)
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error updating examination fee:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Tìm kiếm dịch vụ khám
export const searchExaminationFees = async (query, includeInactive = true) => {
  try {
    const params = new URLSearchParams({
      query,
      include_inactive: includeInactive.toString()
    });
    const result = await authenticatedApiCall(`/examination-fees/search?${params.toString()}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error searching examination fees:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Vô hiệu hóa dịch vụ khám
export const deactivateExaminationFee = async (feeId) => {
  try {
    const result = await authenticatedApiCall(`/examination-fees/${feeId}/deactivate`, {
      method: 'PUT'
    });
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    console.error("Error deactivating examination fee:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Kích hoạt lại dịch vụ khám
export const reactivateExaminationFee = async (feeId) => {
  try {
    const result = await authenticatedApiCall(`/examination-fees/${feeId}/reactivate`, {
      method: 'PUT'
    });
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    console.error("Error reactivating examination fee:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Xóa giá khám
export const deleteExaminationFee = async (feeId) => {
  try {
    const result = await authenticatedApiCall(`/examination-fees/${feeId}`, {
      method: 'DELETE'
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error deleting examination fee:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};
