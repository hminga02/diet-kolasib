import { useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
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
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
    },
  },
});

// Custom service worker registration
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
    try {
      // Only register on authenticated pages (not login/forgot-password)
      const isAuthPage = window.location.pathname === '/login' || 
                         window.location.pathname === '/forgot-password' || 
                         window.location.pathname === '/update-password';
      
      if (!isAuthPage) {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none', // Always check for updates
        });
        
        console.log('Service Worker registered:', registration);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New service worker available. Refresh to update.');
                // You could show an update notification here
              }
            });
          }
        });
        
        return registration;
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// Clean up service workers on auth pages
const cleanupServiceWorkers = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    
    // Clear caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    }
  }
};

const AppRoutes = () => {
  const { user, loading, forceClearStaleSession } = useAuth();
  const navigate = useNavigate();
  const [showReset, setShowReset] = useState(false);
  const [autoCleared, setAutoCleared] = useState(false);

  // Register service worker when authenticated
  useEffect(() => {
    const initializeServiceWorker = async () => {
      // Clean up on auth pages
      if (window.location.pathname === '/login' || 
          window.location.pathname === '/forgot-password') {
        await cleanupServiceWorkers();
        return;
      }
      
      // Register on authenticated pages
      if (user && !loading) {
        await registerServiceWorker();
      }
    };
    
    initializeServiceWorker();
  }, [user, loading]);

  // Auto-clear stale session after 3 seconds if still loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && !user && !autoCleared) {
        console.log("Auto-clearing potentially stale session...");
        setAutoCleared(true);
        forceClearStaleSession();
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [loading, user, autoCleared, forceClearStaleSession]);

  // Show reset button after 5 seconds as fallback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setShowReset(true);
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [loading]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg text-muted-foreground">
          {autoCleared ? "Clearing stale session..." : "Loading application..."}
        </p>
        
        {showReset && (
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              cleanupServiceWorkers();
              window.location.href = '/login';
            }}
            className="mt-4 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Force Reset App
          </button>
        )}
      </div>
    );
  }

  const DashboardSelector = () => {
    if (!user) {
      return null;
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
  );
};

const App = () => {
  useEffect(() => {
    // Clean up any existing service workers on app start
    const cleanupOnStart = async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          // Keep only the latest service worker
          registration.update();
        }
      }
    };
    
    cleanupOnStart();
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
