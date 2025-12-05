import { useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/layouts/DashboardLayout";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Courses from "./pages/Courses";
import Students from "./pages/Students";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import FacultyPage from "./pages/Faculty";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import Unauthorized from "./pages/Unauthorized";
import UserManagement from "./pages/UserManagement";
import StudentDetail from "./pages/StudentDetail";
import FacultyDetail from "./pages/FacultyDetail";
import Profile from "./pages/Profile";
import Attendance from "./pages/Attendance";
import AttendanceReports from "./pages/AttendanceReports";
import Resources from "./pages/Resources";
import StudentDashboard from "./pages/StudentDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import AlumniPage from "./pages/Alumni";
import AlumniDetail from "./pages/AlumniDetail";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Simple function to clear all app data
const clearAllAppData = () => {
  console.log("Clearing all app data...");
  
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear all cookies
  document.cookie.split(";").forEach(function(c) {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=" + window.location.hostname);
  });
  
  // Clear IndexedDB if needed
  if (window.indexedDB) {
    window.indexedDB.databases().then((databases) => {
      databases.forEach((db) => {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
        }
      });
    });
  }
  
  // Clear service worker caches
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        caches.delete(cacheName);
      });
    });
  }
  
  // Unregister all service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister();
      });
    });
  }
  
  // Force a hard reload
  window.location.href = '/login';
};

// Component to handle service worker cleanup on auth pages
const ServiceWorkerCleanup = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Only run on auth pages
    if (location.pathname === '/login' || location.pathname === '/forgot-password') {
      // Unregister any service workers on auth pages
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
          });
        });
      }
    }
  }, [location.pathname]);
  
  return null;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const [showResetButton, setShowResetButton] = useState(false);
  
  // Show reset button after 2 seconds of loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowResetButton(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [loading]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-muted-foreground">Loading application...</p>
        
        {showResetButton && (
          <div className="mt-6 space-y-2">
            <button
              onClick={clearAllAppData}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Reset App State
            </button>
            <p className="text-xs text-muted-foreground text-center">
              If the app is stuck, click above to reset
            </p>
          </div>
        )}
      </div>
    );
  }

  const DashboardSelector = () => {
    if (!user) {
      return null; // Will be handled by ProtectedRoute
    }

    switch (user.role) {
      case "admin":
        return <AdminDashboard />;
      case "faculty":
        return <FacultyDashboard />;
      case "staff":
        return <StaffDashboard />;
      case "student":
        return <StudentDashboard />;
      default:
        return <StudentDashboard />;
    }
  };

  return (
    <>
      <ServiceWorkerCleanup />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<ResetPasswordPage />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        
        <Route element={<DashboardLayout />}>
          <Route path="/" element={
            <ProtectedRoute requiredRoles={["admin", "faculty", "staff", "student"]}>
              <DashboardSelector />
            </ProtectedRoute>
          } />
          
          {/* All other routes remain the same */}
          <Route path="/about" element={<ProtectedRoute requiredRoles={["admin", "faculty", "staff", "student"]}><About /></ProtectedRoute>} />
          <Route path="/contact" element={<ProtectedRoute requiredRoles={["admin", "faculty", "staff", "student"]}><Contact /></ProtectedRoute>} />
          <Route path="/courses" element={<ProtectedRoute requiredRoles={["admin", "faculty", "staff"]}><Courses /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute requiredRoles={["admin", "faculty", "staff"]}><Students /></ProtectedRoute>} />
          <Route path="/students/:id" element={<ProtectedRoute requiredRoles={["admin", "faculty", "staff", "student"]}><StudentDetail /></ProtectedRoute>} />
          <Route path="/faculty" element={<ProtectedRoute requiredRoles={["admin", "staff"]}><FacultyPage /></ProtectedRoute>} />
          <Route path="/faculty/:id" element={<ProtectedRoute requiredRoles={["admin", "faculty", "staff"]}><FacultyDetail /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute requiredRoles={["admin", "faculty", "staff"]}><Attendance /></ProtectedRoute>} />
          <Route path="/attendance-reports" element={<ProtectedRoute requiredRoles={["admin", "faculty", "staff"]}><AttendanceReports /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute requiredRoles={["admin", "faculty", "staff", "student"]}><Resources /></ProtectedRoute>} />
          <Route path="/alumni" element={<ProtectedRoute requiredRoles={["admin", "staff"]}><AlumniPage /></ProtectedRoute>} />
          <Route path="/alumni/:id" element={<ProtectedRoute requiredRoles={["admin", "staff", "faculty", "student"]}><AlumniDetail /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute requiredRoles={["admin", "faculty", "staff", "student"]}><Calendar /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute requiredRoles={["admin", "faculty", "staff", "student"]}><Settings /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute requiredRoles={["admin", "faculty", "staff"]}><Reports /></ProtectedRoute>} />
          <Route path="/user-management" element={<ProtectedRoute requiredRoles={["admin"]}><UserManagement /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute requiredRoles={["admin", "faculty", "staff", "student"]}><Profile /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  // Clear any residual auth state on app start
  useEffect(() => {
    // Check if we're coming from a successful login redirect
    const urlParams = new URLSearchParams(window.location.search);
    const fromLogin = urlParams.get('fromLogin');
    
    if (fromLogin === 'true') {
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    // Add a global reset function for debugging
    (window as any).resetApp = clearAllAppData;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
