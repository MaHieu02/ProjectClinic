import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserFromStorage, authenticatedApiCall } from '@/utils/auth';
import { getMedicalRecordByAppointment } from '@/services/medicalRecordService';

const RevenueReport = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);

  // Xử lý thay đổi bộ lọc
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    doctorId: '',
    patientId: '',
    status: ''
  });
  // Tổng quan báo cáo
  const [summary, setSummary] = useState({
    totalAppointments: 0,
    totalExaminationFee: 0,
    totalMedicineFee: 0,
    totalRevenue: 0
  });

  // Kiểm tra quyền truy cập
  useEffect(() => {
    const user = getCurrentUserFromStorage();
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
    loadDoctors();
    loadPatients();
  }, [navigate]);

  // Lọc bệnh nhân theo từ khóa tìm kiếm
  useEffect(() => {

    if (patientSearch.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const searchLower = patientSearch.toLowerCase();
      const filtered = patients.filter(patient => {
        const fullName = patient.user_id?.full_name?.toLowerCase() || '';
        const phone = patient.user_id?.phone || '';
        return fullName.includes(searchLower) || phone.includes(searchLower);
      });
      setFilteredPatients(filtered);
    }
  }, [patientSearch, patients]);

  // Tải danh sách bác sĩ
  const loadDoctors = async () => {
    try {
      const result = await authenticatedApiCall('/doctors');
      if (result.success && result.data?.doctors) {
        setDoctors(result.data.doctors);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  // Tải danh sách bệnh nhân
  const loadPatients = async () => {
    try {
      const result = await authenticatedApiCall('/patients');
      if (result.success && result.data?.patients) {
        setPatients(result.data.patients);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  // Tải báo cáo doanh thu
  const loadReport = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate
      });

      if (filters.doctorId) params.append('doctor_id', filters.doctorId);
      if (filters.patientId) params.append('patient_id', filters.patientId);
      if (filters.status) params.append('status', filters.status);

      const result = await authenticatedApiCall(`/reports/revenue-detail?${params.toString()}`);
      
      if (result.success && result.data) {
        console.log('Revenue report data:', result.data.appointments);
        setReportData(result.data.appointments || []);
        setSummary({
          totalAppointments: result.data.summary?.totalAppointments || 0,
          totalExaminationFee: result.data.summary?.totalExaminationFee || 0,
          totalMedicineFee: result.data.summary?.totalMedicineFee || 0,
          totalRevenue: result.data.summary?.totalRevenue || 0
        });
      }
    } catch (error) {
      console.error('Error loading report:', error);
      alert('Có lỗi khi tải báo cáo');
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý thay đổi bộ lọc
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Xử lý tìm kiếm báo cáo
  const handleSearch = () => {
    loadReport();
  };

  // Xử lý xem đơn thuốc
  const handleViewPrescription = async (appointmentId) => {
    try {
      setLoadingPrescription(true);
      const response = await getMedicalRecordByAppointment(appointmentId);
      if (response.success && response.data) {
        setSelectedPrescription(response.data);
        setShowPrescriptionModal(true);
      } else {
        alert('Không tìm thấy đơn thuốc cho lịch hẹn này');
      }
    } catch (err) {
      console.error('Error loading prescription:', err);
      alert('Không thể tải đơn thuốc');
    } finally {
      setLoadingPrescription(false);
    }
  };

  // Hiển thị màu sắc cho trạng thái
  const getStatusBadgeColor = (status) => {
    const colors = {
      booked: 'bg-yellow-100 text-yellow-800',
      checked: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      late: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Hiển thị trạng thái
  const getStatusText = (status) => {
    const texts = {
      booked: 'Đã đặt',
      checked: 'Chờ khám',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
      late: 'Trễ hẹn'
    };
    return texts[status] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Báo cáo doanh thu</h1>
            <p className="text-gray-600">Xem chi tiết doanh thu theo lịch hẹn</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            ← Quay lại
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Bộ lọc */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Bộ lọc báo cáo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">Từ ngày</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="endDate">Đến ngày</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="status">Trạng thái</Label>
                <select
                  id="status"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm mt-1"
                >
                  <option value="">Tất cả</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="checked">Chờ khám</option>
                  <option value="booked">Đã đặt</option>
                  <option value="cancelled">Đã hủy</option>
                  <option value="late">Trễ hẹn</option>
                </select>
              </div>

              <div>
                <Label htmlFor="doctorId">Bác sĩ</Label>
                <select
                  id="doctorId"
                  name="doctorId"
                  value={filters.doctorId}
                  onChange={handleFilterChange}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm mt-1"
                >
                  <option value="">Tất cả bác sĩ</option>
                  {doctors.map(doctor => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor.user_id?.full_name} - {doctor.specialty_id?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="patientSearch">Bệnh nhân</Label>
                <div className="relative">
                  <Input
                    id="patientSearch"
                    type="text"
                    placeholder="Tìm theo tên hoặc SĐT..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="mt-1"
                  />
                  {patientSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      <div
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b"
                        onClick={() => {
                          setFilters(prev => ({ ...prev, patientId: '' }));
                          setPatientSearch('');
                        }}
                      >
                        <div className="font-medium">Tất cả bệnh nhân</div>
                      </div>
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map(patient => (
                          <div
                            key={patient._id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setFilters(prev => ({ ...prev, patientId: patient._id }));
                              setPatientSearch(patient.user_id?.full_name || '');
                            }}
                          >
                            <div className="font-medium">{patient.user_id?.full_name}</div>
                            <div className="text-xs text-gray-500">{patient.user_id?.phone || 'Chưa có SĐT'}</div>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          Không tìm thấy bệnh nhân
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-end gap-2 ">
                <Button onClick={handleSearch} disabled={isLoading} className="flex-1">
                  {isLoading ? 'Đang tải...' : '🔍 Tìm kiếm'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tổng quan */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600">Tổng lịch hẹn</div>
              <div className="text-2xl font-bold text-blue-600">{summary.totalAppointments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600">Tổng phí khám</div>
              <div className="text-2xl font-bold text-green-600">
                {summary.totalExaminationFee.toLocaleString('vi-VN')} VNĐ
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600">Tổng tiền thuốc</div>
              <div className="text-2xl font-bold text-purple-600">
                {summary.totalMedicineFee.toLocaleString('vi-VN')} VNĐ
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-600">Tổng doanh thu</div>
              <div className="text-2xl font-bold text-orange-600">
                {summary.totalRevenue.toLocaleString('vi-VN')} VNĐ
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Danh sách chi tiết */}
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết lịch hẹn ({reportData.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {isLoading ? 'Đang tải dữ liệu...' : 'Không có dữ liệu. Vui lòng chọn bộ lọc và tìm kiếm.'}
              </div>
            ) : (
              <div className="space-y-4">
                {reportData.map((appointment) => (
                  <div key={appointment._id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusBadgeColor(appointment.status)}>
                          {getStatusText(appointment.status)}

                        </Badge>

                        <span className="text-sm text-gray-600">
                          {new Date(appointment.appointment_time).toLocaleDateString('vi-VN')} - {new Date(appointment.appointment_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-orange-600">
                          {(appointment.totalCost || 0).toLocaleString('vi-VN')} VNĐ
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Thông tin bệnh nhân */}
                      <div className="space-y-2">
                        <div className="font-semibold text-gray-900">👤 Bệnh nhân</div>
                        <div className="text-sm space-y-1">
                          <div><span className="font-medium">Họ tên:</span> {appointment.patient_id?.user_id?.full_name || 'Chưa có'}</div>
                          <div><span className="font-medium">SĐT:</span> {appointment.patient_id?.user_id?.phone || 'Chưa có'}</div>
                          <div><span className="font-medium">Email:</span> {appointment.patient_id?.user_id?.email || 'Chưa có'}</div>
                        </div>
                      </div>

                      {/* Thông tin bác sĩ */}
                      <div className="space-y-2">
                        <div className="font-semibold text-gray-900">👨‍⚕️ Bác sĩ</div>
                        <div className="text-sm space-y-1">
                          <div><span className="font-medium">Họ tên:</span> {appointment.doctor_id?.user_id?.full_name}</div>
                          <div><span className="font-medium">Chuyên khoa:</span> {appointment.doctor_id?.specialty_id?.name}</div>
                        </div>
                      </div>

                      {/* Thông tin dịch vụ khám */}
                      <div className="space-y-2">
                        <div className="font-semibold text-gray-900">💊 Dịch vụ khám</div>
                        <div className="text-sm space-y-1">
                          <div><span className="font-medium">Loại:</span> {appointment.examination_type || appointment.examination_fee_id?.examination_type || 'Chưa xác định'}</div>
                          <div>
                            <span className="font-medium">Phí khám:</span> 
                            <span className="text-green-600 font-semibold ml-2">
                              {(appointment.examination_fee || 0).toLocaleString('vi-VN')} VNĐ
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Thông tin đơn thuốc */}
                      <div className="space-y-2">
                        <div className="font-semibold text-gray-900">💉 Đơn thuốc</div>
                        {appointment.medical_record_id && appointment.medical_record_id.medications_prescribed?.length > 0 ? (
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="font-medium">Số lượng thuốc:</span> {appointment.medical_record_id.medications_prescribed.length}
                            </div>
                            <div>
                              <span className="font-medium">Tiền thuốc:</span>
                              <span className="text-purple-600 font-semibold ml-2">
                                {(appointment.medicineCost || 0).toLocaleString('vi-VN')} VNĐ
                              </span>
                            </div>
                            {appointment.medical_record_id?.status && (
                              <div>
                                <span className="font-medium">Trạng thái:</span>
                                <Badge className={appointment.medical_record_id.status === 'dispensed' ? 'bg-green-100 text-green-800 ml-2' : 'bg-yellow-100 text-yellow-800 ml-2'}>
                                  {appointment.medical_record_id.status === 'dispensed' ? 'Đã phát thuốc' : 'Chưa phát thuốc'}
                                </Badge>
                              </div>
                            )}
                            {appointment.status === 'completed' && (
                              <div className="mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewPrescription(appointment._id)}
                                  disabled={loadingPrescription}
                                  className="text-xs"
                                >
                                  📋 Xem đơn thuốc
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Chưa có đơn thuốc</div>
                        )}
                      </div>
                    </div>

                    {appointment.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-sm font-medium text-gray-700">Ghi chú:</span>
                        <p className="text-sm text-gray-600 mt-1">{appointment.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal xem đơn thuốc */}
      {showPrescriptionModal && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">💊 Đơn thuốc</h2>
                <button
                  onClick={() => setShowPrescriptionModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Bệnh nhân</div>
                      <div className="font-medium">{selectedPrescription.patient_id?.user_id?.full_name || 'Chưa có'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Bác sĩ</div>
                      <div className="font-medium">{selectedPrescription.doctor_id?.user_id?.full_name || 'Chưa có'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Ngày khám</div>
                      <div className="font-medium">
                        {selectedPrescription.createdAt ? new Date(selectedPrescription.createdAt).toLocaleDateString('vi-VN') : 'Chưa có'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Trạng thái</div>
                      <div className="font-medium">
                        <Badge className={selectedPrescription.status === 'dispensed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {selectedPrescription.status === 'dispensed' ? 'Đã xuất thuốc' : 'Chưa xuất thuốc'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedPrescription.diagnosis && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">🔍 Chẩn đoán</div>
                    <div className="font-medium">{selectedPrescription.diagnosis}</div>
                  </div>
                )}

                {selectedPrescription.symptoms && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">🤒 Triệu chứng</div>
                    <div className="font-medium">{selectedPrescription.symptoms}</div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-lg mb-3">📋 Danh sách thuốc</h3>
                  {selectedPrescription.medications_prescribed && selectedPrescription.medications_prescribed.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPrescription.medications_prescribed.map((med, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Tên thuốc</div>
                              <div className="font-medium">{med.medicine_id?.name || 'Chưa có'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Số lượng</div>
                              <div className="font-medium">{med.quantity} {med.medicine_id?.unit || 'viên'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Liều lượng</div>
                              <div className="font-medium">{med.dosage || 'Chưa có'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Giá</div>
                              <div className="font-medium text-green-600">
                                {(med.medicine_id?.price || 0).toLocaleString('vi-VN')} VNĐ
                              </div>
                            </div>
                          </div>
                          {med.instructions && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <div className="text-xs text-gray-500">Hướng dẫn sử dụng</div>
                              <div className="text-sm">{med.instructions}</div>
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Tổng tiền thuốc:</span>
                          <span className="text-xl font-bold text-green-600">
                            {selectedPrescription.medications_prescribed.reduce((sum, med) => 
                              sum + (med.quantity * (med.medicine_id?.price || 0)), 0
                            ).toLocaleString('vi-VN')} VNĐ
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">💊</div>
                      <p>Không có thuốc được kê đơn</p>
                    </div>
                  )}
                </div>

                {selectedPrescription.notes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">📝 Ghi chú</div>
                    <div className="text-sm">{selectedPrescription.notes}</div>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <Button
                  onClick={() => setShowPrescriptionModal(false)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueReport;
