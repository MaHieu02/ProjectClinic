import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser, checkUsernameExists } from '@/utils/api.js';
import { getCurrentUserFromStorage } from '@/utils/auth.js';
import { getActiveSpecialties } from '@/services/specialtyService.js';

const RegisterStaff = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    email: '',
    phone: '',
    dob: '',
    gender: 'male',
    address: '',
    role: 'patient',
    specialty: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [specialties, setSpecialties] = useState([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);

  const currentUser = getCurrentUserFromStorage();
  const currentRole = currentUser?.role || null;

  // Xác định các vai trò được phép tạo dựa trên vai trò hiện tại
  const allowedRoles = useMemo(() => {
    if (currentRole === 'admin') return ['patient', 'doctor', 'receptionist', 'admin'];
    if (currentRole === 'receptionist') return ['patient'];
    return ['patient'];
  }, [currentRole]);

  // Reset vai trò nếu vai trò hiện tại không được phép
  useEffect(() => {
    if (!allowedRoles.includes(formData.role)) {
      setFormData(prev => ({ ...prev, role: 'patient', specialty: '' }));
    }
  }, [allowedRoles, formData.role]);

  // Load danh sách chuyên khoa
  useEffect(() => {
    const loadSpecialties = async () => {
      setLoadingSpecialties(true);
      try {
        const result = await getActiveSpecialties();
        if (result.success && result.data) {
          setSpecialties(result.data);
        }
      } catch (error) {
        console.error('Error loading specialties:', error);
      } finally {
        setLoadingSpecialties(false);
      }
    };

    loadSpecialties();
  }, []);

  // Hiển thị thông báo
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Hàm xử lý lỗi tập trung
  const handleErrorMessage = (errorMessage, username, email) => {
    if (errorMessage.includes('Tên đăng nhập đã tồn tại')) {
      const specificError = `Tên đăng nhập "${username}" đã tồn tại!`;
      showToast(specificError, 'error');
      setErrors(prev => ({ ...prev, username: specificError }));
    } else if (errorMessage.includes('Email đã tồn tại')) {
      const specificError = `Email "${email}" đã tồn tại!`;
      showToast(specificError, 'error');
      setErrors(prev => ({ ...prev, email: specificError }));
    } else {
      showToast(errorMessage, 'error');
    }
  };

  // Kiểm tra tên đăng nhập đã tồn tại
  const checkUsernameAvailability = async (username) => {
    if (username.length < 3) return;
    
    try {
      const exists = await checkUsernameExists(username);
      if (exists) {
        setErrors(prev => ({ 
          ...prev, 
          username: `Tên đăng nhập "${username}" đã tồn tại!` 
        }));
      } else {
        setErrors(prev => ({ ...prev, username: '' }));
      }
    } catch (error) {
      console.error('Error checking username:', error);
    }
  };

  // Xử lý thay đổi input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'role' && value !== 'doctor') {
      setFormData(prev => ({
        ...prev,
        specialty: ''
      }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    if (name === 'username') {
      setTimeout(() => {
        if (value === formData.username) {
          checkUsernameAvailability(value);
        }
      }, 500);
    }
  };

  // Validate form trước khi submit
  const validateForm = () => {
    const newErrors = {};

    // Kiểm tra tên đăng nhập
    if (!formData.username.trim()) {
      newErrors.username = 'Tên đăng nhập không được để trống';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Tên đăng nhập phải có ít nhất 3 ký tự';
    } else if (formData.username.length > 50) {
      newErrors.username = 'Tên đăng nhập không được quá 50 ký tự';
    }

    // Kiểm tra họ tên
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Họ và tên không được để trống';
    } else if (formData.full_name.length > 100) {
      newErrors.full_name = 'Họ và tên không được quá 100 ký tự';
    }

    // Kiểm tra mật khẩu
    if (!formData.password) {
      newErrors.password = 'Mật khẩu không được để trống';
    } else if (formData.password.length < 4) {
      newErrors.password = 'Mật khẩu phải có ít nhất 4 ký tự';
    }

    // Kiểm tra xác nhận mật khẩu
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu không được để trống';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    // Kiểm tra email
    if (!formData.email.trim()) {
      newErrors.email = 'Email không được để trống';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    } else if (formData.email.length > 100) {
      newErrors.email = 'Email không được quá 100 ký tự';
    }

    // Kiểm tra số điện thoại
    if (!formData.phone.trim()) {
      newErrors.phone = 'Số điện thoại không được để trống';
    } else if (!/^0[0-9]{9,10}$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại phải bắt đầu bằng 0 và có 10-11 chữ số';
    }

    // Kiểm tra ngày sinh
    if (!formData.dob) {
      newErrors.dob = 'Ngày sinh không được để trống';
    } else {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      
      // Reset thời gian để chỉ so sánh ngày
      birthDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      if (birthDate >= today) {
        newErrors.dob = 'Ngày sinh phải nhỏ hơn ngày hiện tại';
      }
    }

    // Kiểm tra địa chỉ
    if (!formData.address.trim()) {
      newErrors.address = 'Địa chỉ không được để trống';
    } else if (formData.address.length > 255) {
      newErrors.address = 'Địa chỉ không được quá 255 ký tự';
    }

    // Kiểm tra vai trò
    if (!formData.role) {
      newErrors.role = 'Vui lòng chọn chức vụ';
    }

    // Kiểm tra chuyên khoa cho bác sĩ
    if (formData.role === 'doctor' && !formData.specialty) {
      newErrors.specialty = 'Chuyên khoa không được để trống khi chọn chức vụ bác sĩ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Xử lý submit form đăng ký
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('Vui lòng kiểm tra lại thông tin', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const registrationData = {
        username: formData.username.trim(),
        full_name: formData.full_name.trim(),
        password_hash: formData.password,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        dob: formData.dob || null,
        gender: formData.gender || null,
        role: formData.role
      };

      // Thêm chuyên khoa cho vai trò bác sĩ
      if (formData.role === 'doctor') {
        registrationData.specialty_id = formData.specialty;
      }

      // Ghi chú cho bệnh nhân khi tạo bằng staff
      if (formData.role === 'patient') {
        registrationData.patient_notes = (formData.notes || '').trim();
      }

      const response = await registerUser(registrationData);

      if (response.success) {
        showToast(`Tạo tài khoản ${getRoleDisplayName(formData.role)} thành công!`, 'success');
        
        setFormData({
          username: '',
          password: '',
          confirmPassword: '',
          full_name: '',
          email: '',
          phone: '',
          dob: '',
          gender: 'male',
          address: '',
          role: 'patient',
          specialty: '',
          notes: ''
        });
        setErrors({});
      } else {
        const errorMessage = response.error || 'Có lỗi xảy ra khi tạo tài khoản';
        handleErrorMessage(errorMessage, formData.username, formData.email);
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      const errorMessage = error.message || 'Có lỗi kết nối đến server. Vui lòng thử lại!';
      handleErrorMessage(errorMessage, formData.username, formData.email);
    } finally {
      setIsLoading(false);
    }
  };

  // Hiển thị các vai trò
  const roleNames = useMemo(() => ({
    patient: 'Bệnh nhân',
    doctor: 'Bác sĩ',
    receptionist: 'Lễ tân',
    admin: 'Quản trị viên'
  }), []);

  const getRoleDisplayName = (role) => {
    return roleNames[role] || role;
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
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8">
        <h1 className="text-3xl text-center font-bold mb-2">
          Đăng ký tài khoản
        </h1>
        <p className="mt-4 text-center text-lg max-w-md mb-6">
          Tạo tài khoản cho {getRoleDisplayName(formData.role).toLowerCase()}
           
        </p>
        
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Tạo tài khoản mới</CardTitle>
            <CardDescription>
              Điền đầy đủ thông tin để tạo tài khoản
            </CardDescription>
            <CardAction>
              <Button variant="link" onClick={() => window.history.back()}>
                Quay lại
              </Button>
            </CardAction>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="username">Tên đăng nhập</Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="staff123"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                    />
                    {errors.username && <span className="text-red-500 text-sm">{errors.username}</span>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="full_name">Họ và tên</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required
                    />
                    {errors.full_name && <span className="text-red-500 text-sm">{errors.full_name}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="password">Mật khẩu</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      minLength={6}
                    />
                    {errors.password && <span className="text-red-500 text-sm">{errors.password}</span>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                    />
                    {errors.confirmPassword && <span className="text-red-500 text-sm">{errors.confirmPassword}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="role">Vai trò</Label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      required
                    >
                      {allowedRoles.includes('patient') && (
                        <option value="patient">Bệnh nhân</option>
                      )}
                      {allowedRoles.includes('doctor') && (
                        <option value="doctor">Bác sĩ</option>
                      )}
                      {allowedRoles.includes('receptionist') && (
                        <option value="receptionist">Lễ tân</option>
                      )}
                      {allowedRoles.includes('admin') && (
                        <option value="admin">Quản trị viên</option>
                      )}
                    </select>
                    {errors.role && <span className="text-red-500 text-sm">{errors.role}</span>}
                  </div>
                  {/* Chuyên khoa - chỉ hiện khi chọn bác sĩ */}
                  {formData.role === 'doctor' && (
                    <div className="grid gap-2">
                      <Label htmlFor="specialty">Chuyên khoa</Label>
                      <select
                        id="specialty"
                        name="specialty"
                        value={formData.specialty}
                        onChange={handleInputChange}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        required={formData.role === 'doctor'}
                        disabled={loadingSpecialties}
                      >
                        <option value="">
                          {loadingSpecialties ? 'Đang tải...' : '-- Chọn chuyên khoa --'}
                        </option>
                        {specialties.map((specialty) => (
                          <option key={specialty._id} value={specialty._id}>
                            {specialty.name}
                          </option>
                        ))}
                      </select>
                      {errors.specialty && <span className="text-red-500 text-sm">{errors.specialty}</span>}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="doctor@clinic.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                    {errors.email && <span className="text-red-500 text-sm">{errors.email}</span>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="0123456789"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                    {errors.phone && <span className="text-red-500 text-sm">{errors.phone}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="dob">Ngày sinh</Label>
                    <Input
                      id="dob"
                      name="dob"
                      type="date"
                      value={formData.dob}
                      onChange={handleInputChange}
                      required
                    />
                    {errors.dob && <span className="text-red-500 text-sm">{errors.dob}</span>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gender">Giới tính</Label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="address">Địa chỉ</Label>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                  />
                  {errors.address && <span className="text-red-500 text-sm">{errors.address}</span>}
                </div>

                {formData.role === 'patient' && (
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Ghi chú bệnh nhân (tuỳ chọn)</Label>
                    <textarea
                      id="notes"
                      name="notes"
                      placeholder="Nhập ghi chú cho hồ sơ bệnh nhân"
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      rows="3"
                    />
                  </div>
                )}
              </div>
            </form>
          </CardContent>
          
          <CardFooter className="flex-col gap-2">
            <Button 
              type="submit" 
              variant="blue"
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Đang xử lý...' : `Đăng ký ${getRoleDisplayName(formData.role).toLowerCase()}`}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default RegisterStaff;