import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getPatientByUserId, updatePatient as updatePatientService } from '@/services/patientService';
import { getCurrentUserFromStorage, getToken } from '@/utils/auth';
import { apiCall } from '@/utils/api';
import { getMedicalRecordsByPatient } from '@/services/medicalRecordService';

const PatientProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [notesText, setNotesText] = useState('');
  
  const currentUser = getCurrentUserFromStorage();
  const canEdit = !!(currentUser && ['admin', 'receptionist'].includes(currentUser.role));
  const canViewNotes = !!(currentUser && (
    ['admin', 'receptionist', 'doctor'].includes(currentUser.role) ||
    (currentUser.role === 'patient' && currentUser.id === userId)
  ));
  const canBookAppointment = currentUser ? currentUser.role !== 'doctor' : false;
  
  // Form chỉnh sửa thông tin bệnh nhân
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'male',
    address: ''
  });

  // Tải lịch sử khám bệnh của bệnh nhân
  const loadMedicalHistory = useCallback(async (patientId) => {
    if (!patientId) {
      return;
    }
    
    setIsLoadingHistory(true);
    try {
      const result = await getMedicalRecordsByPatient(patientId);
      
      
      if (result.success && result.data) {
        const records = result.data.medical_records || [];
        setMedicalHistory(records);
      } else {
        console.error('Failed to load medical history:', result.error);
        showToast(result.error || 'Không thể tải lịch sử khám bệnh', 'error');
      }
    } catch (error) {
      console.error('Error loading medical history:', error);
      showToast('Lỗi khi tải lịch sử khám bệnh', 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Tải dữ liệu bệnh nhân khi component được mount
  useEffect(() => {
    const loadPatientData = async () => {
      const currentUser = getCurrentUserFromStorage();
      if (!currentUser || !['receptionist', 'doctor', 'admin', 'patient'].includes(currentUser.role)) {
        setError('Bạn không có quyền xem thông tin bệnh nhân này');
        setIsLoading(false);
        return;
      }

      if (!userId) {
        setError('Không tìm thấy thông tin bệnh nhân');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await getPatientByUserId(userId);
        
        console.log('Patient data received:', result);
        
        if (result.success && result.data) {
          setPatient(result.data);
          setNotesText(result.data.notes || '');
          console.log('Patient user_id:', result.data.user_id);
          console.log('Patient _id:', result.data._id);
          console.log('Patient data structure:', result.data);
          setError(null);
          
          await loadMedicalHistory(result.data._id);
        } else {
          console.error('Failed to load patient:', result.error);
          setError(result.error || 'Không thể tải thông tin bệnh nhân');
        }
      } catch (err) {
        console.error('Error loading patient:', err);
        setError('Lỗi khi tải thông tin bệnh nhân');
      } finally {
        setIsLoading(false);
      }
    };

    loadPatientData();
  }, [userId, loadMedicalHistory]);

  // Hiển thị thông báo
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Mở modal chỉnh sửa thông tin bệnh nhân
  const openEditModal = () => {
    if (!canEdit) return; 
    if (patient?.user_id) {
      const userInfo = patient.user_id;
      
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
        address: userInfo.address || ''
      });
      setNotesText(patient?.notes || '');
      setShowEditModal(true);
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

  // Lưu thay đổi thông tin bệnh nhân
  const handleSaveChanges = async () => {
    if (!patient?.user_id?._id) return;

    setIsSaving(true);
    try {
      const token = getToken();
      const response = await apiCall(`/users/${patient.user_id._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      if (response.success) {
        const notesChanged = (patient?.notes || '') !== (notesText || '');
        if (notesChanged && patient?._id) {
          setSavingNotes(true);
          const saveNotesRes = await updatePatientService(patient._id, { notes: notesText });
          if (!saveNotesRes.success) {
            showToast(saveNotesRes.error || 'Không thể lưu ghi chú', 'error');
          }
          setSavingNotes(false);
        }

        showToast('Cập nhật thông tin thành công!', 'success');
        setShowEditModal(false);
        const result = await getPatientByUserId(userId);
        if (result.success && result.data) {
          setPatient(result.data);
          setNotesText(result.data.notes || '');
        }
      } else {
        showToast(response.error || 'Có lỗi xảy ra khi cập nhật', 'error');
      }
    } catch (error) {
      console.error('Error updating patient:', error);
      showToast('Lỗi khi cập nhật thông tin', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Định dạng ngày tháng
  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa có thông tin';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Tính tuổi từ ngày sinh
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-white relative overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông tin bệnh nhân...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-white relative overflow-hidden flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Có lỗi xảy ra</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => navigate(-1)} variant="outline">
                Quay lại
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userInfo = patient?.user_id;

  console.log('Patient state:', patient);
  console.log('Patient _id:', patient?._id);
  console.log('Button should be disabled:', !patient?._id);

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

      <header className="bg-white shadow-sm border-b border-gray-200 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Hồ sơ bệnh nhân</h1>
              <p className="text-gray-600">Thông tin chi tiết bệnh nhân</p>
            </div>
            <div className="flex gap-3">
              {canEdit && (
                <Button variant="default" className="bg-green-600 hover:bg-green-700 text-black" onClick={openEditModal}>
                  Chỉnh sửa
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate(-1)}>
                ← Quay lại
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Thông tin cơ bản */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-lg font-semibold text-blue-700 flex items-center gap-2">
                  Thông tin cá nhân
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-4xl text-blue-600">
                      {userInfo?.gender === 'male' ? '👨' : userInfo?.gender === 'female' ? '👩' : '🧑'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {userInfo?.full_name || 'Chưa có tên'}
                  </h2>
                  <Badge variant="outline" className="mt-2">
                    Bệnh nhân
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <div className="flex items-start gap-2 mb-3">
                      <span className="text-gray-500 text-sm min-w-[100px]">Điện thoại:</span>
                      <span className="text-gray-800 font-medium text-sm">
                        {userInfo?.phone || 'Chưa có'}
                      </span>
                    </div>
                    
                    <div className="flex items-start gap-2 mb-3">
                      <span className="text-gray-500 text-sm min-w-[100px]">Email:</span>
                      <span className="text-gray-800 font-medium text-sm break-all">
                        {userInfo?.email || 'Chưa có'}
                      </span>
                    </div>
                    
                    <div className="flex items-start gap-2 mb-3">
                      <span className="text-gray-500 text-sm min-w-[100px]">Ngày sinh:</span>
                      <span className="text-gray-800 font-medium text-sm">
                        {formatDate(userInfo?.dob)}
                        {userInfo?.dob && (
                          <span className="text-gray-500 ml-2">
                            ({calculateAge(userInfo.dob)} tuổi)
                          </span>
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-start gap-2 mb-3">
                      <span className="text-gray-500 text-sm min-w-[100px]">Giới tính:</span>
                      <span className="text-gray-800 font-medium text-sm">
                        {userInfo?.gender === 'male' ? 'Nam' : userInfo?.gender === 'female' ? 'Nữ' : 'Khác'}
                      </span>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 text-sm min-w-[100px]">Địa chỉ:</span>
                      <span className="text-gray-800 font-medium text-sm">
                        {userInfo?.address || 'Chưa có'}
                      </span>
                    </div>
                    {canViewNotes && (patient?.notes || '').trim() !== '' && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                        <div className="text-sm text-gray-600 mb-1">Ghi chú</div>
                        <div className="text-sm text-gray-800 whitespace-pre-wrap">{patient?.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Đặt lịch hẹn */}
            {canBookAppointment && (
              <Card className="mt-6 relative z-10">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-purple-700">
                    Đặt lịch hẹn
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <Button 
                    className="w-full text-white bg-purple-600 hover:bg-purple-700 relative z-10"
                    disabled={!patient?._id}
                    onClick={() => {
                      console.log('=== BUTTON CLICKED ===');
                      console.log('Patient data when clicking book appointment:', patient);
                      console.log('Patient ID:', patient?._id);
                      console.log('Button disabled state:', !patient?._id);
                      if (patient?._id) {
                        console.log('Navigating to appointment with patientId:', patient._id);
                        navigate('/appointmentHome', { state: { patientId: patient._id } });
                      } else {
                        console.error('Cannot book appointment: patient data not loaded');
                        showToast('Không thể đặt lịch hẹn: Thiếu thông tin bệnh nhân', 'error');
                      }
                    }}
                  >
                    {!patient?._id ? 'Đang tải...' : 'Đặt lịch hẹn'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Lịch sử khám bệnh */}
          <div className="lg:col-span-2 space-y-6">
            
            <Card>
              <CardHeader className="bg-green-50">
                <CardTitle className="text-lg font-semibold text-green-700 flex items-center gap-2">
                  Lịch sử khám bệnh
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {isLoadingHistory ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Đang tải lịch sử...</p>
                  </div>
                ) : medicalHistory.length > 0 ? (
                  <div className="space-y-4">
                    {medicalHistory.map((record, index) => (
                      <div key={record._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-semibold text-green-700">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">
                                {formatDate(record.createdAt)}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            Đã khám
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <span className="font-semibold text-gray-700">Bác sĩ: </span>
                            <span className="text-gray-800">
                              BS. {record.doctor_id?.user_id?.full_name || 'Chưa có'}
                            </span>
                          </div>
                          
                          <div>
                            <span className="font-semibold text-gray-700">Chẩn đoán: </span>
                            <span className="text-gray-800">{record.diagnosis}</span>
                          </div>
                          
                          <div>
                            <span className="font-semibold text-gray-700">Điều trị: </span>
                            <span className="text-gray-800">{record.treatment}</span>
                          </div>

                          <div>
                            <span className="font-semibold text-gray-700">Lời khuyên: </span>
                            <span className="text-gray-800">{record.notes}</span>
                          </div>
                          
                          {record.medications_prescribed && record.medications_prescribed.length > 0 && (
                            <div>
                              <span className="font-semibold text-gray-700">Đơn thuốc: </span>
                              <div className="mt-2 space-y-1">
                                {record.medications_prescribed.map((med, idx) => (
                                  <div key={idx} className="text-sm text-gray-700 pl-4">
                                    • {med.medicine_name} - Số lượng: {med.quantity} - Liều dùng: {med.dosage} - Tần suất: {med.frequency}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {record.follow_up_recommendations && (
                            <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                              <span className="font-semibold text-gray-700">Khuyến nghị: </span>
                              <span className="text-gray-700">{record.follow_up_recommendations}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📋</div>
                    <p>Chưa có lịch sử khám bệnh</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Chỉnh sửa thông tin bệnh nhân</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Họ và tên *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={editForm.full_name}
                  onChange={handleEditFormChange}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditFormChange}
                  placeholder="0123456789"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={editForm.email}
                  onChange={handleEditFormChange}
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <Label htmlFor="dob">Ngày sinh</Label>
                <Input
                  id="dob"
                  name="dob"
                  type="date"
                  value={editForm.dob}
                  onChange={handleEditFormChange}
                />
              </div>

              <div>
                <Label htmlFor="gender">Giới tính</Label>
                <select
                  id="gender"
                  name="gender"
                  value={editForm.gender}
                  onChange={handleEditFormChange}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <Input
                  id="address"
                  name="address"
                  value={editForm.address}
                  onChange={handleEditFormChange}
                  placeholder="123 Đường ABC, Quận XYZ"
                />
              </div>

              {/* Chỉnh sửa ghi chú trong modal chỉnh sửa */}
              <div className="md:col-span-2">
                <Label htmlFor="notes">Ghi chú</Label>
                <textarea
                  id="notes"
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md min-h-[120px]"
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Nhập ghi chú cho bệnh nhân này..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowEditModal(false)}
                disabled={isSaving}
              >
                Hủy
              </Button>
              <Button 
                onClick={handleSaveChanges}
                disabled={isSaving || savingNotes}
              >
                {isSaving ? 'Đang lưu...' : (savingNotes ? 'Đang lưu ghi chú...' : 'Lưu thay đổi')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientProfile;
