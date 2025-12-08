import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUserFromStorage, logout, refreshCurrentUserFromServer } from '@/utils/auth.js';
import { apiCall } from '@/utils/api.js';
import { getPatientByUserId as getPatientByUserIdSvc, updatePatient as updatePatientSvc } from '@/services/patientService';

const Setting = () => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('profile');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const [patientNotes, setPatientNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [originalPatientNotes, setOriginalPatientNotes] = useState('');

  // Dữ liệu người dùng từ backend
  const [userInfo, setUserInfo] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    dob: '',
    address: '',
    role: '',
    gender: 'male'
  });

  // Dữ liệu người dùng gốc để so sánh thay đổi
  const [originalUserInfo, setOriginalUserInfo] = useState({});

  // Tải dữ liệu người dùng khi component mount
  useEffect(() => {
    const loadUserData = async () => {
      const userFromStorage = getCurrentUserFromStorage();
      if (userFromStorage) {
        let activeUser = userFromStorage;
        try {
          const refreshed = await refreshCurrentUserFromServer();
          if (refreshed.success && refreshed.user) {
            activeUser = refreshed.user;
          }
        } catch (e) {
          console.warn('Refresh current user failed in Settings, fallback to storage user', e);
        }
        // Chuẩn hóa id và _id
        const normalizedUser = {
          ...activeUser,
          id: activeUser.id || activeUser._id,
          _id: activeUser._id || activeUser.id
        };

        setCurrentUser(normalizedUser);
        
        // Format ngày sinh
        let formattedDob = '';
        if (normalizedUser.dob) {
          try {
            if (typeof normalizedUser.dob === 'string' && normalizedUser.dob.match(/^\d{4}-\d{2}-\d{2}$/)) {
              formattedDob = normalizedUser.dob;
            } else if (typeof normalizedUser.dob === 'string') {
              formattedDob = normalizedUser.dob.split('T')[0];
            } else if (normalizedUser.dob instanceof Date) {
              formattedDob = normalizedUser.dob.toISOString().split('T')[0];
            }
          } catch (error) {
            console.error('Error formatting dob:', error);
            formattedDob = '';
          }
        }
        
        const userData = {
          full_name: normalizedUser.full_name || '',
          username: normalizedUser.username || '',
          email: normalizedUser.email || '',
          phone: normalizedUser.phone || '',
          dob: formattedDob,
          address: normalizedUser.address || '',
          role: normalizedUser.role || '',
          gender: normalizedUser.gender || 'male'
        };
        setUserInfo(userData);
        setOriginalUserInfo(userData);

        if (normalizedUser.role === 'patient') {
          try {
            const userIdForPatient = normalizedUser.id || normalizedUser._id;
            if (!userIdForPatient) {
              console.warn('Missing user id when fetching patient notes');
            } else {
              const resp = await getPatientByUserIdSvc(userIdForPatient);
            if (resp.success && resp.data) {
              setPatientId(resp.data._id);
              setPatientNotes(resp.data.notes || '');
              setOriginalPatientNotes(resp.data.notes || '');
              }
            }
          } catch (err) {
            console.error('Error loading patient notes:', err);
          }
        }
      } else {
        showToast('Vui lòng đăng nhập để truy cập trang này', 'error');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    };

    loadUserData();
  }, []);

  // Xử lý state location cho activeTab
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveSection(location.state.activeTab);
    }
  }, [location.state]);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  // Hiển thị thông báo
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Xử lý thay đổi thông tin người dùng
  const handleUserInfoChange = (e) => {
    const { name, value } = e.target;
    setUserInfo(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Xử lý thay đổi form mật khẩu
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form thay đổi mật khẩu
  const validatePasswordForm = () => {
    const newErrors = {};

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }

    if (!passwordForm.newPassword) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (passwordForm.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      newErrors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Xử lý cập nhật thông tin cá nhân
  const handleUpdateProfile = async () => {
    if (!currentUser) {
      showToast('Không tìm thấy thông tin người dùng', 'error');
      return;
    }

    const changedFields = {};
    const fieldsToCheck = ['full_name', 'email', 'phone', 'address', 'dob', 'gender'];
    
    fieldsToCheck.forEach(field => {
      if (userInfo[field] !== originalUserInfo[field]) {
        changedFields[field] = field === 'email' || field === 'address' 
          ? (userInfo[field].trim() || null) 
          : userInfo[field].trim ? userInfo[field].trim() : userInfo[field];
      }
    });

    const notesChanged = currentUser?.role === 'patient' && patientId && (patientNotes !== originalPatientNotes);

    if (Object.keys(changedFields).length === 0 && !notesChanged) {
      showToast('Không có thay đổi nào để cập nhật', 'info');
      return;
    }

    // Validation các trường đã thay đổi
    const newErrors = {};
    
    if (changedFields.full_name !== undefined) {
      if (!changedFields.full_name || !changedFields.full_name.trim()) {
        newErrors.full_name = 'Họ và tên không được để trống';
      } else if (changedFields.full_name.length > 100) {
        newErrors.full_name = 'Họ và tên không được quá 100 ký tự';
      }
    }

    if (changedFields.phone !== undefined) {
      if (!changedFields.phone || !changedFields.phone.trim()) {
        newErrors.phone = 'Số điện thoại không được để trống';
      } else if (!/^0[0-9]{9,10}$/.test(changedFields.phone)) {
        newErrors.phone = 'Số điện thoại phải bắt đầu bằng 0 và có 10-11 chữ số';
      }
    }

    if (changedFields.email !== undefined && changedFields.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(changedFields.email)) {
        newErrors.email = 'Email không hợp lệ';
      } else if (changedFields.email.length > 100) {
        newErrors.email = 'Email không được quá 100 ký tự';
      }
    }

    if (changedFields.address !== undefined && changedFields.address) {
      if (changedFields.address.length > 255) {
        newErrors.address = 'Địa chỉ không được quá 255 ký tự';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Vui lòng kiểm tra lại thông tin', 'error');
      return;
    }
    // Nếu chỉ có ghi chú thay đổi
    if (Object.keys(changedFields).length === 0 && notesChanged) {
      setIsLoading(true);
      setSavingNotes(true);
      try {
        const resp = await updatePatientSvc(patientId, { notes: patientNotes });
        if (resp.success) {
          setOriginalPatientNotes(patientNotes);
          showToast('Đã lưu ghi chú!', 'success');
        } else {
          throw new Error(resp?.error || 'Không thể lưu ghi chú');
        }
      } catch (error) {
        console.error('Update patient notes error:', error);
        showToast(error.message || 'Lỗi khi lưu ghi chú', 'error');
      } finally {
        setSavingNotes(false);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token không hợp lệ');
      }

      console.log('Updating user with ID:', currentUser.id);
      console.log('Changed fields:', changedFields);
      console.log('Token:', token ? 'exists' : 'missing');

      const result = await apiCall(`/users/${currentUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(changedFields),
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('API Result:', result);

      if (result.success) {
        const updatedUserData = result.data;
        
        const normalizedUser = {
          ...currentUser, 
          ...updatedUserData,
          id: updatedUserData.id || updatedUserData._id || currentUser.id || currentUser._id,
          _id: updatedUserData._id || updatedUserData.id || currentUser._id || currentUser.id,
          roleInfo: updatedUserData.roleInfo || currentUser.roleInfo,
          doctor_id: updatedUserData.doctor_id || currentUser.doctor_id,
          patient_id: updatedUserData.patient_id || currentUser.patient_id,
          receptionist_id: updatedUserData.receptionist_id || currentUser.receptionist_id
        };
        
        localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
        setCurrentUser(normalizedUser);
        
        let formattedDob = '';
        if (normalizedUser.dob) {
          try {
            if (typeof normalizedUser.dob === 'string' && normalizedUser.dob.match(/^\d{4}-\d{2}-\d{2}$/)) {
              formattedDob = normalizedUser.dob;
            } else if (typeof normalizedUser.dob === 'string') {
              formattedDob = normalizedUser.dob.split('T')[0];
            } else if (normalizedUser.dob instanceof Date) {
              formattedDob = normalizedUser.dob.toISOString().split('T')[0];
            }
          } catch (error) {
            console.error('Error formatting dob:', error);
            formattedDob = '';
          }
        }
        
        setOriginalUserInfo({
          full_name: normalizedUser.full_name || '',
          username: normalizedUser.username || '',
          email: normalizedUser.email || '',
          phone: normalizedUser.phone || '',
          dob: formattedDob,
          address: normalizedUser.address || '',
          role: normalizedUser.role || '',
          gender: normalizedUser.gender || 'male'
        });
        
        setUserInfo({
          full_name: normalizedUser.full_name || '',
          username: normalizedUser.username || '',
          email: normalizedUser.email || '',
          phone: normalizedUser.phone || '',
          dob: formattedDob,
          address: normalizedUser.address || '',
          role: normalizedUser.role || '',
          gender: normalizedUser.gender || 'male'
        });
        
        setErrors({});
      
        const changedFieldNames = Object.keys(changedFields).map(field => {
          const fieldLabels = {
            full_name: 'Họ và tên',
            email: 'Email',
            phone: 'Số điện thoại',
            address: 'Địa chỉ',
            dob: 'Ngày sinh',
            gender: 'Giới tính'
          };
          return fieldLabels[field];
        });
        
        showToast(`Đã cập nhật: ${changedFieldNames.join(', ')}`, 'success');

        if (notesChanged) {
          setSavingNotes(true);
          try {
            const respNotes = await updatePatientSvc(patientId, { notes: patientNotes });
            if (respNotes.success) {
              setOriginalPatientNotes(patientNotes);
              showToast('Đã lưu ghi chú!', 'success');
            } else {
              showToast(respNotes.error || 'Không thể lưu ghi chú', 'error');
            }
          } catch (err) {
            console.error('Save patient notes after profile update error:', err);
            showToast('Lỗi khi lưu ghi chú', 'error');
          } finally {
            setSavingNotes(false);
          }
        }
      } else {
        throw new Error(result?.error || result?.message || 'Có lỗi xảy ra khi cập nhật thông tin');
      }
      
    } catch (error) {
      console.error('Update profile error:', error);
      
      if (error.message.includes('Không thể kết nối đến server')) {
        console.log('Server offline - updating local data only');
        
        const updatedUser = {
          ...currentUser,
          ...changedFields,
          id: currentUser.id || currentUser._id,
          _id: currentUser._id || currentUser.id,
          roleInfo: currentUser.roleInfo,
          doctor_id: currentUser.doctor_id,
          patient_id: currentUser.patient_id,
          receptionist_id: currentUser.receptionist_id
        };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        
        setOriginalUserInfo({ ...originalUserInfo, ...changedFields });
        
        setErrors({});
        
        const changedFieldNames = Object.keys(changedFields).map(field => {
          const fieldLabels = {
            full_name: 'Họ và tên',
            email: 'Email',
            phone: 'Số điện thoại',
            address: 'Địa chỉ',
            dob: 'Ngày sinh',
            gender: 'Giới tính'
          };
          return fieldLabels[field];
        });
        
        showToast(`Đã cập nhật cục bộ: ${changedFieldNames.join(', ')} (Server offline)`, 'success');
        return;
      }
      
      // Chỉ đăng xuất khi thực sự có lỗi xác thực
      if (error.message.includes('401') || 
          error.message.includes('Token đã hết hạn') || 
          error.message.includes('Token không hợp lệ') ||
          error.message.includes('Phiên đăng nhập đã hết hạn')) {
        showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!', 'error');
        setTimeout(() => {
          logout();
        }, 2000);
      } else {
        showToast(error.message || 'Có lỗi xảy ra khi cập nhật thông tin!', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý thay đổi mật khẩu
  const handleChangePassword = async () => {
    if (!validatePasswordForm()) {
      showToast('Vui lòng kiểm tra lại thông tin', 'error');
      return;
    }

    if (!currentUser) {
      showToast('Không tìm thấy thông tin người dùng', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token không hợp lệ');
      }
      // Gọi API thay đổi mật khẩu
      const result = await apiCall('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        }),
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (result.success) {
        showToast('Mật khẩu đã được thay đổi thành công!', 'success');
        
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        throw new Error(result?.error || 'Có lỗi xảy ra khi thay đổi mật khẩu');
      }
      
    } catch (error) {
      console.error('Change password error:', error);
      
      if (error.message.includes('401') || 
          error.message.includes('Token đã hết hạn') || 
          error.message.includes('Token không hợp lệ') ||
          error.message.includes('Phiên đăng nhập đã hết hạn')) {
        showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!', 'error');
        setTimeout(() => {
          logout();
        }, 2000);
      } else if (error.message.includes('Không thể kết nối đến server')) {
        showToast('Không thể kết nối đến server. Vui lòng thử lại sau!', 'error');
      } else if (error.message.includes('current password')) {
        showToast('Mật khẩu hiện tại không đúng!', 'error');
        setErrors(prev => ({ ...prev, currentPassword: 'Mật khẩu hiện tại không đúng' }));
      } else {
        showToast(error.message || 'Có lỗi xảy ra khi thay đổi mật khẩu!', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý đăng xuất
  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      showToast('Đăng xuất thành công!', 'success');
      
      setTimeout(() => {
        logout();
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm ${
          toast.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle 600px at 0% 200px, #bfdbfe, transparent),
            radial-gradient(circle 600px at 100% 200px, #bfdbfe, transparent)
          `,
        }}
      />

      <div className="relative z-10 min-h-screen">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Cài đặt tài khoản</h1>
                <p className="text-sm text-gray-600">Quản lý thông tin cá nhân và bảo mật</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.history.back()}
                  className="border-gray-300 hover:bg-gray-50 text-gray-700"
                >
                  Quay lại
                </Button>
                <Button 
                  size="sm"
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Đăng xuất
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveSection('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeSection === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Thông tin cá nhân
              </button>
              <button
                onClick={() => setActiveSection('security')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeSection === 'security'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Bảo mật
              </button>
            </nav>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin cá nhân</CardTitle>
                  <CardDescription>
                    Cập nhật thông tin cá nhân của bạn
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="full_name" className="block mb-3 font-medium text-gray-700">Họ và tên *</Label>
                        <Input
                          id="full_name"
                          name="full_name"
                          value={userInfo.full_name}
                          onChange={handleUserInfoChange}
                          placeholder="Nhập họ và tên"
                          className="mt-1"
                        />
                        {errors.full_name && <span className="text-red-500 text-sm mt-1 block">{errors.full_name}</span>}
                      </div>

                      <div>
                        <Label htmlFor="email" className="block mb-3 font-medium text-gray-700">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={userInfo.email}
                          onChange={handleUserInfoChange}
                          placeholder="example@email.com"
                          className="mt-1"
                        />
                        {errors.email && <span className="text-red-500 text-sm mt-1 block">{errors.email}</span>}
                      </div>

                      <div>
                        <Label htmlFor="phone" className="block mb-3 font-medium text-gray-700">Số điện thoại *</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={userInfo.phone}
                          onChange={handleUserInfoChange}
                          placeholder="0123456789"
                          className="mt-1"
                        />
                        {errors.phone && <span className="text-red-500 text-sm mt-1 block">{errors.phone}</span>}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="dob" className="block mb-3 font-medium text-gray-700">Ngày sinh</Label>
                        <Input
                          id="dob"
                          name="dob"
                          type="date"
                          value={userInfo.dob}
                          onChange={handleUserInfoChange}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="gender" className="block mb-3 font-medium text-gray-700">Giới tính</Label>
                        <select
                          id="gender"
                          name="gender"
                          value={userInfo.gender}
                          onChange={handleUserInfoChange}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                        >
                          <option value="male">Nam</option>
                          <option value="female">Nữ</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="address" className="block mb-3 font-medium text-gray-700">Địa chỉ</Label>
                        <textarea
                          id="address"
                          name="address"
                          value={userInfo.address}
                          onChange={handleUserInfoChange}
                          className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          rows="3"
                          placeholder="Nhập địa chỉ đầy đủ"
                        />
                        {errors.address && <span className="text-red-500 text-sm mt-1 block">{errors.address}</span>}
                      </div>

                      <div>
                        <Label className="block mb-3 font-medium text-gray-700">Tên đăng nhập</Label>
                        <Input
                          value={userInfo.username}
                          disabled
                          className="bg-gray-100 mt-1"
                        />
                        <span className="text-xs text-gray-500 mt-1 block">Tên đăng nhập không thể thay đổi</span>
                      </div>
                    </div>
                  </div>
                  {currentUser?.role === 'patient' && (
                    <div>
                      <Label htmlFor="patient-notes" className="block mb-3 font-medium text-gray-700">Ghi chú</Label>
                      <textarea
                        id="patient-notes"
                        value={patientNotes}
                        onChange={(e) => setPatientNotes(e.target.value)}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        rows="4"
                        placeholder="Nhập ghi chú của bạn..."
                      />
                    </div>
              )}

                  <div className="flex justify-between items-center pt-6 border-t">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Lưu ý:</span> Chỉ những trường có thay đổi mới được cập nhật
                    </p>
                    <Button 
                      onClick={handleUpdateProfile}
                        disabled={isLoading || savingNotes}
                      className="min-w-[140px] bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                    >
                        {isLoading ? 'Đang cập nhật...' : (savingNotes ? 'Đang lưu ghi chú...' : 'Cập nhật thông tin')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Thay đổi mật khẩu</CardTitle>
                  <CardDescription>
                    Đảm bảo tài khoản của bạn an toàn bằng cách sử dụng mật khẩu mạnh
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="max-w-md space-y-6">
                    <div>
                      <Label htmlFor="currentPassword" className="block mb-3 font-medium text-gray-700">Mật khẩu hiện tại *</Label>
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Nhập mật khẩu hiện tại"
                        className="mt-1"
                      />
                      {errors.currentPassword && <span className="text-red-500 text-sm mt-1 block">{errors.currentPassword}</span>}
                    </div>

                    <div>
                      <Label htmlFor="newPassword" className="block mb-3 font-medium text-gray-700">Mật khẩu mới *</Label>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                        className="mt-1"
                      />
                      {errors.newPassword && <span className="text-red-500 text-sm mt-1 block">{errors.newPassword}</span>}
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword" className="block mb-3 font-medium text-gray-700">Xác nhận mật khẩu mới *</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Nhập lại mật khẩu mới"
                        className="mt-1"
                      />
                      {errors.confirmPassword && <span className="text-red-500 text-sm mt-1 block">{errors.confirmPassword}</span>}
                    </div>

                    <div className="pt-4">
                      <Button 
                        onClick={handleChangePassword}
                        disabled={isLoading}
                        className="min-w-[160px] bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                      >
                        {isLoading ? 'Đang thay đổi...' : 'Thay đổi mật khẩu'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Setting;
