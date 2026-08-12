import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { useAuthStore } from './store/authStore';
import { apiClient } from './api/client';

// Pages
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { PropertyDetailsPage } from './pages/PropertyDetailsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { EmailVerificationPage } from './pages/EmailVerificationPage';
import { GuestDashboardPage } from './pages/GuestDashboardPage';
import { HostDashboardPage } from './pages/HostDashboardPage';
import { AddPropertyPage } from './pages/AddPropertyPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminBookingsPage } from './pages/AdminBookingsPage';
import { BecomeHostPage } from './pages/BecomeHostPage';
import { AdminHostsPage } from './pages/AdminHostsPage';
import { AdminPropertiesPage } from './pages/AdminPropertiesPage';
import { HostPropertiesPage } from './pages/HostPropertiesPage';
import { HostEarningsPage } from './pages/HostEarningsPage';
import { HostCalendarPage } from './pages/HostCalendarPage';
import { HostBookingsPage } from './pages/HostBookingsPage';
import { MessagesPage } from './pages/MessagesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { MyReservationsPage } from './pages/MyReservationsPage';
import { ReservationDetailsPage } from './pages/ReservationDetailsPage';
import { CheckoutPage } from './pages/CheckoutPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  React.useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && !useAuthStore.getState().user) {
      apiClient
        .get('/auth/me')
        .then((res) => {
          if (res.data.success && res.data.data) {
            useAuthStore.getState().setAuth(res.data.data, token);
          }
        })
        .catch(() => {
          useAuthStore.getState().logout();
        });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/properties/:id" element={<PropertyDetailsPage />} />
              <Route path="/checkout/:propertyId" element={<CheckoutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<EmailVerificationPage />} />
              <Route path="/dashboard" element={<GuestDashboardPage />} />
              <Route path="/my-reservations" element={<MyReservationsPage />} />
              <Route path="/reservations/:id" element={<ReservationDetailsPage />} />
              <Route path="/become-a-host" element={<BecomeHostPage />} />
              <Route path="/host/dashboard" element={<HostDashboardPage />} />
              <Route path="/host/properties" element={<HostPropertiesPage />} />
              <Route path="/host/bookings" element={<HostBookingsPage />} />
              <Route path="/host/add-property" element={<AddPropertyPage />} />
              <Route path="/host/earnings" element={<HostEarningsPage />} />
              <Route path="/host/calendar" element={<HostCalendarPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/bookings" element={<AdminBookingsPage />} />
              <Route path="/admin/reservations" element={<AdminBookingsPage />} />
              <Route path="/admin/hosts" element={<AdminHostsPage />} />
              <Route path="/admin/properties" element={<AdminPropertiesPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/favorites" element={<SearchPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
