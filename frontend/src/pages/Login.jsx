import React, { useState, useEffect } from 'react';
import {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card.jsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser } from '@/utils/api.js';
import { setCurrentUserToStorage, navigateByRole, isLoggedIn, getUserRole, refreshCurrentUserFromServer } from '@/utils/auth.js';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [showPassword, setShowPassword] = useState(false);

  // Hiển thị thông báo
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 5000);
  };

  // Kiểm tra user đã đăng nhập chưa
  useEffect(() => {
    if (isLoggedIn()) {
      const userRole = getUserRole();
      const targetPath = navigateByRole(userRole);
      
      if (window.location.pathname !== targetPath) {
        window.location.href = targetPath;
      }
    }
  }, []);

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
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Tên đăng nhập không được để trống';
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu không được để trống';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Xử lý submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await loginUser({
        username: formData.username.trim(),
        password: formData.password
      });

      if (result.success) {
        if (result.token) {
          localStorage.setItem('token', result.token);
          console.log('Token saved:', result.token ? 'YES' : 'NO');
        }

        const loginPayloadUser = { ...result.user };
        if (!loginPayloadUser.id && loginPayloadUser._id) {
          loginPayloadUser.id = loginPayloadUser._id;
        }

        let finalUser = loginPayloadUser;
        const refreshed = await refreshCurrentUserFromServer();
        if (refreshed.success && refreshed.user) {
          finalUser = refreshed.user;
        } else {
          setCurrentUserToStorage(finalUser);
        }

        showToast(`Đăng nhập thành công! Chào mừng ${finalUser.full_name}`, 'success');
        
        setTimeout(() => {
          window.location.href = navigateByRole(finalUser.role);
        }, 1500);
        
      } else {
        showToast(result.error || 'Đăng nhập thất bại. Vui lòng thử lại!', 'error');
        
        setFormData(prev => ({ ...prev, password: '' }));
      }
      
    } catch (error) {
      console.error('Login error:', error);
      showToast('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng!', 'error');
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
        <h1 className="text-3xl text-center font-bold">
        Chào mừng bạn đến với <br />
        phòng khám tư nhân của chúng tôi!
        </h1>
        <p className="mt-4 text-center text-lg max-w-md">
          Chúng tôi cung cấp dịch vụ chăm sóc sức khỏe tốt nhất cho bạn.
        </p>
        <Card className="w-full max-w-sm">
        <CardHeader>
            <CardTitle>Đăng nhập vào hệ thống</CardTitle>
            <CardDescription>
              Nhập thông tin đăng nhập để truy cập tài khoản
            </CardDescription>
            <CardAction>
            <Button variant="link" onClick={() => window.location.href = '/register'}>
              Chưa có tài khoản?
              <br />
              Đăng ký ngay
            </Button>
            </CardAction>
            </CardHeader>
        <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="username">Tên tài khoản</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Nhập tên đăng nhập"
                value={formData.username}
                onChange={handleInputChange}
                required
              />
              {errors.username && <span className="text-red-500 text-sm">{errors.username}</span>}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Mật khẩu</Label>
              </div>
              <div className="relative">
                <Input 
                  id="password" 
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
                  value={formData.password}
                  onChange={handleInputChange}
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <span className="text-red-500 text-sm">{errors.password}</span>}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-3">
        <Button 
          type="submit" 
          variant="blue"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </CardFooter>
    </Card>
    </div>
</div>  );
};

export default Login;
