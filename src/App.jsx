import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import NavBar from './components/NavBar';
import Login from './components/Login';
import Register from './components/Register';
import AdminPanel from './components/AdminPanel';
import Toast from './components/Toast';
import FeedPage from './pages/FeedPage';
import NewPostPage from './pages/NewPostPage';
import SavedPostsPage from './pages/SavedPostsPage';
import SchedulePage from './pages/SchedulePage';
import BookingPage from './pages/BookingPage';
import BookingsPage from './pages/BookingsPage';
import ReferralPage from './pages/ReferralPage';
import ProfilePage from './pages/ProfilePage';
import PricingPage from './pages/PricingPage';
import PublicProfilePage from './pages/PublicProfilePage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function RequireAdmin({ children }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === 'admin' ? children : <Navigate to="/" replace />;
}

function RequireApprovedTeacher({ children }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === 'teacher' && user?.teacherStatus === 'approved' ? (
    children
  ) : (
    <Navigate to="/" replace />
  );
}

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function RequireStudent({ children }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === 'student' ? children : <Navigate to="/" replace />;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center text-[#71717a] text-sm">
      იტვირთება...
    </div>
  );
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="max-w-full overflow-x-clip">
      <Toast toasts={toasts} setToasts={setToasts} />
      <NavBar />
      <main className="max-w-full overflow-x-hidden">
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <Login addToast={addToast} />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/" replace /> : <Register addToast={addToast} />}
          />
          <Route
            path="/reset-password"
            element={isAuthenticated ? <Navigate to="/" replace /> : <ResetPasswordPage addToast={addToast} />}
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPanel addToast={addToast} />
              </RequireAdmin>
            }
          />
          <Route
            path="/new-post"
            element={
              <RequireApprovedTeacher>
                <NewPostPage addToast={addToast} />
              </RequireApprovedTeacher>
            }
          />
          <Route
            path="/saved"
            element={
              <RequireAuth>
                <SavedPostsPage addToast={addToast} />
              </RequireAuth>
            }
          />
          <Route
            path="/schedule"
            element={
              <RequireApprovedTeacher>
                <SchedulePage addToast={addToast} />
              </RequireApprovedTeacher>
            }
          />
          <Route
            path="/referrals"
            element={
              <RequireApprovedTeacher>
                <ReferralPage addToast={addToast} />
              </RequireApprovedTeacher>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireApprovedTeacher>
                <ProfilePage addToast={addToast} />
              </RequireApprovedTeacher>
            }
          />
          <Route
            path="/book/:teacherId"
            element={
              <RequireStudent>
                <BookingPage addToast={addToast} />
              </RequireStudent>
            }
          />
          <Route
            path="/bookings"
            element={
              <RequireAuth>
                <BookingsPage addToast={addToast} />
              </RequireAuth>
            }
          />
          <Route path="/pricing" element={<PricingPage addToast={addToast} />} />
          <Route path="/teachers/:id" element={<PublicProfilePage addToast={addToast} />} />
          <Route path="/" element={<FeedPage addToast={addToast} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
