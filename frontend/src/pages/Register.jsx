import React, { useState, useEffect } from 'react';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser, checkUsernameExists, checkBackendHealth } from '@/utils/api.js';

const Register = () => {
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
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 5000);
  };

  // Kiểm tra username với debounce
  const checkUsernameAvailability = async (username) => {
    if (!username || username.length < 3) return;
    
    setIsCheckingUsername(true);
    try {
      const usernameExists = await checkUsernameExists(username);
      
      if (usernameExists) {
        setErrors(prev => ({ ...prev, username: 'Tên đăng nhập đã tồn tại' }));
      } else {
        setErrors(prev => ({ ...prev, username: '' }));
      }
    } catch (error) {
      console.log('Error checking username:', error);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Xử lý thay đổi input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
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

  // Kiểm tra kết nối backend khi component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log('Checking backend connection...');
        const result = await checkBackendHealth();
        if (!result.success) {
          console.error('Backend health check failed:', result.error);
          showToast(`Không thể kết nối đến server: ${result.error}`, 'error');
        } else {
          console.log('Backend connection successful');
        }
      } catch (error) {
        console.error('Error checking backend connection:', error);
        showToast(`Lỗi kết nối: ${error.message}`, 'error');
      }
    };

    checkConnection();
  }, []);

  // Validate form trước khi submit
  const validateForm = () => {
    const newErrors = {};

    // Kiểm tra username
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
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    // Yêu cầu phải có ít nhất email hoặc số điện thoại
    const emailTrim = (formData.email || '').trim();
    const phoneTrim = (formData.phone || '').trim();
    if (!emailTrim && !phoneTrim) {
      const msg = 'Vui lòng cung cấp email hoặc số điện thoại (ít nhất một)';
      newErrors.email = msg;
      newErrors.phone = msg;
    }

    // Kiểm tra email (nếu có phải hợp lệ)
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      newErrors.email = 'Email không hợp lệ';
    }
    if (emailTrim && emailTrim.length > 100) {
      newErrors.email = 'Email không được quá 100 ký tự';
    }

    // Kiểm tra số điện thoại (nếu có)
    if (phoneTrim && !/^0[0-9]{9,10}$/.test(phoneTrim)) {
      newErrors.phone = 'Số điện thoại phải bắt đầu bằng 0 và có 10-11 chữ số';
    }

    // Kiểm tra địa chỉ
    if (formData.address && formData.address.length > 255) {
      newErrors.address = 'Địa chỉ không được quá 255 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Xử lý submit form đăng ký
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const submitData = {
        username: formData.username.trim(),
        password_hash: formData.password,
        full_name: formData.full_name.trim(),
  email: (formData.email || '').trim() || null,
  phone: (formData.phone || '').trim() || null,
        dob: formData.dob || null,
        gender: formData.gender,
        address: formData.address.trim() || null,
        role: 'patient',
        patient_notes: (formData.notes || '').trim()
      };

      Object.keys(submitData).forEach(key => {
        if (submitData[key] === undefined) {
          delete submitData[key];
        }
      });

      console.log('Submitting data:', submitData);

      const result = await registerUser(submitData);
      console.log('Registration result:', result);

      if (result.success) {
        showToast('Đăng ký tài khoản bệnh nhân thành công! Bạn có thể đăng nhập ngay bây giờ.', 'success');
        
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
          notes: ''
        });
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        
      } else {
        const errorMessage = result.error || 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại!';
        
        if (errorMessage.includes('Tên đăng nhập đã tồn tại')) {
          const specificError = `Tên đăng nhập "${formData.username}" đã tồn tại!`;
          showToast(specificError, 'error');
          setErrors(prev => ({ ...prev, username: specificError }));
        } else {
          showToast(errorMessage, 'error');
        }
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      
      const errorMessage = error.message || 'Không thể kết nối đến server';
      
      if (errorMessage.includes('Tên đăng nhập đã tồn tại')) {
        const specificError = `Tên đăng nhập "${formData.username}" đã tồn tại!`;
        showToast(specificError, 'error');
        setErrors(prev => ({ ...prev, username: specificError }));
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        showToast('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại!', 'error');
      } else {
        showToast(`Lỗi: ${errorMessage}`, 'error');
      }
    } finally {
      setIsLoading(false);
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
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <h1 className="text-3xl text-center font-bold mb-2">
          Đăng ký tài khoản bệnh nhân
        </h1>
        <p className="mt-4 text-center text-lg max-w-md mb-6">
          Tạo tài khoản để đặt lịch khám tại phòng khám tư nhân của chúng tôi.
        </p>
        
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Đăng ký tài khoản bệnh nhân</CardTitle>
            <CardDescription>
              Điền thông tin để tạo tài khoản tại phòng khám tư nhân
            </CardDescription>
            <CardAction>
              <Button variant="link" onClick={() => window.location.href = '/'}>
                Đã có tài khoản?
                <br />
                Đăng nhập ngay
              </Button>
            </CardAction>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="username">Tên đăng nhập *</Label>
                    <div className="relative">
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        placeholder="username123"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                      />
                      {isCheckingUsername && (
                        <div className="absolute right-2 top-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                    {errors.username && <span className="text-red-500 text-sm">{errors.username}</span>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="full_name">Họ và tên *</Label>
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
                    <Label htmlFor="password">Mật khẩu *</Label>
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
                    <Label htmlFor="confirmPassword">Xác nhận mật khẩu *</Label>
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
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
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
                    />
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
                    />
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
                  />
                  {errors.address && <span className="text-red-500 text-sm">{errors.address}</span>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Ghi chú (tùy chọn)</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    placeholder="Ghi chú thêm cho hồ sơ bệnh nhân (nếu có)"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    rows="3"
                  />
                </div>
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
              {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản bệnh nhân'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Register;
