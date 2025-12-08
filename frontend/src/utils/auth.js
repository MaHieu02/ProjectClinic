// Quản lý token
export const getToken = () => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.error('Error getting token from storage:', error);
    return null;
  }
};

// Lưu token vào localStorage
export const setToken = (token) => {
  try {
    localStorage.setItem('token', token);
  } catch (error) {
    console.error('Error setting token to storage:', error);
  }
};

// Xóa token khỏi localStorage
export const removeToken = () => {
  try {
    localStorage.removeItem('token');
  } catch (error) {
    console.error('Error removing token from storage:', error);
  }
};

// Lấy thông tin người dùng từ localStorage
export const getCurrentUserFromStorage = () => {
  try {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error getting user from storage:', error);
    return null;
  }
};

// Lưu thông tin người dùng vào localStorage
export const setCurrentUserToStorage = (user) => {
  try {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } catch (error) {
    console.error('Error setting user to storage:', error);
  }
};

// Xóa thông tin người dùng khỏi localStorage
export const removeCurrentUserFromStorage = () => {
  try {
    localStorage.removeItem('currentUser');
  } catch (error) {
    console.error('Error removing user from storage:', error);
  }
};

// Kiểm tra người dùng đã đăng nhập chưa
export const isLoggedIn = () => {
  const user = getCurrentUserFromStorage();
  const token = getToken();
  return user !== null && token !== null;
};

// Kiểm tra người dùng có vai trò cụ thể không
export const hasRole = (role) => {
  const user = getCurrentUserFromStorage();
  return user && user.role === role;
};

// Lấy vai trò người dùng
export const getUserRole = () => {
  const user = getCurrentUserFromStorage();
  return user ? user.role : null;
};

// Bảo vệ route dựa trên vai trò
export const canAccessRoute = (requiredRole) => {
  if (!requiredRole) return true; 
  
  const user = getCurrentUserFromStorage();
  if (!user) return false;

  return user.role === requiredRole;
};

// Hàm điều hướng dựa trên vai trò
export const navigateByRole = (role) => {
  switch (role) {
    case 'patient':
      return '/patient';
    case 'doctor':
      return '/doctor';
    case 'receptionist':
      return '/receptionist';
    case 'admin':
      return '/admin';
    default:
      return '/login';
  }
};

// Hàm đăng xuất
export const logout = () => {
  removeCurrentUserFromStorage();
  removeToken();
  window.location.href = '/login';
};

// Gọi API được xác thực chung
export const authenticatedApiCall = async (endpoint, method = 'GET', body = null) => {
  const API_BASE_URL = 'http://localhost:5000/api';
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`[API] ${method} ${url}`);
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`[API Error] ${method} ${url}:`, data);
      
      if (response.status === 401) {
        removeToken();
        removeCurrentUserFromStorage();
        return {
          success: false,
          error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        };
      }
      
      return {
        success: false,
        error: data.message || `HTTP error! status: ${response.status}`
      };
    }

    console.log(`[API Success] ${method} ${url}:`, data);
    return data;
  } catch (error) {
    console.error(`[API Network Error] ${method} ${url}:`, error);
    
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      return {
        success: false,
        error: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Có lỗi xảy ra khi kết nối với server'
    };
  }
};

// Làm mới thông tin người dùng từ server và đồng bộ vào localStorage
export const refreshCurrentUserFromServer = async () => {
  try {
    const res = await authenticatedApiCall('/auth/me', 'GET');
    if (res?.success && res?.user) {
      const u = res.user;
      const normalized = { ...u };
      if (!normalized.id && normalized._id) normalized.id = normalized._id;
      setCurrentUserToStorage(normalized);
      return { success: true, user: normalized };
    }
    return { success: false, error: res?.error || 'Không thể tải người dùng' };
  } catch (e) {
    return { success: false, error: e?.message || 'Lỗi khi làm mới thông tin người dùng' };
  }
};