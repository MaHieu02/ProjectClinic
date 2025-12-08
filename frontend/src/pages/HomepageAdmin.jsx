import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { getCurrentUserFromStorage } from "@/utils/auth";
import { getAppointmentsByDate, updateAppointmentStatus, completeAppointment, cancelAppointment } from "@/services/appointmentService";
import { searchPatients } from "@/services/patientService";
import { searchDoctors } from "@/services/doctorService";
import { searchReceptionists } from "@/services/receptionistService";
import { getReceptionistStats } from "@/services/statsService";
import { getMedicalRecordByAppointment, dispensePrescription } from "@/services/medicalRecordService";
import { searchSuppliers, createSupplier } from "@/services/supplierService";
import { getAllSpecialties, createSpecialty, searchSpecialties, updateSpecialty, deactivateSpecialty, reactivateSpecialty } from "@/services/specialtyService";
import { getActiveExaminationFees, createExaminationFee, searchExaminationFees, updateExaminationFee, deactivateExaminationFee, reactivateExaminationFee } from "@/services/examinationFeeService";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import logo from '@/assets/logo.png';

// Hàm trợ giúp định dạng ngày
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

const HomepageAdmin = () => {
  const navigate = useNavigate();
  const [searchPatient, setSearchPatient] = useState("");
  const [searchStaff, setSearchStaff] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchStaffResults, setSearchStaffResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingStaff, setIsSearchingStaff] = useState(false);
  const [statistics, setStatistics] = useState({
    totalPatientsToday: 0,
    completedAppointments: 0,
    waitingAppointments: 0,
    inProgressAppointments: 0,
    lowStockMedicines: 0,
    activeDoctors: 0,
    totalDoctors: 0,
    totalMedicines: 0
  });
  const [error, setError] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [_selectedAppointment, setSelectedAppointment] = useState(null);
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [searchSupplier, setSearchSupplier] = useState("");
  const [supplierResults, setSupplierResults] = useState([]);
  const [isSearchingSupplier, setIsSearchingSupplier] = useState(false);
  const [searchSpecialty, setSearchSpecialty] = useState("");
  const [specialtyResults, setSpecialtyResults] = useState([]);
  const [isSearchingSpecialty, setIsSearchingSpecialty] = useState(false);
  const [searchExaminationFee, setSearchExaminationFee] = useState("");
  const [examinationFeeResults, setExaminationFeeResults] = useState([]);
  const [isSearchingExaminationFee, setIsSearchingExaminationFee] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddSpecialtyModal, setShowAddSpecialtyModal] = useState(false);
  const [showEditSpecialtyModal, setShowEditSpecialtyModal] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [showEditExaminationFeeModal, setShowEditExaminationFeeModal] = useState(false);
  const [selectedExaminationFee, setSelectedExaminationFee] = useState(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });
  const [specialtyForm, setSpecialtyForm] = useState({
    code: '',
    name: '',
    description: ''
  });
  const [editSpecialtyForm, setEditSpecialtyForm] = useState({
    code: '',
    name: '',
    description: '',
    is_active: true
  });
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedAppointmentForCheckIn, setSelectedAppointmentForCheckIn] = useState(null);
  const [examinationFees, setExaminationFees] = useState([]);
  const [selectedExaminationFeeForCheckIn, setSelectedExaminationFeeForCheckIn] = useState(null);
  const [editExaminationFeeForm, setEditExaminationFeeForm] = useState({
    examination_type: '',
    specialty_id: '',
    fee: '',
    description: '',
    is_active: true
  });
  const [showAddExaminationFeeModal, setShowAddExaminationFeeModal] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [examinationFeeForm, setExaminationFeeForm] = useState({
    examination_type: '',
    specialty_id: '',
    fee: '',
    description: ''
  });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointmentForCancel, setSelectedAppointmentForCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Tính tổng chi phí đơn thuốc 
  const computedPrescriptionTotal = useMemo(() => {
    if (!prescriptionData || !Array.isArray(prescriptionData.medications_prescribed)) return 0;
    try {
      const sum = prescriptionData.medications_prescribed.reduce((acc, med) => {
        const price = med?.medicine_id?.price;
        const qty = med?.quantity || 0;
        if (typeof price === 'number' && !isNaN(price)) {
          return acc + price * qty;
        }
        return acc;
      }, 0);
      const backendTotal = typeof prescriptionData.total_cost === 'number' ? prescriptionData.total_cost : 0;
      return backendTotal > 0 ? backendTotal : sum;
    } catch {
      return typeof prescriptionData.total_cost === 'number' ? prescriptionData.total_cost : 0;
    }
  }, [prescriptionData]);

  const itemsPerPage = 10;

  // Tạo chuỗi ngày theo múi giờ local
  const getLocalDateString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Tải lịch hẹn hôm nay
  const loadTodayAppointments = useCallback(async () => {
    try {
      const today = getLocalDateString();
      const response = await getAppointmentsByDate(today);
      
      if (response.success) {
        const appointments = response.data || [];
        setTodayAppointments(appointments);
      } else {
        console.error('Error loading appointments:', response.error);
        setTodayAppointments([]);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      setTodayAppointments([]);
    }
  }, []);

  // Tải thống kê
  const loadStatistics = async () => {
    try {
      const response = await getReceptionistStats();
      
      if (response.success) {
        setStatistics(response.data);
      } else {
        console.error('Error loading statistics:', response.error);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  // Tải danh sách giá khám
  const loadExaminationFees = async () => {
    try {
      const result = await getActiveExaminationFees();
      if (result.success && result.data) {
        setExaminationFees(result.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải giá khám:', error);
    }
  };

  // Tải danh sách chuyên khoa
  const loadSpecialties = async () => {
    try {
      const result = await getAllSpecialties();
      if (result.success && result.data) {
        setSpecialties(result.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải chuyên khoa:', error);
    }
  };

  // Thêm dịch vụ khám
  const handleAddExaminationFee = async () => {
    try {
      const feeData = {
        examination_type: examinationFeeForm.examination_type,
        fee: parseFloat(examinationFeeForm.fee),
        description: examinationFeeForm.description,
        specialty_id: examinationFeeForm.specialty_id || null
      };

      const response = await createExaminationFee(feeData);
      
      if (response.success) {
        alert('Thêm dịch vụ khám thành công!');
        setShowAddExaminationFeeModal(false);
        setExaminationFeeForm({
          examination_type: '',
          specialty_id: '',
          fee: '',
          description: ''
        });
        await loadExaminationFees();
      } else {
        console.error('Error adding examination fee:', response.error);
        alert('Có lỗi xảy ra khi thêm dịch vụ khám: ' + (response.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error adding examination fee:', error);
      alert('Có lỗi xảy ra khi thêm dịch vụ khám: ' + (error?.message || 'Không xác định'));
    }
  };

  // Tìm kiếm bệnh nhân
  const handleSearchPatients = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchPatients(query);
      
      if (response.success) {
        setSearchResults(response.data || []);
      } else {
        console.error('Error searching patients:', response.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching patients:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Tìm kiếm nhân viên (bác sĩ + lễ tân)
  const handleSearchStaff = async (query) => {
    if (!query.trim()) {
      setSearchStaffResults([]);
      return;
    }

    setIsSearchingStaff(true);
    try {
      const [doctorRes, recepRes] = await Promise.all([
        searchDoctors(query, true), 
        searchReceptionists(query, true) 
      ]);

      const doctors = (doctorRes.success ? doctorRes.data : []).map((d) => ({
        type: 'doctor',
        ...d,
      }));

      const receptionists = (recepRes.success ? recepRes.data : []).map((r) => ({
        type: 'receptionist',
        ...r,
      }));

      setSearchStaffResults([...doctors, ...receptionists]);
    } catch (error) {
      console.error('Error searching staff:', error);
      setSearchStaffResults([]);
    } finally {
      setIsSearchingStaff(false);
    }
  };

  // Tìm kiếm nhà cung cấp
  const handleSearchSuppliers = async (query) => {
    if (!query.trim()) {
      setSupplierResults([]);
      return;
    }

    setIsSearchingSupplier(true);
    try {
      const response = await searchSuppliers(query);
      
      if (response.success) {
        setSupplierResults(response.data || []);
      } else {
        console.error('Error searching suppliers:', response.error);
        setSupplierResults([]);
      }
    } catch (error) {
      console.error('Error searching suppliers:', error);
      setSupplierResults([]);
    } finally {
      setIsSearchingSupplier(false);
    }
  };

  // Thêm nhà cung cấp
  const handleAddSupplier = async () => {
    try {
      const response = await createSupplier(supplierForm);
      
      if (response.success) {
        alert('Thêm nhà cung cấp thành công!');
        setShowAddSupplierModal(false);
        setSupplierForm({
          name: '',
          contact_person: '',
          phone: '',
          email: '',
          address: ''
        });
        if (searchSupplier.trim()) {
          handleSearchSuppliers(searchSupplier);
        }
      } else {
        console.error('Error adding supplier:', response.error);
        alert('Có lỗi xảy ra khi thêm nhà cung cấp: ' + (response.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error adding supplier:', error);
      alert('Có lỗi xảy ra khi thêm nhà cung cấp: ' + (error?.message || 'Không xác định'));
    }
  };

  // Thêm chuyên khoa
  const handleAddSpecialty = async () => {
    try {
      const response = await createSpecialty(specialtyForm);
      
      if (response.success) {
        alert('Thêm chuyên khoa thành công!');
        setShowAddSpecialtyModal(false);
        setSpecialtyForm({
          code: '',
          name: '',
          description: ''
        });
      } else {
        console.error('Error adding specialty:', response.error);
        alert('Có lỗi xảy ra khi thêm chuyên khoa: ' + (response.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error adding specialty:', error);
      alert('Có lỗi xảy ra khi thêm chuyên khoa: ' + (error?.message || 'Không xác định'));
    }
  };

  // Tìm kiếm chuyên khoa
  const handleSearchSpecialties = async (query) => {
    if (!query.trim()) {
      setSpecialtyResults([]);
      return;
    }

    setIsSearchingSpecialty(true);
    try {
      const response = await searchSpecialties(query, true);
      if (response.success) {
        setSpecialtyResults(response.data || []);
      } else {
        console.error('Error searching specialties:', response.error);
        setSpecialtyResults([]);
      }
    } catch (error) {
      console.error('Error searching specialties:', error);
      setSpecialtyResults([]);
    } finally {
      setIsSearchingSpecialty(false);
    }
  };

  // Mở modal chỉnh sửa chuyên khoa
  const handleEditSpecialty = (specialty) => {
    setSelectedSpecialty(specialty);
    setEditSpecialtyForm({
      code: specialty.code,
      name: specialty.name,
      description: specialty.description || '',
      is_active: specialty.is_active
    });
    setShowEditSpecialtyModal(true);
  };

  // Cập nhật chuyên khoa
  const handleUpdateSpecialty = async () => {
    if (!selectedSpecialty) return;
    
    try {
      const response = await updateSpecialty(selectedSpecialty._id, editSpecialtyForm);
      
      if (response.success) {
        alert('Cập nhật chuyên khoa thành công!');
        setShowEditSpecialtyModal(false);
        if (searchSpecialty.trim()) {
          await handleSearchSpecialties(searchSpecialty);
        }
      } else {
        console.error('Error updating specialty:', response.error);
        alert('Có lỗi xảy ra khi cập nhật chuyên khoa: ' + (response.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error updating specialty:', error);
      alert('Có lỗi xảy ra khi cập nhật chuyên khoa: ' + (error?.message || 'Không xác định'));
    }
  };

  // Vô hiệu hóa chuyên khoa
  const handleDeactivateSpecialty = async (specialtyId) => {
    if (!confirm('Bạn có chắc muốn vô hiệu hóa chuyên khoa này?')) return;

    try {
      const response = await deactivateSpecialty(specialtyId);
      
      if (response.success) {
        alert('Đã vô hiệu hóa chuyên khoa thành công!');
        setShowEditSpecialtyModal(false);
        if (searchSpecialty.trim()) {
          await handleSearchSpecialties(searchSpecialty);
        }
      } else {
        console.error('Error deactivating specialty:', response.error);
        alert('Có lỗi xảy ra khi vô hiệu hóa chuyên khoa: ' + (response.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error deactivating specialty:', error);
      alert('Có lỗi xảy ra khi vô hiệu hóa chuyên khoa: ' + (error?.message || 'Không xác định'));
    }
  };

  // Kích hoạt lại chuyên khoa
  const handleReactivateSpecialty = async (specialtyId) => {
    if (!confirm('Bạn có chắc muốn kích hoạt lại chuyên khoa này?')) return;

    try {
      const response = await reactivateSpecialty(specialtyId);
      
      if (response.success) {
        alert('Đã kích hoạt lại chuyên khoa thành công!');
        setShowEditSpecialtyModal(false);
        if (searchSpecialty.trim()) {
          await handleSearchSpecialties(searchSpecialty);
        }
      } else {
        console.error('Error reactivating specialty:', response.error);
        alert('Có lỗi xảy ra khi kích hoạt lại chuyên khoa: ' + (response.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error reactivating specialty:', error);
      alert('Có lỗi xảy ra khi kích hoạt lại chuyên khoa: ' + (error?.message || 'Không xác định'));
    }
  };

  // Tìm kiếm dịch vụ khám
  const handleSearchExaminationFees = async (query) => {
    if (!query.trim()) {
      setExaminationFeeResults([]);
      return;
    }

    setIsSearchingExaminationFee(true);
    try {
      const response = await searchExaminationFees(query, true);
      if (response.success) {
        setExaminationFeeResults(response.data || []);
      } else {
        console.error('Error searching examination fees:', response.error);
        setExaminationFeeResults([]);
      }
    } catch (error) {
      console.error('Error searching examination fees:', error);
      setExaminationFeeResults([]);
    } finally {
      setIsSearchingExaminationFee(false);
    }
  };

  // Mở modal chỉnh sửa dịch vụ khám
  const handleEditExaminationFee = (fee) => {
    setSelectedExaminationFee(fee);
    setEditExaminationFeeForm({
      examination_type: fee.examination_type,
      specialty_id: fee.specialty_id?._id || '',
      fee: fee.fee,
      description: fee.description || '',
      is_active: fee.is_active
    });
    setShowEditExaminationFeeModal(true);
  };

  // Cập nhật dịch vụ khám
  const handleUpdateExaminationFee = async () => {
    if (!selectedExaminationFee) return;
    
    try {
      const response = await updateExaminationFee(selectedExaminationFee._id, editExaminationFeeForm);
      
      if (response.success) {
        alert('Cập nhật dịch vụ khám thành công!');
        setShowEditExaminationFeeModal(false);
        if (searchExaminationFee.trim()) {
          await handleSearchExaminationFees(searchExaminationFee);
        }
      } else {
        console.error('Error updating examination fee:', response.error);
        alert('Có lỗi xảy ra khi cập nhật dịch vụ khám: ' + (response.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error updating examination fee:', error);
      alert('Có lỗi xảy ra khi cập nhật dịch vụ khám: ' + (error?.message || 'Không xác định'));
    }
  };

  // Vô hiệu hóa dịch vụ khám
  const handleDeactivateExaminationFee = async (feeId) => {
    if (!confirm('Bạn có chắc muốn vô hiệu hóa dịch vụ khám này?')) return;

    try {
      const response = await deactivateExaminationFee(feeId);
      
      if (response.success) {
        alert('Đã vô hiệu hóa dịch vụ khám thành công!');
        setShowEditExaminationFeeModal(false);
        if (searchExaminationFee.trim()) {
          await handleSearchExaminationFees(searchExaminationFee);
        }
      } else {
        console.error('Error deactivating examination fee:', response.error);
        alert('Có lỗi xảy ra khi vô hiệu hóa dịch vụ khám: ' + (response.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error deactivating examination fee:', error);
      alert('Có lỗi xảy ra khi vô hiệu hóa dịch vụ khám: ' + (error?.message || 'Không xác định'));
    }
  };

  // Kích hoạt lại dịch vụ khám
  const handleReactivateExaminationFee = async (feeId) => {
    if (!confirm('Bạn có chắc muốn kích hoạt lại dịch vụ khám này?')) return;

    try {
      const response = await reactivateExaminationFee(feeId);
      
      if (response.success) {
        alert('Đã kích hoạt lại dịch vụ khám thành công!');
        setShowEditExaminationFeeModal(false);
        if (searchExaminationFee.trim()) {
          await handleSearchExaminationFees(searchExaminationFee);
        }
      } else {
        console.error('Error reactivating examination fee:', response.error);
        alert('Có lỗi xảy ra khi kích hoạt lại dịch vụ khám: ' + (response.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error reactivating examination fee:', error);
      alert('Có lỗi xảy ra khi kích hoạt lại dịch vụ khám: ' + (error?.message || 'Không xác định'));
    }
  };

  // Mở modal hủy lịch
  const handleOpenCancelModal = (appointment) => {
    setSelectedAppointmentForCancel(appointment);
    setCancellationReason('');
    setShowCancelModal(true);
  };

  // Xác nhận hủy lịch với lý do
  const handleConfirmCancel = async () => {
    if (!selectedAppointmentForCancel) return;

    try {
      const response = await cancelAppointment(selectedAppointmentForCancel._id, cancellationReason);
      
      if (response.success) {
        await loadTodayAppointments();
        await loadStatistics();
        setShowCancelModal(false);
        setSelectedAppointmentForCancel(null);
        setCancellationReason('');
        alert('Đã hủy lịch hẹn thành công');
      } else {
        alert('Có lỗi xảy ra khi hủy lịch hẹn: ' + (response.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Có lỗi xảy ra khi hủy lịch hẹn: ' + (error?.message || 'Không xác định'));
    }
  };

  // Cập nhật trạng thái lịch hẹn
  const handleUpdateAppointmentStatus = async (appointmentId, newStatus) => {

    if (newStatus === 'checked') {
      const appointment = todayAppointments.find(apt => apt._id === appointmentId);
      if (appointment) {
        setSelectedAppointmentForCheckIn(appointment);
      
        const specialtyId = appointment.doctor_id?.specialty_id?._id;
        const matchingFee = examinationFees.find(fee => 
          fee.specialty_id === specialtyId || fee.specialty_id === null
        );
        
        setSelectedExaminationFeeForCheckIn(matchingFee || examinationFees[0]);
        setShowCheckInModal(true);
        return;
      }
    }

    try {
      let response;
      if (newStatus === 'completed') {

        response = await completeAppointment(appointmentId);
        if (!response.success) {
          console.warn('completeAppointment failed, falling back to update route:', response.error);
          response = await updateAppointmentStatus(appointmentId, 'completed');
        }
      } else {
        response = await updateAppointmentStatus(appointmentId, newStatus);
      }

      if (response.success) {
        await loadTodayAppointments();
        await loadStatistics();
      } else {
        console.error('Error updating appointment:', response.error);
        alert('Có lỗi xảy ra khi cập nhật trạng thái lịch hẹn: ' + (response.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error updating appointment:', error);

      if (newStatus === 'completed') {
        try {
          const resp2 = await updateAppointmentStatus(appointmentId, 'completed');
          if (resp2.success) {
            await loadTodayAppointments();
            await loadStatistics();
            return;
          }
        } catch (e2) {
          console.error('Fallback update to completed also failed:', e2);
        }
      }
      alert('Có lỗi xảy ra khi cập nhật trạng thái lịch hẹn: ' + (error?.message || 'Không xác định'));
    }
  };

  // Xác nhận check-in và cập nhật trạng thái
  const handleConfirmCheckIn = async () => {
    if (!selectedAppointmentForCheckIn || !selectedExaminationFeeForCheckIn) return;

    try {
      const response = await updateAppointmentStatus(
        selectedAppointmentForCheckIn._id, 
        'checked',
        {
          examination_fee_id: selectedExaminationFeeForCheckIn._id,
          examination_fee: selectedExaminationFeeForCheckIn.fee
        }
      );
      
      if (response.success) {
        await loadTodayAppointments();
        await loadStatistics();
        setShowCheckInModal(false);
        setSelectedAppointmentForCheckIn(null);
        alert('Đã chuyển bệnh nhân vào trạng thái chờ khám');
      } else {
        console.error("Failed to check in:", response.error);
        alert("Không thể check-in: " + (response.error || 'Lỗi không xác định'));
      }
    } catch (error) {
      console.error("Error during check-in:", error);
      alert("Lỗi khi check-in: " + error.message);
    }
  };

  // Xem đơn thuốc
  const handleViewPrescription = async (appointment) => {
    try {
      const response = await getMedicalRecordByAppointment(appointment._id);
      
      if (response.success && response.data) {
        setPrescriptionData(response.data);
        setSelectedAppointment(appointment);
        setShowPrescriptionModal(true);
      } else {
        alert('Chưa có đơn thuốc cho lịch hẹn này');
      }
    } catch (error) {
      console.error('Error loading prescription:', error);
      alert('Có lỗi xảy ra khi tải đơn thuốc');
    }
  };

  // Phát thuốc
  const handleDispensePrescription = async () => {
    if (!prescriptionData?._id) return;

    try {
      const response = await dispensePrescription(prescriptionData._id);
      
      if (response.success) {
        alert('Phát thuốc thành công!');
        setShowPrescriptionModal(false);
        await loadTodayAppointments();
        await loadStatistics();
      } else {
        alert('Có lỗi xảy ra khi phát thuốc: ' + response.error);
      }
    } catch (error) {
      console.error('Error dispensing prescription:', error);
      alert('Có lỗi xảy ra khi phát thuốc');
    }
  };

  // Lấy màu badge theo trạng thái (đồng bộ backend)
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'booked':
        return 'bg-yellow-100 text-yellow-800';
      case 'checked':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Lấy text trạng thái (đồng bộ backend)
  const getStatusText = (status) => {
    switch (status) {
      case 'booked':
        return 'Đặt lịch';
      case 'checked':
        return 'Chờ khám';
      case 'completed':
        return 'Hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      case 'late':
        return 'Trễ hẹn';
      default:
        return 'Không xác định';
    }
  };

  // Tính toán phân trang
  const totalPages = Math.ceil(todayAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAppointments = todayAppointments.slice(startIndex, endIndex);

  // Xử lý thay đổi trang
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };


  // Hiển thị báo cáo hàng ngày
  const handleShowDailyReport = () => {
    setShowDailyReportModal(true);
  };

  // Tải tất cả dữ liệu khi component được mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      const user = getCurrentUserFromStorage();
      console.log("Current user from storage:", user);
      
      if (!user) {
        setError("Chưa đăng nhập. Vui lòng đăng nhập lại.");
        setIsLoading(false);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        return;
      }
      
      if (user.role !== 'admin') {
        setError(`Bạn không có quyền truy cập trang này. Role hiện tại: ${user.role}`);
        setIsLoading(false);
        switch (user.role) {
          case 'patient':
            setTimeout(() => navigate('/'), 2000);
            break;
          case 'doctor':
            setTimeout(() => navigate('/doctor'), 2000);
            break;
          case 'receptionist':
            setTimeout(() => navigate('/receptionist'), 2000);
            break;
          default:
            setTimeout(() => navigate('/login'), 2000);
        }
        return;
      }

      await Promise.all([
        loadTodayAppointments(),
        loadStatistics(),
        loadExaminationFees(),
        loadSpecialties()
      ]);

      setIsLoading(false);
    };

    loadData();
  }, [navigate, loadTodayAppointments]); 

  // Tự động làm mới lịch hẹn và thống kê mỗi 30 giây
  useAutoRefresh(async () => {
    await loadTodayAppointments();
    await loadStatistics();
  }, [], 30000);
  
  // Xử lý thay đổi input tìm kiếm với debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchPatient) {
        handleSearchPatients(searchPatient);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchPatient]);

  // Tìm kiếm nhân viên với debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchStaff) {
        handleSearchStaff(searchStaff);
      } else {
        setSearchStaffResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchStaff]);

  // Tìm kiếm nhà cung cấp với debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchSupplier) {
        handleSearchSuppliers(searchSupplier);
      } else {
        setSupplierResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchSupplier]);

  // Tìm kiếm chuyên khoa với debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchSpecialty) {
        handleSearchSpecialties(searchSpecialty);
      } else {
        setSpecialtyResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchSpecialty]);

  // Tìm kiếm dịch vụ khám với debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchExaminationFee) {
        handleSearchExaminationFees(searchExaminationFee);
      } else {
        setExaminationFeeResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchExaminationFee]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img 
                src={logo} 
                alt="Logo Phòng khám" 
                className="h-12 w-12 object-contain rounded-full"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Trang chủ Quản trị viên</h1>
                <p className="text-gray-600">Quản lý hệ thống và nhân sự</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                Hôm nay: {new Date().toLocaleDateString('vi-VN')}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/setting'}>
                Cài đặt
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Cột trái */}
          <div className="lg:col-span-1">
            <Card className="mb-6 border-2 border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Các chức năng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white 
                transition-all duration-200"
                onClick={() => window.location.href = '/registerstaff'}
                >
                  Thêm người dùng mới
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full border-blue-300 text-black-700 hover:bg-blue-50 
                  transition-all duration-200"
                  onClick={handleShowDailyReport}
                >
                  Báo cáo ngày
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full border-blue-300 text-black-700 hover:bg-blue-50 
                  transition-all duration-200"
                  onClick={() => navigate('/revenue-report')}
                >
                  Báo cáo doanh thu
                </Button>
                <Button variant="outline" 
                className="w-full border-blue-300 text-black-700 hover:bg-blue-50 
                transition-all duration-200"
                onClick={() => window.location.href = '/drugwarehouse'}
                >
                  Kho thuốc
                </Button>
                <Button 
                  variant="outline"
                  className="w-full border-blue-300 text-black-700 hover:bg-blue-50 
                  transition-all duration-200"
                  onClick={() => setShowAddSupplierModal(true)}
                >
                  Thêm nhà cung cấp
                </Button>
                <Button 
                  variant="outline"
                  className="w-full border-blue-300 text-black-700 hover:bg-blue-50 
                  transition-all duration-200"
                  onClick={() => setShowAddSpecialtyModal(true)}
                >
                  Thêm chuyên khoa
                </Button>
                <Button 
                  variant="outline"
                  className="w-full border-blue-300 text-black-700 hover:bg-blue-50 
                  transition-all duration-200"
                  onClick={() => setShowAddExaminationFeeModal(true)}
                >
                  Thêm dịch vụ khám
                </Button>
              </CardContent>
            </Card>

            {/* Tìm kiếm bệnh nhân */}
            <Card className="mb-6 border-2 border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Tìm kiếm bệnh nhân
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      placeholder="Nhập tên hoặc số điện thoại..."
                      value={searchPatient}
                      onChange={(e) => setSearchPatient(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchPatients(searchPatient);
                        }
                      }}
                      className="pr-10"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full bg-green-400 hover:bg-green-500 text-black hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                    onClick={() => handleSearchPatients(searchPatient)}
                    disabled={isSearching || !searchPatient.trim()}
                  >
                    {isSearching ? "Đang tìm kiếm..." : "Tìm kiếm"}
                  </Button>
                </div>
                
                {/* Kết quả tìm kiếm bệnh nhân */}
                {searchResults.length > 0 && (
                  <div className="mt-4 max-h-60 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Kết quả tìm kiếm:</h4>
                    {searchResults.map((patient) => (
                      <div 
                        key={patient._id} 
                        className="p-3 border rounded mb-2 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200 hover:shadow-md"
                        onClick={() => {
                          // Chuyển đến trang hồ sơ bệnh nhân
                          if (patient.user_id?._id) {
                            navigate(`/patient/${patient.user_id._id}`);
                          } else {
                            alert('Không thể xem thông tin bệnh nhân này');
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-800">
                              {patient.user_id?.full_name || 'Chưa có tên'}
                            </div>
                            <div className="text-xs text-gray-600">
                              📞 SĐT: {patient.user_id?.phone || 'Chưa có SĐT'}
                            </div>
                            {patient.user_id?.dob && (
                              <div className="text-xs text-gray-600">
                                🎂 Sinh: {formatDate(patient.user_id.dob)}
                              </div>
                            )}
                            {patient.user_id?.gender && (
                              <div className="text-xs text-gray-600">
                                👤 Giới tính: {patient.user_id.gender === 'male' ? 'Nam' : patient.user_id.gender === 'female' ? 'Nữ' : 'Khác'}
                              </div>
                            )}
                            {patient.user_id?.address && (
                              <div className="text-xs text-gray-500 mt-1">
                                📍 {patient.user_id.address}
                              </div>
                            )}
                          </div>
                          <div className="text-blue-500 text-xs ml-2">
                            <span className="hover:underline">Xem →</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {isSearching && searchPatient.trim() && (
                  <div className="mt-4 text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Đang tìm kiếm...</p>
                  </div>
                )}
                
                {searchPatient.trim() && searchResults.length === 0 && !isSearching && (
                  <div className="mt-4 text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-sm text-gray-600 font-medium">Không tìm thấy bệnh nhân</p>
                    <p className="text-xs text-gray-500 mt-1">Thử tìm kiếm với từ khóa khác</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mb-6 border-2 border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Tìm kiếm nhân viên
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      placeholder="Tìm theo tên hoặc số điện thoại..."
                      value={searchStaff}
                      onChange={(e) => setSearchStaff(e.target.value)}
                      className="pr-10"
                    />
                    {isSearchingStaff && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={() => handleSearchStaff(searchStaff)}
                    disabled={isSearchingStaff || !searchStaff.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSearchingStaff ? 'Đang tìm...' : 'Tìm kiếm'}
                  </Button>
                </div>

                {searchStaffResults.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Kết quả tìm kiếm ({searchStaffResults.length}):
                    </div>
                    {searchStaffResults.map((item) => {
                      const key = `${item.type}-${item._id}`;
                      const isDoctor = item.type === 'doctor';
                      const user = isDoctor ? item.user_id : (item.user_id && item.user_id.full_name ? item.user_id : item.user_info);
                      const isInactive = user?.employment_status === false;
                      const onClick = () => {
                        if (!user?._id) return;
                        navigate(isDoctor ? `/doctor/${user._id}` : `/receptionist/${user._id}`);
                      };
                      return (
                        <div
                          key={key}
                          onClick={onClick}
                          className={`p-3 border rounded-lg transition-all duration-200 cursor-pointer ${
                            isInactive 
                              ? 'bg-gray-100 border-gray-300' 
                              : 'bg-gradient-to-r from-slate-50 to-white border-slate-200 hover:shadow-md hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-sm text-gray-900">{user?.full_name || 'Chưa có tên'}</div>
                                <Badge className={isDoctor ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}>
                                  {isDoctor ? 'Bác sĩ' : 'Lễ tân'}
                                </Badge>
                                {isInactive && (
                                  <Badge className="bg-red-100 text-red-800">
                                    Đã nghỉ việc
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-y-1 text-xs text-gray-600">
                                {isDoctor ? (
                                  <>
                                    <div>🏥 Chuyên khoa: {item.specialty_id?.name || 'Chưa xác định'}</div>
                                    <div>📞 SĐT: {user?.phone || 'Chưa có SĐT'}</div>
                                    <div className="col-span-1">
                                      <Badge className={`${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {item.is_active ? 'Hoạt động' : 'Không hoạt động'}
                                      </Badge>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div>📞 SĐT: {user?.phone || 'Chưa có SĐT'}</div>
                                    <div>{user?.email ? `✉️ Email: ${user.email}` : '✉️ Email: Chưa có'}</div>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-slate-500 text-xs ml-2">
                              <span className="hover:underline">Xem →</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isSearchingStaff && searchStaff.trim() && (
                  <div className="mt-4 text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Đang tìm kiếm...</p>
                  </div>
                )}

                {searchStaff.trim() && searchStaffResults.length === 0 && !isSearchingStaff && (
                  <div className="mt-4 text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-sm text-gray-600 font-medium">Không tìm thấy nhân viên</p>
                    <p className="text-xs text-gray-500 mt-1">Thử tìm kiếm với từ khóa khác</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tìm kiếm nhà cung cấp */}
            <Card className="mb-6 border-2 border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Quản lý nhà cung cấp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      placeholder="Tìm nhà cung cấp..."
                      value={searchSupplier}
                      onChange={(e) => setSearchSupplier(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchSuppliers(searchSupplier);
                        }
                      }}
                      className="pr-10"
                    />
                    {isSearchingSupplier && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 bg-green-400 hover:bg-green-500 text-black hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                      onClick={() => handleSearchSuppliers(searchSupplier)}
                      disabled={isSearchingSupplier || !searchSupplier.trim()}
                    >
                      {isSearchingSupplier ? "Đang tìm kiếm..." : "Tìm kiếm"}
                    </Button>
                  </div>
                </div>
                
                {/* Kết quả tìm kiếm nhà cung cấp */}
                {supplierResults.length > 0 && (
                  <div className="mt-4 max-h-60 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Kết quả tìm kiếm:</h4>
                    {supplierResults.map((supplier) => (
                      <div 
                        key={supplier._id} 
                        className="p-3 border rounded mb-2 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200 hover:shadow-md"
                        onClick={() => navigate(`/supplier/${supplier._id}`)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-800">
                              {supplier.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              👤 Người liên hệ: {supplier.contact_person || 'Chưa có'}
                            </div>
                            <div className="text-xs text-gray-600">
                              📞 SĐT: {supplier.phone || 'Chưa có SĐT'}
                            </div>
                            {supplier.email && (
                              <div className="text-xs text-gray-600">
                                ✉️ Email: {supplier.email}
                              </div>
                            )}
                            {supplier.address && (
                              <div className="text-xs text-gray-500 mt-1">
                                📍 {supplier.address}
                              </div>
                            )}
                            <div className="mt-1">
                              <Badge className={`${supplier.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {supplier.is_active ? 'Hoạt động' : 'Ngưng hoạt động'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-blue-500 text-xs ml-2">
                            <span className="hover:underline">Xem →</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {isSearchingSupplier && searchSupplier.trim() && (
                  <div className="mt-4 text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Đang tìm kiếm...</p>
                  </div>
                )}
                
                {searchSupplier.trim() && supplierResults.length === 0 && !isSearchingSupplier && (
                  <div className="mt-4 text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-sm text-gray-600 font-medium">Không tìm thấy nhà cung cấp</p>
                    <p className="text-xs text-gray-500 mt-1">Thử tìm kiếm với từ khóa khác</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quản lý chuyên khoa */}
            <Card className="mb-6 border-2 border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Quản lý chuyên khoa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      placeholder="Tìm chuyên khoa..."
                      value={searchSpecialty}
                      onChange={(e) => setSearchSpecialty(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchSpecialties(searchSpecialty);
                        }
                      }}
                      className="pr-10"
                    />
                    {isSearchingSpecialty && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 bg-green-400 hover:bg-green-500 text-black"
                      onClick={() => handleSearchSpecialties(searchSpecialty)}
                      disabled={isSearchingSpecialty || !searchSpecialty.trim()}
                    >
                      {isSearchingSpecialty ? "Đang tìm kiếm..." : "Tìm kiếm"}
                    </Button>
                  </div>
                </div>
                
                {/* Kết quả tìm kiếm chuyên khoa */}
                {specialtyResults.length > 0 && (
                  <div className="mt-4 max-h-60 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Kết quả tìm kiếm:</h4>
                    {specialtyResults.map((specialty) => (
                      <div 
                        key={specialty._id} 
                        className="p-3 border rounded mb-2 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200 hover:shadow-md"
                        onClick={() => handleEditSpecialty(specialty)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-800">
                              {specialty.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              🔖 Mã: {specialty.code.toUpperCase()}
                            </div>
                            {specialty.description && (
                              <div className="text-xs text-gray-500 mt-1">
                                📝 {specialty.description}
                              </div>
                            )}
                            <div className="mt-1">
                              <Badge className={`${specialty.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {specialty.is_active ? 'Hoạt động' : 'Đã vô hiệu hóa'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-blue-500 text-xs ml-2">
                            <span className="hover:underline">Chỉnh sửa →</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {isSearchingSpecialty && searchSpecialty.trim() && (
                  <div className="mt-4 text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Đang tìm kiếm...</p>
                  </div>
                )}
                
                {searchSpecialty.trim() && specialtyResults.length === 0 && !isSearchingSpecialty && (
                  <div className="mt-4 text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-sm text-gray-600 font-medium">Không tìm thấy chuyên khoa</p>
                    <p className="text-xs text-gray-500 mt-1">Thử tìm kiếm với từ khóa khác</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quản lý dịch vụ khám */}
            <Card className="mb-6 border-2 border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Quản lý dịch vụ khám
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      placeholder="Tìm dịch vụ khám..."
                      value={searchExaminationFee}
                      onChange={(e) => setSearchExaminationFee(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchExaminationFees(searchExaminationFee);
                        }
                      }}
                      className="pr-10"
                    />
                    {isSearchingExaminationFee && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 bg-green-400 hover:bg-green-500 text-black"
                      onClick={() => handleSearchExaminationFees(searchExaminationFee)}
                      disabled={isSearchingExaminationFee || !searchExaminationFee.trim()}
                    >
                      {isSearchingExaminationFee ? "Đang tìm kiếm..." : "Tìm kiếm"}
                    </Button>
                  </div>
                </div>
                
                {/* Kết quả tìm kiếm dịch vụ khám */}
                {examinationFeeResults.length > 0 && (
                  <div className="mt-4 max-h-60 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Kết quả tìm kiếm:</h4>
                    {examinationFeeResults.map((fee) => (
                      <div 
                        key={fee._id} 
                        className="p-3 border rounded mb-2 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200 hover:shadow-md"
                        onClick={() => handleEditExaminationFee(fee)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-800">
                              {fee.examination_type}
                            </div>
                            <div className="text-xs text-gray-600">
                              💰 Phí: {fee.fee.toLocaleString('vi-VN')} VNĐ
                            </div>
                            {fee.specialty_id && (
                              <div className="text-xs text-gray-600">
                                🏥 Chuyên khoa: {fee.specialty_id.name}
                              </div>
                            )}
                            {fee.description && (
                              <div className="text-xs text-gray-500 mt-1">
                                📝 {fee.description}
                              </div>
                            )}
                            <div className="mt-1">
                              <Badge className={`${fee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {fee.is_active ? 'Hoạt động' : 'Đã vô hiệu hóa'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-blue-500 text-xs ml-2">
                            <span className="hover:underline">Chỉnh sửa →</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {isSearchingExaminationFee && searchExaminationFee.trim() && (
                  <div className="mt-4 text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Đang tìm kiếm...</p>
                  </div>
                )}
                
                {searchExaminationFee.trim() && examinationFeeResults.length === 0 && !isSearchingExaminationFee && (
                  <div className="mt-4 text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-sm text-gray-600 font-medium">Không tìm thấy dịch vụ khám</p>
                    <p className="text-xs text-gray-500 mt-1">Thử tìm kiếm với từ khóa khác</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cột phải - Nội dung chính */}
          <div className="lg:col-span-2">
            {/* Thống kê tổng quan */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="border-2 border-gray-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bệnh nhân hôm nay</CardTitle>
                  <span className="text-2xl">👥</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{statistics.totalPatientsToday}</div>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lịch hẹn hoàn thành</CardTitle>
                  <span className="text-2xl">✅</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{statistics.completedAppointments}</div>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Đơn đã đặt</CardTitle>
                  <span className="text-2xl">⏳</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{statistics.waitingAppointments}</div>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bác sĩ hoạt động</CardTitle>
                  <span className="text-2xl">👨‍⚕️</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{statistics.activeDoctors}</div>
                </CardContent>
              </Card>
            </div>

            {/* Lịch hẹn hôm nay */}
            <Card className="border-2 border-gray-300">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <span className="mr-2">📅</span>
                    Lịch hẹn hôm nay ({todayAppointments.length})
                  </span>
                  <Button 
                    className="hover:bg-gray-300"
                    onClick={loadTodayAppointments}
                    variant="outline"
                    size="sm"
                  >
                    🔄 Làm mới
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayAppointments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <span className="text-4xl mb-4 block">📅</span>
                    <p>Không có lịch hẹn nào hôm nay</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {currentAppointments.map((appointment) => (
                        <div key={appointment._id} className="border rounded-lg p-4 bg-white">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4 mb-2">
                                <h3 className="font-medium text-gray-900">
                                  {appointment.patient_id?.user_id?.full_name}
                                </h3>
                                <Badge className={getStatusBadgeColor(appointment.status)}>
                                  {getStatusText(appointment.status)}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Bác sĩ:</span>
                                  <p>{appointment.doctor_id?.user_id?.full_name}</p>
                                  <p className="text-xs">Chuyên khoa: {appointment.doctor_id?.specialty_id?.name || 'Chưa xác định'}</p>
                                </div>
                                
                                <div>
                                  <span className="font-medium">Thời gian:</span>
                                  <p>{new Date(appointment.appointment_time).toLocaleDateString('vi-VN')}</p>
                                  <p className="text-xs">{new Date(appointment.appointment_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                
                                <div>
                                  <span className="font-medium">Dịch vụ khám:</span>
                                  <p className="text-xs">{appointment.examination_type || 'Chưa xác định'}</p>
                                </div>
                              </div>
                              {appointment.notes && (
                                <div className="mt-2 text-sm text-gray-600">
                                  <span className="font-medium">Ghi chú:</span>
                                  <p className="text-xs">{appointment.notes}</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col space-y-2 ml-4">
                              {appointment.status === 'booked' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateAppointmentStatus(appointment._id, 'checked')}
                                    className="bg-green-500 hover:bg-green-700"
                                  >
                                    Chờ khám
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenCancelModal(appointment)}
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                  >
                                    Hủy lịch
                                  </Button>
                                </>
                              )}
                              
                              {appointment.status === 'completed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewPrescription(appointment)}
                                  className="text-purple-600 border-purple-600 hover:bg-purple-50"
                                >
                                  Xem đơn thuốc
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Phân trang */}
                    {totalPages > 1 && (
                      <div className="mt-6">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                            
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => handlePageChange(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modal đơn thuốc */}
      {showPrescriptionModal && prescriptionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Đơn thuốc</h2>
              <Button
                onClick={() => setShowPrescriptionModal(false)}
                variant="outline"
                size="sm"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">Bệnh nhân:</h3>
                <p className="text-gray-600">{prescriptionData?.patient_id?.user_id?.full_name}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">Bác sĩ:</h3>
                <p className="text-gray-600">{prescriptionData?.doctor_id?.user_id?.full_name}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">Chẩn đoán:</h3>
                <p className="text-gray-600">{prescriptionData.diagnosis || 'Chưa có'}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">Đơn thuốc:</h3>
                <div className="space-y-2">
                  {prescriptionData.medications_prescribed?.map((medicine, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-gray-50">
                      <p className="font-medium">{medicine.medicine_name}</p>
                      {medicine.quantity !== undefined && (
                        <p className="text-sm text-gray-600">Số lượng: {medicine.quantity}</p>
                      )}
                      {medicine.dosage && (
                        <p className="text-sm text-gray-600">Liều lượng: {medicine.dosage}</p>
                      )}
                      {medicine.instructions && (
                        <p className="text-sm text-gray-600">Hướng dẫn: {medicine.instructions}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tổng chi phí đơn thuốc */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-gray-900">Tổng chi phí:</h3>
                  <p className="text-xl font-bold text-purple-700">
                    {computedPrescriptionTotal.toLocaleString('vi-VN')} VNĐ
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">Ghi chú:</h3>
                <p className="text-gray-600">{prescriptionData.notes || 'Không có'}</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center space-x-2 mt-6">
              <div>
                <Badge className={
                  prescriptionData.status === 'dispensed'
                    ? 'bg-green-100 text-green-800 text-sm px-3 py-1'
                    : 'bg-yellow-100 text-yellow-800 text-sm px-3 py-1'
                }>
                  {prescriptionData.status === 'dispensed' ? 'Đã xuất kho' : 'Chưa xuất kho'}
                </Badge>
              </div>
              {prescriptionData.status !== 'dispensed' && (
                <Button
                  onClick={handleDispensePrescription}
                  className="bg-green-600 hover:bg-green-700"
                >
                  In đơn thuốc và xuất kho
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal báo cáo hàng ngày */}
      {showDailyReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Báo cáo hàng ngày</h2>
              <Button
                onClick={() => setShowDailyReportModal(false)}
                variant="outline"
                size="sm"
              >
                ✕
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Thống kê lịch hẹn</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Tổng lịch hẹn:</span>
                      <span className="font-medium">{todayAppointments.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hoàn thành:</span>
                      <span className="font-medium text-green-600">{statistics.completedAppointments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Đã đặt:</span>
                      <span className="font-medium text-yellow-600">{statistics.waitingAppointments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Chờ khám:</span>
                      <span className="font-medium text-blue-600">{statistics.inProgressAppointments}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Thống kê hệ thống</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Tổng bác sĩ:</span>
                      <span className="font-medium">{statistics.totalDoctors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bác sĩ hoạt động:</span>
                      <span className="font-medium text-green-600">{statistics.activeDoctors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tổng thuốc:</span>
                      <span className="font-medium">{statistics.totalMedicines}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thuốc sắp hết:</span>
                      <span className="font-medium text-red-600">{statistics.lowStockMedicines}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm nhà cung cấp */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Thêm nhà cung cấp mới</h2>
              <Button
                onClick={() => setShowAddSupplierModal(false)}
                variant="outline"
                size="sm"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="supplier-name">Tên nhà cung cấp *</Label>
                <Input
                  id="supplier-name"
                  className={"mt-3"}
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                  placeholder="Nhập tên nhà cung cấp"
                />
              </div>

              <div>
                <Label htmlFor="supplier-contact">Người liên hệ</Label>
                <Input
                  id="supplier-contact"
                  className={"mt-3"}
                  value={supplierForm.contact_person}
                  onChange={(e) => setSupplierForm({...supplierForm, contact_person: e.target.value})}
                  placeholder="Nhập tên người liên hệ"
                />
              </div>

              <div>
                <Label htmlFor="supplier-phone">Số điện thoại *</Label>
                <Input
                  id="supplier-phone"
                  className={"mt-3"}
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})}
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div>
                <Label htmlFor="supplier-email">Email</Label>
                <Input
                  id="supplier-email"
                  className={"mt-3"}
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})}
                  placeholder="Nhập email"
                />
              </div>

              <div>
                <Label htmlFor="supplier-address">Địa chỉ</Label>
                <Input
                  id="supplier-address"
                  className={"mt-3"}
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({...supplierForm, address: e.target.value})}
                  placeholder="Nhập địa chỉ"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddSupplierModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleAddSupplier}
                  disabled={!supplierForm.name.trim() || !supplierForm.phone.trim()}
                >
                  Thêm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm chuyên khoa */}
      {showAddSpecialtyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Thêm chuyên khoa mới</h2>
              <Button
                onClick={() => setShowAddSpecialtyModal(false)}
                variant="outline"
                size="sm"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="specialty-code">Mã chuyên khoa *</Label>
                <Input
                  id="specialty-code"
                  className={"mt-3"}
                  value={specialtyForm.code}
                  onChange={(e) => setSpecialtyForm({...specialtyForm, code: e.target.value})}
                  placeholder="Ví dụ: CARDIO"
                />
              </div>

              <div>
                <Label htmlFor="specialty-name">Tên chuyên khoa *</Label>
                <Input
                  id="specialty-name"
                  className={"mt-3"}
                  value={specialtyForm.name}
                  onChange={(e) => setSpecialtyForm({...specialtyForm, name: e.target.value})}
                  placeholder="Ví dụ: Tim mạch"
                />
              </div>

              <div>
                <Label htmlFor="specialty-description">Mô tả</Label>
                <Input
                  id="specialty-description"
                  className={"mt-3"}
                  value={specialtyForm.description}
                  onChange={(e) => setSpecialtyForm({...specialtyForm, description: e.target.value})}
                  placeholder="Nhập mô tả chuyên khoa"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddSpecialtyModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleAddSpecialty}
                  disabled={!specialtyForm.code.trim() || !specialtyForm.name.trim()}
                >
                  Thêm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal chỉnh sửa chuyên khoa */}
      {showEditSpecialtyModal && selectedSpecialty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Chỉnh sửa chuyên khoa</h2>
              <Button
                onClick={() => setShowEditSpecialtyModal(false)}
                variant="outline"
                size="sm"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-specialty-code">Mã chuyên khoa *</Label>
                <Input
                  id="edit-specialty-code"
                  className={"mt-3"}
                  value={editSpecialtyForm.code}
                  onChange={(e) => setEditSpecialtyForm({...editSpecialtyForm, code: e.target.value})}
                  placeholder="Ví dụ: CARDIO"
                />
              </div>

              <div>
                <Label htmlFor="edit-specialty-name">Tên chuyên khoa *</Label>
                <Input
                  id="edit-specialty-name"
                  className={"mt-3"}
                  value={editSpecialtyForm.name}
                  onChange={(e) => setEditSpecialtyForm({...editSpecialtyForm, name: e.target.value})}
                  placeholder="Ví dụ: Tim mạch"
                />
              </div>

              <div>
                <Label htmlFor="edit-specialty-description">Mô tả</Label>
                <Input
                  id="edit-specialty-description"
                  className={"mt-3"}
                  value={editSpecialtyForm.description}
                  onChange={(e) => setEditSpecialtyForm({...editSpecialtyForm, description: e.target.value})}
                  placeholder="Nhập mô tả chuyên khoa"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Trạng thái:</span>
                  <Badge className={`${editSpecialtyForm.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {editSpecialtyForm.is_active ? 'Hoạt động' : 'Đã vô hiệu hóa'}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEditSpecialtyModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  className="flex-1 text-white bg-blue-600 hover:bg-blue-700"
                  onClick={handleUpdateSpecialty}
                  disabled={!editSpecialtyForm.code.trim() || !editSpecialtyForm.name.trim()}
                >
                  Cập nhật
                </Button>
              </div>

              <div className="border-t pt-4">
                {editSpecialtyForm.is_active ? (
                  <Button
                    variant="outline"
                    className="w-full text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => handleDeactivateSpecialty(selectedSpecialty._id)}
                  >
                    🚫 Vô hiệu hóa chuyên khoa
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => handleReactivateSpecialty(selectedSpecialty._id)}
                  >
                    🔄 Kích hoạt lại chuyên khoa
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal chỉnh sửa dịch vụ khám */}
      {showEditExaminationFeeModal && selectedExaminationFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Chỉnh sửa dịch vụ khám</h2>
              <Button
                onClick={() => setShowEditExaminationFeeModal(false)}
                variant="outline"
                size="sm"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-examination-type">Tên dịch vụ khám *</Label>
                <Input
                  id="edit-examination-type"
                  className="mt-3"
                  value={editExaminationFeeForm.examination_type}
                  onChange={(e) => setEditExaminationFeeForm({...editExaminationFeeForm, examination_type: e.target.value})}
                  placeholder="Ví dụ: Khám nội tổng quát"
                />
              </div>

              <div>
                <Label htmlFor="edit-examination-specialty">Chuyên khoa (tùy chọn)</Label>
                <select
                  id="edit-examination-specialty"
                  className="mt-3 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editExaminationFeeForm.specialty_id}
                  onChange={(e) => setEditExaminationFeeForm({...editExaminationFeeForm, specialty_id: e.target.value})}
                >
                  {specialties.map(specialty => (
                    <option key={specialty._id} value={specialty._id}>
                      {specialty.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="edit-examination-fee">Phí khám (VNĐ) *</Label>
                <Input
                  id="edit-examination-fee"
                  className="mt-3"
                  type="number"
                  value={editExaminationFeeForm.fee}
                  onChange={(e) => setEditExaminationFeeForm({...editExaminationFeeForm, fee: e.target.value})}
                  placeholder="Ví dụ: 200000"
                />
              </div>

              <div>
                <Label htmlFor="edit-examination-description">Mô tả</Label>
                <Input
                  id="edit-examination-description"
                  className="mt-3"
                  value={editExaminationFeeForm.description}
                  onChange={(e) => setEditExaminationFeeForm({...editExaminationFeeForm, description: e.target.value})}
                  placeholder="Nhập mô tả dịch vụ khám"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Trạng thái:</span>
                  <Badge className={`${editExaminationFeeForm.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {editExaminationFeeForm.is_active ? 'Hoạt động' : 'Đã vô hiệu hóa'}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEditExaminationFeeModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  className="flex-1 text-white bg-blue-600 hover:bg-blue-700"
                  onClick={handleUpdateExaminationFee}
                  disabled={!editExaminationFeeForm.examination_type.trim() || !editExaminationFeeForm.fee || parseFloat(editExaminationFeeForm.fee) <= 0}
                >
                  Cập nhật
                </Button>
              </div>

              <div className="border-t pt-4">
                {editExaminationFeeForm.is_active ? (
                  <Button
                    variant="outline"
                    className="w-full text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => handleDeactivateExaminationFee(selectedExaminationFee._id)}
                  >
                    🚫 Vô hiệu hóa dịch vụ khám
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => handleReactivateExaminationFee(selectedExaminationFee._id)}
                  >
                    🔄 Kích hoạt lại dịch vụ khám
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận check-in với giá khám */}
      {showCheckInModal && selectedAppointmentForCheckIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Xác nhận Check-in
                </h2>
                <button
                  onClick={() => {
                    setShowCheckInModal(false);
                    setSelectedAppointmentForCheckIn(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Thông tin bệnh nhân */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Thông tin bệnh nhân:</h3>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Tên:</span>{' '}
                    {selectedAppointmentForCheckIn.patient_id?.user_id?.full_name || 'Chưa có'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Bác sĩ:</span>{' '}
                    BS. {selectedAppointmentForCheckIn.doctor_id?.user_id?.full_name || 'Chưa có'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Chuyên khoa:</span>{' '}
                    {selectedAppointmentForCheckIn.doctor_id?.specialty_id?.name || 'Chưa xác định'}
                  </p>
                </div>

                {/* Hiển thị giá khám */}
                {selectedExaminationFeeForCheckIn && (
                  <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Phí khám:</p>
                        <p className="text-xs text-gray-600">{selectedExaminationFeeForCheckIn.examination_type}</p>
                        {selectedExaminationFeeForCheckIn.description && (
                          <p className="text-xs text-gray-500 mt-1">{selectedExaminationFeeForCheckIn.description}</p>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {selectedExaminationFeeForCheckIn.fee.toLocaleString('vi-VN')} VNĐ
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCheckInModal(false);
                      setSelectedAppointmentForCheckIn(null);
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={handleConfirmCheckIn}
                    disabled={!selectedExaminationFeeForCheckIn}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Xác nhận Check-in
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal hủy lịch hẹn */}
      {showCancelModal && selectedAppointmentForCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Hủy lịch hẹn</h2>
              <Button
                onClick={() => setShowCancelModal(false)}
                variant="outline"
                size="sm"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Bệnh nhân</div>
                <div className="font-medium">{selectedAppointmentForCancel.patient_id?.user_id?.full_name}</div>
                <div className="text-sm text-gray-600 mt-2">Thời gian</div>
                <div className="text-sm">
                  {new Date(selectedAppointmentForCancel.appointment_time).toLocaleDateString('vi-VN')} - 
                  {new Date(selectedAppointmentForCancel.appointment_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div>
                <Label htmlFor="cancellation-reason">Lý do hủy (Admin)</Label>
                <textarea
                  id="cancellation-reason"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mt-2 min-h-[100px]"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Nhập lý do hủy lịch hẹn..."
                />
                <p className="text-xs text-gray-500 mt-1">Lý do sẽ được lưu vào ghi chú của lịch hẹn</p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCancelModal(false)}
                >
                  Hủy bỏ
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleConfirmCancel}
                >
                  Xác nhận hủy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm dịch vụ khám */}
      {showAddExaminationFeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Thêm dịch vụ khám mới</h2>
              <Button
                onClick={() => setShowAddExaminationFeeModal(false)}
                variant="outline"
                size="sm"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="examination-type">Tên dịch vụ khám *</Label>
                <Input
                  id="examination-type"
                  className="mt-3"
                  value={examinationFeeForm.examination_type}
                  onChange={(e) => setExaminationFeeForm({...examinationFeeForm, examination_type: e.target.value})}
                  placeholder="Ví dụ: Khám nội tổng quát"
                />
              </div>

              <div>
                <Label htmlFor="examination-specialty">Chuyên khoa (tùy chọn)</Label>
                <select
                  id="examination-specialty"
                  className="mt-3 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={examinationFeeForm.specialty_id}
                  onChange={(e) => setExaminationFeeForm({...examinationFeeForm, specialty_id: e.target.value})}
                >
                  <option value="">-- Tất cả chuyên khoa --</option>
                  {specialties.map(specialty => (
                    <option key={specialty._id} value={specialty._id}>
                      {specialty.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Để trống nếu áp dụng cho tất cả chuyên khoa</p>
              </div>

              <div>
                <Label htmlFor="examination-fee">Phí khám (VNĐ) *</Label>
                <Input
                  id="examination-fee"
                  className="mt-3"
                  type="number"
                  value={examinationFeeForm.fee}
                  onChange={(e) => setExaminationFeeForm({...examinationFeeForm, fee: e.target.value})}
                  placeholder="Ví dụ: 200000"
                />
              </div>

              <div>
                <Label htmlFor="examination-description">Mô tả</Label>
                <Input
                  id="examination-description"
                  className="mt-3"
                  value={examinationFeeForm.description}
                  onChange={(e) => setExaminationFeeForm({...examinationFeeForm, description: e.target.value})}
                  placeholder="Nhập mô tả dịch vụ khám"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddExaminationFeeModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleAddExaminationFee}
                  disabled={!examinationFeeForm.examination_type.trim() || !examinationFeeForm.fee || parseFloat(examinationFeeForm.fee) <= 0}
                >
                  Thêm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomepageAdmin;
