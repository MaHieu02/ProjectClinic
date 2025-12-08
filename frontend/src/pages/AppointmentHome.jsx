import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUserFromStorage } from '@/utils/auth.js';
import { searchPatients, getPatientByUserId, getPatientById } from '@/services/patientService.js';
import { getDoctorsBySpecialty } from '@/services/doctorService.js';
import { createAppointment } from '@/services/appointmentService.js';
import { getActiveSpecialties } from '@/services/specialtyService.js';
import { getExaminationFeesBySpecialty } from '@/services/examinationFeeService.js';

const SEARCH_DEBOUNCE_DELAY = 500;
const TOAST_DURATION = 3000;

// Hàm helper để format ngày an toàn
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

const AppointmentHome = () => {
  const location = useLocation();
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_time: '',
    appointment_date: '',
    time_slot: '',
    specialty_id: '',
    examination_fee_id: '',
    symptoms: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [examinationFees, setExaminationFees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [bookingType, setBookingType] = useState('self');
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Hàm hiển thị thông báo
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, TOAST_DURATION);
  };

  // Tải danh sách chuyên khoa từ database
  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        const result = await getActiveSpecialties();
        if (result.success && result.data) {
          setSpecialties(Array.isArray(result.data) ? result.data : []);
        } else {
          setSpecialties([]);
          showToast('Không thể tải danh sách chuyên khoa', 'error');
        }
      } catch (error) {
        console.error('Error loading specialties:', error);
        setSpecialties([]);
        showToast('Lỗi khi tải danh sách chuyên khoa', 'error');
      }
    };

    loadSpecialties();
  }, []);

  // Tải thông tin người dùng và xác định kiểu đặt lịch
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = getCurrentUserFromStorage();
        if (user) {
          setCurrentUser(user);
          if (location.state?.patientId) {
            setBookingType('staff');
            try {
              console.log('Loading patient with ID:', location.state.patientId);
              const patientResult = await getPatientById(location.state.patientId);
              console.log('Patient result from profile:', patientResult);
              
              if (patientResult.success && patientResult.data) {
                setPatientInfo(patientResult.data);
                setSelectedPatient(patientResult.data);
                setFormData(prev => ({
                  ...prev,
                  patient_id: patientResult.data._id
                }));
                showToast(`Đang đặt lịch cho bệnh nhân: ${patientResult.data.user_id?.full_name}`, 'success');
              } else {
                console.error('Failed to load patient:', patientResult.error);
                showToast('Không thể tải thông tin bệnh nhân', 'error');
              }
            } catch (error) {
              console.error('Error loading patient:', error);
              showToast('Lỗi khi tải thông tin bệnh nhân', 'error');
            }
          } else if (user.role === 'patient') {
            setBookingType('self');
            const userId = user?.id || user?._id;
            if (!userId) {
              console.warn('Không tìm thấy userId trong local storage cho bệnh nhân');
              showToast('Không tìm thấy thông tin tài khoản. Vui lòng đăng nhập lại.', 'error');
              return;
            }
            const patientResult = await getPatientByUserId(userId);
            console.log('Patient result:', patientResult);
            if (patientResult.success && patientResult.data) {
              console.log('Patient data structure:', patientResult.data);
              setPatientInfo(patientResult.data);
              setFormData(prev => ({
                ...prev,
                patient_id: patientResult.data._id
              }));
            } else {
              console.warn('No patient record found for user:', userId);
              showToast('Không tìm thấy thông tin bệnh nhân. Vui lòng liên hệ lễ tân.', 'error');
            }
          } else if (user.role === 'receptionist' || user.role === 'doctor') {
            setBookingType('staff');
            showToast('Chế độ đặt lịch cho bệnh nhân. Vui lòng tìm kiếm và chọn bệnh nhân.', 'info');
          } else {
            showToast('Bạn không có quyền đặt lịch khám', 'error');
            setTimeout(() => {
              window.history.back();
            }, 2000);
          }
        } else {
          showToast('Vui lòng đăng nhập để đặt lịch khám', 'error');
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Có lỗi khi tải thông tin người dùng', 'error');
      }
    };

    loadUserData();
  }, [location.state]);

  // Tải danh sách bác sĩ và giá khám khi chuyên khoa thay đổi
  useEffect(() => {
    const loadDoctorsAndFees = async () => {
      if (formData.specialty_id) {
        setIsLoadingDoctors(true);
        setIsLoadingFees(true);
        
        try {
          const doctorResult = await getDoctorsBySpecialty(formData.specialty_id);
          console.log('Doctors result:', doctorResult);
          if (doctorResult.success && doctorResult.data) {
            const doctorsData = doctorResult.data.doctors || doctorResult.data;
            console.log('Doctors data:', doctorsData);
            setDoctors(Array.isArray(doctorsData) ? doctorsData : []);
          } else {
            setDoctors([]);
            showToast('Không thể tải danh sách bác sĩ', 'error');
          }
        } catch (error) {
          console.error('Error loading doctors:', error);
          setDoctors([]);
          showToast('Lỗi khi tải danh sách bác sĩ', 'error');
        } finally {
          setIsLoadingDoctors(false);
        }

        try {
          const feeResult = await getExaminationFeesBySpecialty(formData.specialty_id);
          console.log('Examination fees result:', feeResult);
          if (feeResult.success && feeResult.data) {
            const feesData = Array.isArray(feeResult.data) ? feeResult.data : [];
            console.log('Fees data:', feesData);
            setExaminationFees(feesData);
          } else {
            setExaminationFees([]);
          }
        } catch (error) {
          console.error('Error loading examination fees:', error);
          setExaminationFees([]);
        } finally {
          setIsLoadingFees(false);
        }
      } else {
        setDoctors([]);
        setExaminationFees([]);
        setFormData(prev => ({ ...prev, doctor_id: '', examination_fee_id: '' }));
      }
    };

    loadDoctorsAndFees();
  }, [formData.specialty_id]);

  // Tìm kiếm bệnh nhân khi nhân viên nhập từ khóa
  const handlePatientSearch = useCallback(async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearchingPatients(true);
    try {
      const result = await searchPatients(searchTerm.trim());
      
      if (result.success && result.data) {
        let patients = [];
        
        if (result.data.patients && Array.isArray(result.data.patients)) {
          patients = result.data.patients;
        } else if (Array.isArray(result.data)) {
          patients = result.data;
        }
        
        setSearchResults(patients);
        
        if (patients.length > 0) {
          showToast(`Tìm thấy ${patients.length} bệnh nhân`, 'info');
        } else {
          showToast('Không tìm thấy bệnh nhân nào phù hợp', 'warning');
        }
      } else {
        setSearchResults([]);
        showToast('Không thể tìm kiếm bệnh nhân: ' + (result.error || 'Lỗi không xác định'), 'error');
      }
    } catch (error) {
      setSearchResults([]);
      showToast('Lỗi khi tìm kiếm bệnh nhân: ' + error.message, 'error');
    } finally {
      setIsSearchingPatients(false);
    }
  }, []);

  // Xử lý khi chọn bệnh nhân từ kết quả tìm kiếm
  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({
      ...prev,
      patient_id: patient._id
    }));
    setPatientSearch('');
    setSearchResults([]);
    showToast(`Đã chọn bệnh nhân: ${patient.user_info?.full_name || 'Không có tên'}`, 'success');
  };

  // Xử lý thay đổi ô tìm kiếm bệnh nhân
  const handlePatientSearchChange = (e) => {
    const value = e.target.value;
    setPatientSearch(value);
    
    if (!value.trim()) {
      setSearchResults([]);
    }
  };

  // Debounce tìm kiếm bệnh nhân
  useEffect(() => {
    if (!patientSearch.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      handlePatientSearch(patientSearch);
    }, SEARCH_DEBOUNCE_DELAY);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [patientSearch, handlePatientSearch]);

  // Giờ khám
  const timeSlots = [
    '00:00', '00:15', '00:30', '00:45',
    '01:00', '01:15', '01:30', '01:45',
    '02:00', '02:15', '02:30', '02:45',
    '03:00', '03:15', '03:30', '03:45',
    '04:00', '04:15', '04:30', '04:45',
    '05:00', '05:15', '05:30', '05:45',
    '06:00', '06:15', '06:30', '06:45',
    '07:00', '07:15', '07:30', '07:45',
    '08:00', '08:15', '08:30', '08:45',
    '09:00', '09:15', '09:30', '09:45', 
    '10:00', '10:15', '10:30', '10:45',
    '11:00', '11:15', '11:30', '11:45',
    '12:00', '12:15', '12:30', '12:45',
    '13:00', '13:15', '13:30', '13:45',
    '14:00', '14:15', '14:30', '14:45',
    '15:00', '15:15', '15:30', '15:45', 
    '16:00', '16:15', '16:30', '16:45',
    '17:00', '17:15', '17:30', '17:45',
    '18:00', '18:15', '18:30', '18:45',
    '19:00', '19:15', '19:30', '19:45',
    '20:00', '20:15', '20:30', '20:45',
    '21:00', '21:15', '21:30', '21:45',
    '22:00', '22:15', '22:30', '22:45',
    '23:00', '23:15', '23:30', '23:45'
  ];

  // Xử lý thay đổi form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'specialty_id') {
      setFormData(prev => ({ ...prev, doctor_id: '', examination_fee_id: '' }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form trước khi submit
  const validateForm = () => {
    const newErrors = {};

    // Validation bệnh nhân - kiểm tra theo kiểu đặt lịch
    if (bookingType === 'self') {
      // Người dùng đặt cho chính họ
      if (!formData.patient_id || !patientInfo) {
        newErrors.patient_id = 'Không tìm thấy thông tin bệnh nhân. Vui lòng đăng nhập lại.';
      }
    } else if (bookingType === 'staff') {
      // Nhân viên đặt cho bệnh nhân
      if (!formData.patient_id || !selectedPatient) {
        newErrors.patient_id = 'Vui lòng tìm kiếm và chọn bệnh nhân.';
      }
    }
    if (!formData.specialty_id) {
      newErrors.specialty_id = 'Vui lòng chọn chuyên khoa';
    }
    if (!formData.doctor_id) {
      newErrors.doctor_id = 'Vui lòng chọn bác sĩ';
    }
    if (!formData.examination_fee_id) {
      newErrors.examination_fee_id = 'Vui lòng chọn loại hình khám';
    }
    if (!formData.appointment_date) {
      newErrors.appointment_date = 'Vui lòng chọn ngày khám';
    } else {
      const selectedDate = new Date(formData.appointment_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.appointment_date = 'Ngày khám không thể là ngày trong quá khứ';
      }
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 3);
      if (selectedDate > maxDate) {
        newErrors.appointment_date = 'Chỉ có thể đặt lịch trong vòng 3 tháng tới';
      }
    }
    if (!formData.time_slot) {
      newErrors.time_slot = 'Vui lòng chọn giờ khám';
    } else {
      const selectedTime = formData.time_slot;
      const timeSlotValid = timeSlots.includes(selectedTime);
      if (!timeSlotValid) {
        newErrors.time_slot = 'Giờ khám không hợp lệ';
      }
    }
    if (formData.symptoms.trim().length > 1000) {
      newErrors.symptoms = 'Mô tả triệu chứng không được quá 1000 ký tự';
    }
    if (formData.notes.trim().length > 500) {
      newErrors.notes = 'Ghi chú không được quá 500 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('Vui lòng kiểm tra lại thông tin', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const appointmentDateTime = new Date(`${formData.appointment_date}T${formData.time_slot}:00`);
      
      if (appointmentDateTime <= new Date()) {
        showToast('Thời gian đặt lịch phải trong tương lai', 'error');
        setIsLoading(false);
        return;
      }

      const appointmentData = {
        patient_id: formData.patient_id,
        doctor_id: formData.doctor_id,
        examination_fee_id: formData.examination_fee_id,
        appointment_time: appointmentDateTime.toISOString(),
        symptoms: formData.symptoms.trim(),
        notes: formData.notes.trim(),
        status: 'booked'
      };
      const missingFields = [];
      if (!appointmentData.patient_id) missingFields.push('patient_id');
      if (!appointmentData.doctor_id) missingFields.push('doctor_id');
      if (!appointmentData.examination_fee_id) missingFields.push('examination_fee_id');
      if (!appointmentData.appointment_time) missingFields.push('appointment_time');

      if (missingFields.length > 0) {
        showToast(`Thiếu thông tin bắt buộc: ${missingFields.join(', ')}`, 'error');
        setIsLoading(false);
        return;
      }

      const result = await createAppointment(appointmentData);
      
      if (result.success) {
        showToast('Đặt lịch khám thành công! Chúng tôi sẽ liên hệ với bạn sớm nhất.', 'success');
        
        // Reset form
        setFormData({
          patient_id: patientInfo?._id || '',
          doctor_id: '',
          appointment_time: '',
          appointment_date: '',
          time_slot: '',
          specialty_id: '',
          examination_fee_id: '',
          symptoms: '',
          notes: ''
        });
        setErrors({});
      } else {
        const errorMessage = result.error || 'Có lỗi xảy ra khi đặt lịch';
        
        if (errorMessage.includes('Bác sĩ đã có lịch hẹn')) {
          showToast('Bác sĩ đã có lịch hẹn vào thời gian này. Vui lòng chọn thời gian khác.', 'error');
          setErrors(prev => ({ ...prev, time_slot: 'Thời gian này đã được đặt' }));
        } else if (errorMessage.includes('Không tìm thấy bệnh nhân')) {
          showToast('Không tìm thấy thông tin bệnh nhân. Vui lòng đăng nhập lại.', 'error');
        } else if (errorMessage.includes('Không tìm thấy bác sĩ')) {
          showToast('Bác sĩ không có sẵn. Vui lòng chọn bác sĩ khác.', 'error');
          setErrors(prev => ({ ...prev, doctor_id: 'Bác sĩ không có sẵn' }));
        } else {
          showToast(errorMessage, 'error');
        }
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      showToast('Có lỗi kết nối đến server. Vui lòng thử lại sau!', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden">
      {/* Thông báo */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm ${
          toast.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700'
            : toast.type === 'info'
            ? 'bg-blue-100 border border-blue-400 text-blue-700'
            : toast.type === 'warning'
            ? 'bg-yellow-100 border border-yellow-400 text-yellow-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              toast.type === 'success' ? 'bg-green-500' : 
              toast.type === 'info' ? 'bg-blue-500' : 
              toast.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
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
        <div className="w-full max-w-2xl mb-6">
          <h1 className="text-3xl text-center font-bold mb-2 text-gray-800">
            Đặt lịch khám bệnh
          </h1>
          <p className="text-center text-lg text-gray-600">
            Điền thông tin để đặt lịch khám với bác sĩ
          </p>
        </div>
        
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7h2a2 2 0 012 2v6.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 01-1.414 0l-6.586-6.586A1 1 0 015 15.414V9a2 2 0 012-2h2V7" />
              </svg>
              Thông tin đặt lịch
            </CardTitle>
            <CardDescription>
              Vui lòng điền đầy đủ thông tin để chúng tôi có thể sắp xếp lịch khám phù hợp
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Thông tin bệnh nhân */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Thông tin bệnh nhân
                </h3>
                
                {/* Kiểu 1: Người dùng đặt lịch cho chính họ */}
                {bookingType === 'self' && currentUser && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Bệnh nhân:</strong> {currentUser.full_name}
                    </p>
                    {patientInfo && (
                      <div className="mt-2 text-sm text-blue-700">
                        <p><strong>SĐT:</strong> {patientInfo.user_id?.phone || 'Chưa có'}</p>
                        <p><strong>Ngày sinh:</strong> {formatDate(patientInfo.user_id?.dob)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Kiểu 2: Nhân viên đặt lịch cho bệnh nhân */}
                {bookingType === 'staff' && (
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Người đặt lịch:</strong> {currentUser?.full_name}
                      </p>
                      <p className="text-sm text-green-600">
                        {selectedPatient 
                          ? `Đang đặt lịch cho: ${selectedPatient.user_id?.full_name || 'Bệnh nhân'}` 
                          : 'Chế độ đặt lịch cho bệnh nhân'
                        }
                      </p>
                      {selectedPatient && location.state?.patientId && (
                        <p className="text-xs text-green-500 mt-1">
                          ✓ Đã chọn bệnh nhân từ hồ sơ
                        </p>
                      )}
                    </div>

                    {!selectedPatient ? (
                      <>
                        {/* Tìm kiếm bệnh nhân */}
                        <div className="space-y-2">
                          <Label htmlFor="patient_search" className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Tìm kiếm bệnh nhân *
                          </Label>
                          <div className="relative">
                            <Input
                              id="patient_search"
                              type="text"
                              placeholder="Nhập tên bệnh nhân hoặc số điện thoại để tìm kiếm..."
                              value={patientSearch}
                              onChange={handlePatientSearchChange}
                            />
                            {patientSearch && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPatientSearch('');
                                  setSearchResults([]);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                            {isSearchingPatients && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                              </div>
                            )}
                          </div>
                          {errors.patient_id && <span className="text-red-500 text-sm">{errors.patient_id}</span>}
                        </div>
                        
                        {/* Kết quả tìm kiếm */}
                        {searchResults.length > 0 && (
                      <div className="border rounded-lg p-4 bg-white shadow-sm max-h-64 overflow-y-auto">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Tìm thấy {searchResults.length} bệnh nhân:
                        </h4>
                        <div className="space-y-2">
                          {searchResults.map((patient) => (
                            <div
                              key={patient._id}
                              className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200 group"
                              onClick={() => handleSelectPatient(patient)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center mb-1">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                      <span className="text-sm font-semibold text-blue-600">
                                        {patient.user_info?.full_name?.charAt(0).toUpperCase() || 'N'}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900 group-hover:text-blue-700">
                                        {patient.user_info?.full_name || 'Không có tên'}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        Mã BN: {patient._id.slice(-6).toUpperCase()}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="ml-11 space-y-1">
                                    <div className="flex items-center text-sm text-gray-600">
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                      </svg>
                                      SĐT: {patient.user_info?.phone || 'Chưa có'}
                                    </div>
                                    
                                    {patient.user_info?.dob && (
                                      <div className="flex items-center text-sm text-gray-600">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" />
                                        </svg>
                                        Sinh: {formatDate(patient.user_info.dob)}
                                      </div>
                                    )}
                                    
                                    {patient.user_info?.address && (
                                      <div className="flex items-center text-sm text-gray-600">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Địa chỉ: {patient.user_info.address}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="ml-4">
                                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 text-center">
                            💡 Click vào bệnh nhân để chọn
                          </p>
                        </div>
                      </div>
                    )}
                    </>
                    ) : (
                      /* Hiển thị bệnh nhân đã chọn */
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm text-blue-800">
                              <strong>Bệnh nhân đã chọn:</strong> {selectedPatient.user_id?.full_name || 'Không có tên'}
                            </p>
                            <p className="text-sm text-blue-600">SĐT: {selectedPatient.user_id?.phone || 'Chưa có'}</p>
                            {selectedPatient.user_id?.dob && (
                              <p className="text-sm text-blue-600">
                                Sinh: {formatDate(selectedPatient.user_id.dob)}
                              </p>
                            )}
                          </div>
                          {!location.state?.patientId && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPatient(null);
                                setPatientInfo(null);
                                setFormData(prev => ({ ...prev, patient_id: '' }));
                              }}
                            >
                              Thay đổi
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {patientSearch.trim() && searchResults.length === 0 && !isSearchingPatients && !selectedPatient && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-yellow-800">
                              Không tìm thấy bệnh nhân nào
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">
                              Từ khóa tìm kiếm: "<strong>{patientSearch}</strong>"
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs text-yellow-600">
                            💡 Gợi ý: Thử tìm kiếm với từ khóa khác hoặc kiểm tra chính tả
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {!currentUser && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-800">
                      Vui lòng đăng nhập để đặt lịch khám
                    </p>
                  </div>
                )}
              </div>

              {/* Thông tin lịch hẹn */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Thông tin lịch khám
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appointment_date">Ngày khám *</Label>
                    <Input
                      id="appointment_date"
                      name="appointment_date"
                      type="date"
                      value={formData.appointment_date}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                    {errors.appointment_date && <span className="text-red-500 text-sm">{errors.appointment_date}</span>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="time_slot">Giờ khám *</Label>
                    <select
                      id="time_slot"
                      name="time_slot"
                      value={formData.time_slot}
                      onChange={handleInputChange}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      required
                    >
                      <option value="">-- Chọn giờ khám --</option>
                      {timeSlots.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    {errors.time_slot && <span className="text-red-500 text-sm">{errors.time_slot}</span>}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="specialty_id">Chuyên khoa *</Label>
                    <select
                      id="specialty_id"
                      name="specialty_id"
                      value={formData.specialty_id}
                      onChange={handleInputChange}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      required
                    >
                      <option value="">-- Chọn chuyên khoa --</option>
                      {specialties.map(specialty => (
                        <option key={specialty._id} value={specialty._id}>
                          {specialty.name}
                        </option>
                      ))}
                    </select>
                    {errors.specialty_id && <span className="text-red-500 text-sm">{errors.specialty_id}</span>}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doctor_id">Bác sĩ *</Label>
                      <select
                        id="doctor_id"
                        name="doctor_id"
                        value={formData.doctor_id}
                        onChange={handleInputChange}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        required
                        disabled={!formData.specialty_id || isLoadingDoctors}
                      >
                        <option value="">
                          {!formData.specialty_id 
                            ? '-- Chọn chuyên khoa trước --' 
                            : isLoadingDoctors 
                              ? 'Đang tải bác sĩ...' 
                              : doctors.length === 0 
                                ? 'Không có bác sĩ nào' 
                                : '-- Chọn bác sĩ --'
                          }
                        </option>
                          {!isLoadingDoctors && doctors.map(doctor => (
                            <option key={doctor._id} value={doctor._id}>
                              {doctor.user_id?.full_name || 'Không có tên'}
                            </option>
                          ))}
                      </select>
                      {errors.doctor_id && <span className="text-red-500 text-sm">{errors.doctor_id}</span>}
                      {!isLoadingDoctors && formData.specialty_id && doctors.length === 0 && (
                        <span className="text-yellow-600 text-sm">
                          Hiện tại không có bác sĩ nào trong chuyên khoa này
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="examination_fee_id">Loại hình khám *</Label>
                      <select
                        id="examination_fee_id"
                        name="examination_fee_id"
                        value={formData.examination_fee_id}
                        onChange={handleInputChange}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        required
                        disabled={!formData.specialty_id || isLoadingFees}
                      >
                        <option value="">
                          {!formData.specialty_id 
                            ? '-- Chọn chuyên khoa trước --' 
                            : isLoadingFees 
                              ? 'Đang tải giá khám...' 
                              : examinationFees.length === 0 
                                ? 'Không có loại hình khám cho chuyên khoa này' 
                                : '-- Chọn loại hình khám --'
                          }
                        </option>
                          {!isLoadingFees && examinationFees.map(fee => (
                            <option key={fee._id} value={fee._id}>
                              {fee.examination_type}
                            </option>
                          ))}
                      </select>
                      {errors.examination_fee_id && <span className="text-red-500 text-sm">{errors.examination_fee_id}</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Thông tin y tế
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="symptoms">Triệu chứng (tùy chọn)</Label>
                  <textarea
                    id="symptoms"
                    name="symptoms"
                    placeholder="Mô tả triệu chứng, tình trạng sức khỏe hiện tại..."
                    value={formData.symptoms}
                    onChange={handleInputChange}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  {errors.symptoms && <span className="text-red-500 text-sm">{errors.symptoms}</span>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Ghi chú thêm (tùy chọn)</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    placeholder="Thông tin bổ sung, yêu cầu đặc biệt..."
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-4">
                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={
                    isLoading || 
                    !currentUser || 
                    (bookingType === 'self' && (!patientInfo || !formData.patient_id)) ||
                    (bookingType === 'staff' && (!selectedPatient || !formData.patient_id))
                  }
                >
                  {isLoading ? 'Đang xử lý...' : 
                    bookingType === 'self' ? 'Đặt lịch khám' : 'Đặt lịch cho bệnh nhân'
                  }
                </Button>
                
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="w-full"
                  disabled={isLoading}
                >
                  Quay lại
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AppointmentHome;