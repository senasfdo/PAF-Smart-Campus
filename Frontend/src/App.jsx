import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

import Home from "./pages/public/Home";
import Login from "./pages/public/Login";
import Facilities from "./pages/public/Facilities";
import Contact from "./pages/public/Contact";
import SystemUsers from "./pages/admin/SystemUsers";
import OAuthCallback from "./pages/OAuthCallback";
import Notifications from "./pages/notifications/Notifications";
import ManageBookings from "./pages/admin/ManageBookings";
import StudentDashboard from "./pages/student/StudentDashboard";
import MyBookings from "./pages/student/MyBookings";
import MyTickets from "./pages/student/MyTickets";
import CreateTicket from "./pages/student/CreateTicket";
import MyProfile from "./pages/profile/MyProfile";
import ManageFacilities from "./pages/admin/ManageFacilities";
import FacilityAnalytics from "./pages/admin/FacilityAnalytics";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageTickets from "./pages/admin/ManageTickets";
import ManageAnnouncements from "./pages/admin/ManageAnnouncements";
import TechnicianDashboard from "./pages/technician/TechnicianDashboard";
import TechnicianTickets from "./pages/technician/TechnicianTickets";
import QrCheckInPage from "./pages/checkin/QrCheckInPage";
import QrCheckInCenter from "./pages/checkin/QrCheckInCenter";

const DashboardRedirect = () => {
  const { loading, isAuthenticated, dashboardPath } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={dashboardPath || "/"} replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/oauth-success" element={<OAuthCallback />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/facilities" element={<Facilities />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/notifications" element={<Notifications />} />

        <Route element={<RoleRoute allowedRoles={["STUDENT", "LECTURER"]} />}>
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/my-tickets" element={<MyTickets />} />
          <Route path="/my-tickets/new" element={<CreateTicket />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={["STUDENT"]} />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/profile" element={<MyProfile />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={["LECTURER"]} />}>
          <Route path="/lecturer" element={<StudentDashboard />} />
          <Route path="/lecturer/profile" element={<MyProfile />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={["TECHNICIAN"]} />}>
          <Route path="/technician" element={<TechnicianDashboard />} />
          <Route path="/technician/tickets" element={<TechnicianTickets />} />
          <Route path="/technician/profile" element={<MyProfile />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={["MANAGER"]} />}>
          <Route path="/manager" element={<AdminDashboard />} />
          <Route path="/manager/profile" element={<MyProfile />} />
          <Route path="/manager/tickets" element={<ManageTickets />} />
          <Route path="/manager/bookings" element={<ManageBookings />} />
          <Route path="/manager/announcements" element={<ManageAnnouncements />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/profile" element={<MyProfile />} />
          <Route path="/admin/tickets" element={<ManageTickets />} />
          <Route path="/admin/bookings" element={<ManageBookings />} />
          <Route path="/admin/facilities" element={<FacilityAnalytics />} />
          <Route path="/admin/facilities/manage" element={<ManageFacilities />} />
          <Route path="/admin/users" element={<SystemUsers />} />
          <Route path="/admin/announcements" element={<ManageAnnouncements />} />
        </Route>

        <Route
          element={
            <RoleRoute allowedRoles={["TECHNICIAN", "MANAGER", "ADMIN"]} />
          }
        >
          <Route path="/qr-check-in-center" element={<QrCheckInCenter />} />
          <Route path="/qr-check-in/:token" element={<QrCheckInPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;