import { authenticatedApiCall } from '../utils/auth.js';

// Lấy tất cả thuốc với phân trang và lọc
export const getMedicines = async (page = 1, limit = 20, filters = {}) => {
  try {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });

    const result = await authenticatedApiCall(`/medicines?${queryParams}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error getting medicines:", error);
    return {
      success: false,
      error: error.message || "Có lỗi xảy ra khi tải danh sách thuốc"
    };
  }
};

// Tạo thuốc mới
export const createMedicine = async (medicineData) => {
  try {
    const result = await authenticatedApiCall('/medicines', 'POST', medicineData);
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    console.error("Error creating medicine:", error);
    return {
      success: false,
      error: error.message || "Có lỗi xảy ra khi thêm thuốc"
    };
  }
};

// Cập nhật thuốc
export const updateMedicine = async (medicineId, medicineData) => {
  try {
    const result = await authenticatedApiCall(`/medicines/${medicineId}`, 'PUT', medicineData);
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    console.error("Error updating medicine:", error);
    return {
      success: false,
      error: error.message || "Có lỗi xảy ra khi cập nhật thuốc"
    };
  }
};

// Xóa thuốc
export const deleteMedicine = async (medicineId) => {
  try {
    const result = await authenticatedApiCall(`/medicines/${medicineId}`, 'DELETE');
    return {
      success: result.success,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    console.error("Error deleting medicine:", error);
    return {
      success: false,
      error: error.message || "Có lỗi xảy ra khi xóa thuốc"
    };
  }
};

// Lấy thông tin thuốc theo ID
export const getMedicineById = async (medicineId) => {
  try {
    const result = await authenticatedApiCall(`/medicines/${medicineId}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error getting medicine by ID:", error);
    return {
      success: false,
      error: error.message || "Có lỗi xảy ra khi tải thông tin thuốc"
    };
  }
};

// Tìm kiếm thuốc
export const searchMedicines = async (query) => {
  try {
    const result = await authenticatedApiCall(`/medicines/search?query=${encodeURIComponent(query)}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error searching medicines:", error);
    return {
      success: false,
      error: error.message || "Có lỗi xảy ra khi tìm kiếm thuốc"
    };
  }
};

// Lấy thuốc sắp hết tồn kho
export const getLowStockMedicines = async () => {
  try {
    const result = await authenticatedApiCall('/medicines/low-stock');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error getting low stock medicines:", error);
    return {
      success: false,
      error: error.message || "Có lỗi xảy ra khi tải danh sách thuốc sắp hết"
    };
  }
};

// Lấy thống kê thuốc
export const getMedicineStats = async () => {
  try {
    const result = await authenticatedApiCall('/medicines/stats');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error getting medicine stats:", error);
    return {
      success: false,
      error: error.message || "Có lỗi xảy ra khi tải thống kê thuốc"
    };
  }
};

// Cập nhật tồn kho thuốc
export const updateMedicineStock = async (medicineId, quantity, operation) => {
  try {
    const result = await authenticatedApiCall(`/medicines/${medicineId}/stock`, 'PUT', {
      quantity,
      operation 
    });
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    console.error("Error updating medicine stock:", error);
    return {
      success: false,
      error: error.message || "Có lỗi xảy ra khi cập nhật tồn kho"
    };
  }
};

// Lấy thuốc sắp hết hạn (trong 90 ngày)
export const getExpiringMedicines = async (days = 90) => {
  try {
    const result = await getMedicines(1, 1000);
    if (result.success && result.data && result.data.medicines) {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      const expiringMedicines = result.data.medicines.filter(medicine => {
        const expiryDate = new Date(medicine.expiry_date);
        return expiryDate <= futureDate && expiryDate > today;
      });

      return {
        success: true,
        data: expiringMedicines
      };
    }
    return result;
  } catch (error) {
    console.error("Error getting expiring medicines:", error);
    return {
      success: false,
      error: error.message || "Có lỗi xảy ra khi tải danh sách thuốc sắp hết hạn"
    };
  }
};

// Lấy thuốc theo nhà cung cấp
export const getMedicinesBySupplier = async (supplierId) => {
  try {
    const result = await authenticatedApiCall(`/medicines/supplier/${supplierId}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    console.error("Error getting medicines by supplier:", error);
    return {
      success: false,
      error: error.message || "Có lỗi xảy ra khi tải danh sách thuốc của nhà cung cấp"
    };
  }
};

// Cập nhật trạng thái thanh toán thuốc
export const updatePaymentStatus = async (medicineId, paymentStatus) => {
  try {
    const result = await authenticatedApiCall(`/medicines/${medicineId}`, 'PUT', {
      payment_status: paymentStatus
    });
    return {
      success: result.success,
      data: result.data,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    console.error("Error updating payment status:", error);
    return {
      success: false,
      error: error.message || "Có lỗi xảy ra khi cập nhật trạng thái thanh toán"
    };
  }
};