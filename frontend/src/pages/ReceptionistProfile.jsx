import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getReceptionistByUserId, deleteReceptionist, reactivateReceptionist } from '@/services/receptionistService';
import { getCurrentUserFromStorage, getToken } from '@/utils/auth';
import { apiCall } from '@/utils/api';

 
const ReceptionistProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [receptionist, setReceptionist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  // Hiển thị thông báo
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Tải dữ liệu lễ tân
  useEffect(() => {
    const loadData = async () => {
      const current = getCurrentUserFromStorage();
      if (!current || current.role !== 'admin') {
        setError('Bạn không có quyền xem hồ sơ lễ tân này');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const res = await getReceptionistByUserId(userId);
        if (res.success && res.data) {
          setReceptionist(res.data);
        } else {
          setError(res.error || 'Không tìm thấy lễ tân');
        }
      } catch (err) {
        console.error('Error loading receptionist:', err);
        setError('Lỗi khi tải hồ sơ lễ tân');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userId]);

  // format ngày sinh
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

  // Mở modal chỉnh sửa
  const openEditModal = () => {
    if (receptionist?.user_id) {
      const userInfo = receptionist.user_id;
      
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
      
      setEditForm({
        full_name: userInfo.full_name || '',
        phone: userInfo.phone || '',
        email: userInfo.email || '',
        dob: formattedDob,
        gender: userInfo.gender || 'male',
        address: userInfo.address || '',
        username: userInfo.username || '',
        password: ''
      });
      setShowEditModal(true);
    } else {
      showToast('Không tìm thấy thông tin lễ tân', 'error');
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

  // Xử lý lưu thay đổi thông tin lễ tân
  const handleSaveChanges = async () => {
    if (!receptionist?.user_id?._id) {
      showToast('Không tìm thấy thông tin người dùng', 'error');
      return;
    }

    try {
      setIsSaving(true);
      
      const token = getToken();
      if (!token) {
        showToast('Vui lòng đăng nhập lại', 'error');
        return;
      }

      const updateData = { ...editForm };
      
      // Nếu không có password, xóa trường password khỏi updateData
      if (!updateData.password || updateData.password.trim() === '') {
        delete updateData.password;
      }
      
      const result = await apiCall(`/users/${receptionist.user_id._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (result.success) {

        const updatedReceptionist = await getReceptionistByUserId(userId);
        if (updatedReceptionist.success) {
          setReceptionist(updatedReceptionist.data);
        }
        
        showToast('Cập nhật thông tin thành công!', 'success');
        setShowEditModal(false);
      } else {
        showToast(result.error || 'Không thể cập nhật thông tin', 'error');
      }
    } catch (error) {
      console.error('Error updating receptionist info:', error);
      showToast('Lỗi khi cập nhật thông tin', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!receptionist?._id) return;

    if (!confirm('Bạn có chắc muốn xóa lễ tân này? Hành động không thể hoàn tác.')) return;

    try {
      setIsDeleting(true);
      const res = await deleteReceptionist(receptionist._id);
      if (res.success) {
        showToast('Xóa lễ tân thành công', 'success');
        navigate('/admin');
      } else {
        showToast(res.error || 'Xóa lễ tân thất bại', 'error');
      }
    } catch (err) {
      console.error('Error deleting receptionist:', err);
      showToast('Có lỗi xảy ra khi xóa', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReactivate = async () => {
    if (!receptionist?._id) return;

    if (!confirm('Bạn có chắc muốn kích hoạt lại tài khoản lễ tân này?')) return;

    try {
      setIsDeleting(true);
      const res = await reactivateReceptionist(receptionist._id);
      if (res.success) {
        showToast('Đã kích hoạt lại tài khoản thành công', 'success');
        
        const receptionistRes = await getReceptionistByUserId(userId);
        if (receptionistRes.success && receptionistRes.data) {
          setReceptionist(receptionistRes.data);
        }
      } else {
        showToast(res.error || 'Kích hoạt lại thất bại', 'error');
      }
    } catch (err) {
      console.error('Error reactivating receptionist:', err);
      showToast('Có lỗi xảy ra khi kích hoạt lại', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-white relative overflow-hidden p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải hồ sơ lễ tân...</p>
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
                <div className="text-6xl mb-4">❌</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Lỗi</h2>
                <p className="text-gray-600">{error}</p>
                <Button onClick={() => navigate(-1)} className="mt-4">Quay lại</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const user = receptionist?.user_id;

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
        <div className="mb-6 flex items-center justify-between">
          <Button onClick={() => navigate(-1)} variant="outline" className="flex items-center gap-2">
            <span>←</span>
            Quay lại
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">Hồ sơ lễ tân</h1>
          <div className="w-24"></div>
        </div>

  <Card className="border-2 border-blue-200 shadow-lg relative z-10">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {user?.full_name?.charAt(0) || 'R'}
                </div>
                <div>
                  <CardTitle className="text-2xl mb-2">{user?.full_name || 'Chưa có tên'}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className="bg-blue-100 text-blue-800">Lễ tân</Badge>
                    <Badge className={user?.employment_status === false ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}>
                      {user?.employment_status === false ? 'Đã nghỉ việc' : 'Đang làm việc'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={openEditModal} 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Chỉnh sửa
                </Button>
                {getCurrentUserFromStorage()?.role === 'admin' && (
                  <>
                    {user?.employment_status === false ? (
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
                        {isDeleting ? 'Đang xóa...' : '🗑️ Xóa lễ tân'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Thông tin cá nhân</h3>
                <InfoRow label="Email" value={user?.email || 'Chưa có'} />
                <InfoRow label="Số điện thoại" value={user?.phone || 'Chưa có'} />
                <InfoRow label="Ngày sinh" value={formatDate(user?.dob)} />
                <InfoRow label="Giới tính" value={user?.gender === 'male' ? 'Nam' : 'Nữ'} />
                <InfoRow label="Địa chỉ" value={user?.address || 'Chưa có'} />
                <InfoRow label="Tình trạng làm việc" value={user?.employment_status === false ? 'Đã nghỉ việc' : 'Đang làm việc'} />
                <InfoRow label="Ngày tạo hồ sơ" value={formatDate(receptionist?.createdAt)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal chỉnh sửa thông tin */}
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

                {/* Hiển thị thêm username và password nếu là admin */}
                {getCurrentUserFromStorage()?.role === 'admin' && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Thông tin đăng nhập</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="username">Tên đăng nhập</Label>
                        <div className="mt-3 text-sm text-gray-700 font-medium">
                          {receptionist?.user_id?.username || 'Chưa có'}
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
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
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

const InfoRow = ({ label, value }) => (
  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
    <div className="flex-1">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-gray-800">{value}</div>
    </div>
  </div>
);

export default ReceptionistProfile;
