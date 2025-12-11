import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDoctorByUserId, deleteDoctor, reactivateDoctor } from '@/services/doctorService';
import { getCurrentUserFromStorage, getToken } from '@/utils/auth';
import { apiCall } from '@/utils/api';

// Hàm helper để format ngày tháng
const formatDate = (dateString) => {
  if (!dateString) return 'Chưa có';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Chưa có';
    return date.toLocaleDateString('vi-VN');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Chưa có';
  }
};

const DoctorProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Form chỉnh sửa thông tin bác sĩ
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'male',
    address: '',
    username: '',
    password: ''
  });

  // Hàm hiển thị thông báo
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Tải dữ liệu bác sĩ khi component mount
  useEffect(() => {
    const loadDoctorData = async () => {
      // Kiểm tra quyền truy cập
      const currentUser = getCurrentUserFromStorage();
      if (!currentUser || !['doctor', 'admin'].includes(currentUser.role)) {
        setError('Bạn không có quyền xem thông tin bác sĩ này');
        setIsLoading(false);
        return;
      }

      if (!userId) {
        setError('Không tìm thấy thông tin bác sĩ');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await getDoctorByUserId(userId);
        
        console.log('Doctor data received:', result);
        
        if (result.success && result.data) {
          setDoctor(result.data);
          console.log('Doctor user_id:', result.data.user_id);
          setError(null);
        } else {
          setError(result.error || 'Không thể tải thông tin bác sĩ');
        }
      } catch (err) {
        console.error('Error loading doctor:', err);
        setError('Lỗi khi tải thông tin bác sĩ');
      } finally {
        setIsLoading(false);
      }
    };

    loadDoctorData();
  }, [userId]);

  // Mở modal chỉnh sửa thông tin bác sĩ
  const openEditModal = () => {
    console.log('Opening edit modal, doctor:', doctor);
    if (doctor?.user_id) {
      const userInfo = doctor.user_id;
      console.log('User info:', userInfo);
      console.log('Username from userInfo:', userInfo.username);
      
      let formattedDob = '';
      if (userInfo.dob) {
        try {
          const dobDate = new Date(userInfo.dob);
          if (!isNaN(dobDate.getTime())) {
            formattedDob = dobDate.toISOString().split('T')[0];
          }
        } catch (error) {
          console.error('Error formatting dob:', error);
        }
      }
      
      const formData = {
        full_name: userInfo.full_name || '',
        phone: userInfo.phone || '',
        email: userInfo.email || '',
        dob: formattedDob,
        gender: userInfo.gender || 'male',
        address: userInfo.address || '',
        username: userInfo.username || '',
        password: ''
      };
      
      console.log('Setting editForm with data:', formData);
      setEditForm(formData);
      setShowEditModal(true);
    } else {
      console.error('No doctor or user_id found');
      showToast('Không tìm thấy thông tin bác sĩ', 'error');
    }
  };

  // Xử lý vô hiệu hóa bác sĩ
  const handleDelete = async () => {
    if (!doctor?._id) return;

    if (!confirm('Bạn có chắc muốn vô hiệu hóa bác sĩ này? Hành động không thể hoàn tác.')) return;
    try {
      setIsDeleting(true);
      const res = await deleteDoctor(doctor._id);
      if (res.success) {
        showToast('Vô hiệu hóa bác sĩ thành công', 'success');
        navigate('/admin');
      } else {
        showToast(res.error || 'Vô hiệu hóa bác sĩ thất bại', 'error');
      }
    } catch (err) {
      console.error('Error deleting doctor:', err);
      showToast('Có lỗi xảy ra khi vô hiệu hóa', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Xử lý kích hoạt lại bác sĩ
  const handleReactivate = async () => {
    if (!doctor?._id) return;

    if (!confirm('Bạn có chắc muốn kích hoạt lại tài khoản bác sĩ này?')) return;

    try {
      setIsDeleting(true);
      const res = await reactivateDoctor(doctor._id);
      if (res.success) {
        showToast('Đã kích hoạt lại tài khoản thành công', 'success');
        const doctorRes = await getDoctorByUserId(userId);
        if (doctorRes.success && doctorRes.data) {
          setDoctor(doctorRes.data);
        }
      } else {
        showToast(res.error || 'Kích hoạt lại thất bại', 'error');
      }
    } catch (err) {
      console.error('Error reactivating doctor:', err);
      showToast('Có lỗi xảy ra khi kích hoạt lại', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Xử lý thay đổi form chỉnh sửa
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Xử lý lưu thay đổi thông tin bác sĩ
  const handleSaveChanges = async () => {
    console.log('Saving changes, doctor:', doctor);
    console.log('Edit form:', editForm);
    
    if (!doctor?.user_id?._id) {
      console.error('No doctor user_id found');
      showToast('Không tìm thấy thông tin người dùng', 'error');
      return;
    }

    try {
      setIsSaving(true);
      
      const token = getToken();
      if (!token) {
        console.error('No token found');
        showToast('Vui lòng đăng nhập lại', 'error');
        return;
      }

      const updateData = { ...editForm };
      
      // Nếu không có password, xóa trường password khỏi updateData
      if (!updateData.password || updateData.password.trim() === '') {
        delete updateData.password;
      }
      
      console.log('Update data:', updateData);
      console.log('API endpoint:', `/users/${doctor.user_id._id}`);
      
      const result = await apiCall(`/users/${doctor.user_id._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      
      console.log('API result:', result);

      if (result.success) {
        const updatedDoctor = await getDoctorByUserId(userId);
        if (updatedDoctor.success) {
          setDoctor(updatedDoctor.data);
        }
        
        showToast('Cập nhật thông tin thành công!', 'success');
        setShowEditModal(false);
      } else {
        showToast(result.error || 'Không thể cập nhật thông tin', 'error');
      }
    } catch (error) {
      console.error('Error updating doctor info:', error);
      showToast('Lỗi khi cập nhật thông tin', 'error');
    } finally {
      setIsSaving(false);
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-white relative overflow-hidden p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải thông tin bác sĩ...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-white relative overflow-hidden p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Lỗi</h2>
                <p className="text-gray-600">{error}</p>
                <Button 
                  onClick={() => navigate(-1)} 
                  className="mt-4"
                >
                  Quay lại
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen w-full bg-white relative overflow-hidden p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-gray-600">Không tìm thấy thông tin bác sĩ</p>
                <Button 
                  onClick={() => navigate(-1)} 
                  className="mt-4"
                >
                  Quay lại
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const userInfo = doctor.user_id;

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden p-6">
      {/* Thông báo */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white animate-slide-in-right`}>
          <div className="flex items-center gap-2">
            <span>{toast.type === 'success' ? '✓' : '✗'}</span>
            <span>{toast.message}</span>
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

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Đầu trang với nút Quay lại */}
        <div className="mb-6 flex items-center justify-between relative z-10">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <span>←</span>
            Quay lại
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">Hồ sơ bác sĩ</h1>
          <div className="w-24"></div>
        </div>

        {/* Hồ sơ chính */}
        <Card className="mb-6 border-2 border-green-200 shadow-lg relative z-10">
          <CardHeader className="bg-transparent relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {userInfo?.full_name?.charAt(0) || 'D'}
                </div>
                <div>
                  <CardTitle className="text-2xl mb-2">{userInfo?.full_name || 'Chưa có tên'}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className="bg-green-100 text-green-800">
                      Bác sĩ
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800">
                      {doctor.specialty_id?.name || 'Chưa có chuyên khoa'}
                    </Badge>
                    <Badge className={doctor.is_active ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                      {doctor.is_active ? 'Đang hoạt động' : 'Không hoạt động'}
                    </Badge>
                  </div>
                </div>
              </div>
               <div className="flex gap-2">
                 <Button 
                   onClick={openEditModal} 
                   className="bg-green-600 hover:bg-green-700 text-white relative z-10"
                 >
                  Chỉnh sửa
                 </Button>
                 {getCurrentUserFromStorage()?.role === 'admin' && (
                   <>
                     {userInfo?.employment_status === false ? (
                       <Button 
                         onClick={handleReactivate}
                         disabled={isDeleting}
                         className="bg-green-600 hover:bg-green-700 text-white"
                       >
                         {isDeleting ? 'Đang xử lý...' : '🔄 Kích hoạt lại'}
                       </Button>
                     ) : (
                       <Button 
                         onClick={handleDelete}
                         disabled={isDeleting}
                         className="bg-red-600 hover:bg-red-700 text-white"
                       >
                         {isDeleting ? 'Đang vô hiệu hóa...' : '🗑️ Vô hiệu hóa bác sĩ'}
                       </Button>
                     )}
                   </>
                 )}
               </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Thông tin cá nhân */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">
                  Thông tin cá nhân
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InfoRow 
                    label="Email" 
                    value={userInfo?.email || 'Chưa có'} 
                  />
                  <InfoRow 
                    label="Số điện thoại" 
                    value={userInfo?.phone || 'Chưa có'} 
                  />
                  <InfoRow 
                    label="Ngày sinh" 
                    value={formatDate(userInfo?.dob)} 
                  />
                  <InfoRow 
                    label="Giới tính" 
                    value={userInfo?.gender === 'male' ? 'Nam' : 'Nữ'} 
                  />
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <InfoRow 
                    label="Địa chỉ" 
                    value={userInfo?.address || 'Chưa có'} 
                  />
                </div>
              </div>

              {/* Thông tin chuyên môn */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">
                  Thông tin chuyên môn
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InfoRow 
                    label="Chuyên khoa" 
                    value={doctor.specialty_id?.name || 'Chưa có chuyên khoa'} 
                  />
                  <InfoRow 
                    label="Trạng thái" 
                    value={doctor.is_active ? 'Đang hoạt động' : 'Không hoạt động'} 
                  />
                  <InfoRow 
                    label="Tình trạng làm việc" 
                    value={userInfo?.employment_status === false ? 'Đã nghỉ việc' : 'Đang làm việc'} 
                  />
                  <InfoRow 
                    label="Ngày tạo hồ sơ" 
                    value={new Date(doctor.createdAt).toLocaleDateString('vi-VN')} 
                  />
                </div>
                {doctor.busy_time && (
                  <div className="grid grid-cols-1 gap-3">
                    <InfoRow 
                      label="Thời gian bận" 
                      value={new Date(doctor.busy_time).toLocaleString('vi-VN')} 
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Chỉnh sửa thông tin</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  disabled={isSaving}
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Họ và tên *</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={editForm.full_name}
                    onChange={handleEditFormChange}
                    placeholder="Nhập họ và tên"
                    disabled={isSaving}
                    className="mt-3"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Số điện thoại *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleEditFormChange}
                      placeholder="Nhập số điện thoại"
                      disabled={isSaving}
                      className="mt-3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={editForm.email}
                      onChange={handleEditFormChange}
                      placeholder="Nhập email"
                      disabled={isSaving}
                      className="mt-3"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dob">Ngày sinh *</Label>
                    <Input
                      id="dob"
                      name="dob"
                      type="date"
                      value={editForm.dob}
                      onChange={handleEditFormChange}
                      disabled={isSaving}
                      className="mt-3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Giới tính *</Label>
                    <select
                      id="gender"
                      name="gender"
                      value={editForm.gender}
                      onChange={handleEditFormChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 mt-3"
                      disabled={isSaving}
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Địa chỉ</Label>
                  <Input
                    id="address"
                    name="address"
                    value={editForm.address}
                    onChange={handleEditFormChange}
                    placeholder="Nhập địa chỉ"
                    disabled={isSaving}
                    className="mt-3"
                  />
                </div>

                {getCurrentUserFromStorage()?.role === 'admin' && (
                  <>
                    <div className="border-t pt-4 mt-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Thông tin đăng nhập</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="username">Tên đăng nhập</Label>
                          <div className="mt-3 text-sm text-gray-700 font-medium">
                            {doctor?.user_id?.username || 'Chưa có'}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="password">Mật khẩu mới (để trống nếu không đổi)</Label>
                          <Input
                            id="password"
                            name="password"
                            type="text"
                            value={editForm.password}
                            onChange={handleEditFormChange}
                            placeholder="Nhập mật khẩu mới"
                            disabled={isSaving}
                            className="mt-3"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
                <Button
                  onClick={() => setShowEditModal(false)}
                  variant="outline"
                  disabled={isSaving}
                  className="flex-1"
                >
                  Hủy
                </Button>
              </div>
            </div>
          </div>
         </div>
       )}

     </div>
   );
 };

// Component cho các dòng thông tin
const InfoRow = ({ label, value }) => (
  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
    <div className="flex-1">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-gray-800">{value}</div>
    </div>
  </div>
);

export default DoctorProfile;
