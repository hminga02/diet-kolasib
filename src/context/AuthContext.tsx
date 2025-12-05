import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { showSuccess, showError } from '@/utils/toast';

interface UserWithRole extends User {
  role?: "admin" | "faculty" | "staff" | "student";
  name?: string;
  avatar_url?: string;
  cloudinary_public_id?: string;
  rollno?: string;
  year?: number;
  status?: "active" | "passed-out" | "on-leave";
  phone_number?: string;
  address?: string;
  course?: string;
  branch?: string;
  abbreviation?: string;
  phone?: string;
}

interface AuthContextType {
  user: UserWithRole | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  forceClearStaleSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to clear all auth data
const clearAllAuthData = () => {
  console.log("Clearing all auth data...");
  
  // Clear localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('sb-') || key.includes('auth') || key.includes('last_auth')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear cookies
  document.cookie.split(";").forEach(function(c) {
    const cookieName = c.split("=")[0].trim();
    if (cookieName.includes('supabase') || cookieName.includes('sb-') || cookieName.includes('auth')) {
      document.cookie = cookieName + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }
  });
};

// Helper to clean up service workers
export const cleanupServiceWorkers = async () => {
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const initializationAttempted = useRef(false);

  // Function to force clear stale session
  const forceClearStaleSession = async () => {
    console.log("Force clearing stale session...");
    await cleanupServiceWorkers();
    clearAllAuthData();
    setUser(null);
    setSession(null);
    setLoading(false);
    setInitialized(true);
    
    // If we're not already on login page, redirect
    if (window.location.pathname !== '/login' && window.location.pathname !== '/forgot-password') {
      window.location.href = '/login';
    }
  };

  // Check if session is stale (older than 24 hours)
  const isSessionStale = (session: Session): boolean => {
    if (!session.expires_at) return true;
    
    const expiresAt = new Date(session.expires_at * 1000); // Convert to milliseconds
    const now = new Date();
    const hoursSinceExpiry = (now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceExpiry > 24; // Consider stale if expired more than 24 hours ago
  };

  // Get user with role details - FIXED: Use .maybeSingle() instead of .single()
  const getUserWithRole = useCallback(async (baseUser: User): Promise<UserWithRole | null> => {
    try {
      console.log("Fetching user profile for ID:", baseUser.id);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, name, avatar_url, cloudinary_public_id')
        .eq('id', baseUser.id)
        .maybeSingle(); // Changed from .single() to .maybeSingle()

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        // Return basic user if profile doesn't exist
        return { ...baseUser, role: 'student', name: baseUser.email };
      }

      // If no profile found, create a basic one
      if (!profile) {
        console.warn('No profile found for user, creating basic profile');
        return { ...baseUser, role: 'student', name: baseUser.email };
      }

      let userWithRole: UserWithRole = { 
        ...baseUser, 
        role: profile?.role || 'student', 
        name: profile?.name || baseUser.email,
        avatar_url: profile?.avatar_url,
        cloudinary_public_id: profile?.cloudinary_public_id
      };

      // Try to fetch additional role details - FIXED: Use .maybeSingle() and handle errors
      try {
        if (userWithRole.role === "student") {
          console.log("Fetching student details for user ID:", baseUser.id);
          const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('user_id', baseUser.id)
            .maybeSingle(); // Changed from .single() to .maybeSingle()
          
          if (error) {
            console.error('Error fetching student profile:', error);
          } else if (data) {
            console.log("Student data found:", data);
            Object.assign(userWithRole, data);
          } else {
            console.warn('No student record found for user ID:', baseUser.id);
          }
        } else if (userWithRole.role === "faculty") {
          console.log("Fetching faculty details for user ID:", baseUser.id);
          const { data, error } = await supabase
            .from('faculty')
            .select('*')
            .eq('user_id', baseUser.id)
            .maybeSingle(); // Changed from .single() to .maybeSingle()
          
          if (error) {
            console.error('Error fetching faculty profile:', error);
          } else if (data) {
            console.log("Faculty data found:", data);
            Object.assign(userWithRole, data);
          } else {
            console.warn('No faculty record found for user ID:', baseUser.id);
          }
        }
      } catch (err) {
        console.warn('Role details fetch error:', err);
      }

      console.log("Final userWithRole object:", userWithRole);
      return userWithRole;
    } catch (error) {
      console.error('getUserWithRole error:', error);
      return { ...baseUser, role: 'student', name: baseUser.email };
    }
  }, []);

  // Initialize auth with automatic stale session detection
  useEffect(() => {
    if (initializationAttempted.current) return;
    initializationAttempted.current = true;
    
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("Initializing auth with stale session check...");
        
        // Get current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          await forceClearStaleSession();
          return;
        }

        console.log("Session found:", !!currentSession);

        if (!currentSession) {
          // No session
          if (mounted) {
            setUser(null);
            setSession(null);
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        // Check if session is stale
        if (isSessionStale(currentSession)) {
          console.log("Session is stale, clearing...");
          await forceClearStaleSession();
          return;
        }

        // Validate user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

        if (userError || !currentUser) {
          console.error("User validation error:", userError);
          await forceClearStaleSession();
          return;
        }

        console.log("User validated, fetching details...");
        
        // Session is valid, get user details
        const detailedUser = await getUserWithRole(currentUser);
        
        if (mounted) {
          setSession(currentSession);
          setUser(detailedUser);
          setLoading(false);
          setInitialized(true);
          console.log("Auth initialized with user:", detailedUser?.email);
          
          // Store last successful auth time
          localStorage.setItem('last_valid_auth', Date.now().toString());
        }

      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mounted) {
          await forceClearStaleSession();
        }
      }
    };

    // Add a small delay to ensure Supabase client is ready
    const timer = setTimeout(() => {
      initializeAuth();
    }, 100);

    // Timeout safety - if auth takes too long, clear and redirect
    const safetyTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth initialization timeout, forcing clear");
        forceClearStaleSession();
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timer);
      clearTimeout(safetyTimer);
    };
  }, [getUserWithRole, loading]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Auth state change:", event);
      
      if (event === 'SIGNED_OUT') {
        await cleanupServiceWorkers();
        clearAllAuthData();
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' && newSession) {
        setSession(newSession);
        const detailedUser = await getUserWithRole(newSession.user);
        setUser(detailedUser);
        setLoading(false);
        
        // Store last successful auth time
        localStorage.setItem('last_valid_auth', Date.now().toString());
      }

      if (event === 'TOKEN_REFRESHED' && newSession) {
        setSession(newSession);
        // Update last valid auth time on token refresh
        localStorage.setItem('last_valid_auth', Date.now().toString());
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [getUserWithRole]);

  const signIn = async (email: string, password: string, rememberMe?: boolean) => {
    setLoading(true);
    try {
      console.log("Signing in...", email, "rememberMe:", rememberMe);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("Sign in error:", error);
        throw error;
      }
      
      console.log("Sign in successful");
      showSuccess("Logged in successfully");
      
      // Store last successful auth time
      localStorage.setItem('last_valid_auth', Date.now().toString());
      
    } catch (error: any) {
      console.error('Sign in error:', error);
      showError(error.message || "Login failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      await cleanupServiceWorkers();
      clearAllAuthData();
      setUser(null);
      setSession(null);
      showSuccess("Logged out successfully");
      window.location.href = '/login';
    } catch (error: any) {
      console.error('Sign out error:', error);
      await cleanupServiceWorkers();
      clearAllAuthData();
      setUser(null);
      setSession(null);
      window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const updatedUser = await getUserWithRole(session.user);
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading: loading || !initialized,
    signIn,
    signOut,
    refreshUser,
    forceClearStaleSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
