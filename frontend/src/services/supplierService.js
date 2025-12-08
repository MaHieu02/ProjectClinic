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

// Lấy tất cả nhà cung cấp
export const getAllSuppliers = async () => {
  try {
    const result = await authenticatedApiCall('/suppliers');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading suppliers:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy các nhà cung cấp đang hoạt động
export const getActiveSuppliers = async () => {
  try {
    const result = await authenticatedApiCall('/suppliers/active');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading active suppliers:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Tìm kiếm nhà cung cấp
export const searchSuppliers = async (searchTerm) => {
  try {
    const result = await authenticatedApiCall(`/suppliers/search?query=${encodeURIComponent(searchTerm)}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error searching suppliers:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Lấy nhà cung cấp theo ID
export const getSupplierById = async (supplierId) => {
  try {
    const result = await authenticatedApiCall(`/suppliers/${supplierId}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error loading supplier by ID:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Tạo nhà cung cấp mới
export const createSupplier = async (supplierData) => {
  try {
    const result = await authenticatedApiCall('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData)
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error creating supplier:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Cập nhật nhà cung cấp
export const updateSupplier = async (supplierId, supplierData) => {
  try {
    const result = await authenticatedApiCall(`/suppliers/${supplierId}`, {
      method: 'PUT',
      body: JSON.stringify(supplierData)
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error updating supplier:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};

// Xóa nhà cung cấp
export const deleteSupplier = async (supplierId) => {
  try {
    const result = await authenticatedApiCall(`/suppliers/${supplierId}`, {
      method: 'DELETE'
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
};
