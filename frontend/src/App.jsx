import { Toaster } from 'sonner';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppointmentHome from './pages/AppointmentHome.jsx';
import HomepagePatient from './pages/HomepagePatient.jsx';
import HomepageReceptionist from './pages/HomepageReceptionist.jsx';
import HomepageAdmin from './pages/HomepageAdmin.jsx';
import RegisterStaff from './pages/RegisterStaff.jsx';
import HomepageDoctor from './pages/HomepageDoctor.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Setting from './pages/setting.jsx';
import DrugWarehouse from './pages/DrugWarehouse.jsx';
import PatientProfile from './pages/PatientProfile.jsx';
import DoctorProfile from './pages/DoctorProfile.jsx';
import ReceptionistProfile from './pages/ReceptionistProfile.jsx';
import SupplierDetail from './pages/SupplierDetail.jsx';
import RevenueReport from './pages/RevenueReport.jsx';

function App() {

  return (
    <>  
    <Toaster />
      <BrowserRouter>
        <Routes>
          <Route 
          path="/patient" element={<HomepagePatient />} 
          />
          <Route 
          path="/login" element={<Login />} 
          />
          <Route 
          path="/" element={<Login />} 
          />  
          <Route 
          path="/register" element={<Register />} 
          />
          <Route 
          path="/receptionist" element={<HomepageReceptionist />} 
          />
          <Route 
          path="/admin" element={<HomepageAdmin />} 
          />
          <Route
          path="/registerstaff" element={<RegisterStaff />}
          />
          <Route
          path="/doctor" element={<HomepageDoctor />}
          />
          <Route
          path="/setting" element={<Setting />}
          />
          <Route
          path="/drugwarehouse" element={<DrugWarehouse />}
          />
          <Route
          path="/appointmentHome" element={<AppointmentHome />}
          />
          <Route
          path="/patient/:userId" element={<PatientProfile />}
          />
          <Route
          path="/doctor/:userId" element={<DoctorProfile />}
          />
          <Route
          path="/receptionist/:userId" element={<ReceptionistProfile />}
          />
          <Route
          path="/supplier/:id" element={<SupplierDetail />}
          />
          <Route
          path="/revenue-report" element={<RevenueReport />}
          />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
