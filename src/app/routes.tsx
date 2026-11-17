import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/features/auth/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";
import LandingPage from "@/pages/public/LandingPage";
import LoginPage from "@/pages/auth/LoginPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import ChangePasswordPage from "@/pages/auth/ChangePasswordPage";
import FarmerSignupPage from "@/pages/auth/FarmerSignupPage";
import FarmerDashboard from "@/pages/farmer/FarmerDashboard";
import FarmerCameras from "@/pages/farmer/FarmerCameras";
import BrowseRooms from "@/pages/farmer/BrowseRooms";
import RoomDetailPage from "@/pages/farmer/RoomDetailPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminRooms from "@/pages/admin/AdminRooms";
import AdminCameras from "@/pages/admin/AdminCameras";
import AdminFarmers from "@/pages/admin/AdminFarmers";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import RentalsPage from "@/features/rentals/RentalsPage";
import RentalRequestPage from "@/features/rentals/RentalRequestPage";
import ServicesPage from "@/features/services/ServicesPage";
import PaymentsPage from "@/features/payments/PaymentsPage";
import ProfileSettingsPage from "@/features/profile/ProfileSettingsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/rooms" element={<BrowseRooms />} />
      <Route path="/rooms/:roomId" element={<RoomDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>
      <Route path="/signup" element={<FarmerSignupPage />} />
      <Route path="/rental-request" element={<RentalRequestPage />} />

      <Route element={<ProtectedRoute role="farmer" />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<FarmerDashboard />} />
          <Route path="/rentals" element={<RentalsPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/cameras" element={<FarmerCameras />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="admin" />}>
        <Route element={<AppShell />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/rentals" element={<RentalsPage />} />
          <Route path="/admin/rooms" element={<AdminRooms />} />
          <Route path="/admin/cameras" element={<AdminCameras />} />
          <Route path="/admin/farmers" element={<AdminFarmers />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/settings" element={<ProfileSettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
