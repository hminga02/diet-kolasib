"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Clear Supabase storage
  const clearAuthStorage = () => {
    // Clear specific Supabase localStorage items
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage
    sessionStorage.clear();
  };

  // Get user with role details
  const getUserWithRole = useCallback(async (baseUser: User): Promise<UserWithRole | null> => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, name, avatar_url, cloudinary_public_id')
        .eq('id', baseUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return null;
      }

      let role = profile?.role || 'student';
      let userWithRole: UserWithRole = { 
        ...baseUser, 
        role, 
        name: profile?.name || baseUser.email,
        avatar_url: profile?.avatar_url,
        cloudinary_public_id: profile?.cloudinary_public_id
      };

      // Fetch additional role details
      try {
        if (role === "student") {
          const { data } = await supabase.from('students').select('*').eq('user_id', baseUser.id).maybeSingle();
          if (data) userWithRole = { ...userWithRole, ...data };
        } else if (role === "faculty") {
          const { data } = await supabase.from('faculty').select('*').eq('user_id', baseUser.id).maybeSingle();
          if (data) userWithRole = { ...userWithRole, ...data };
        }
      } catch (err) {
        console.error('Role details fetch error:', err);
      }

      return userWithRole;
    } catch (error) {
      console.error('getUserWithRole error:', error);
      return null;
    }
  }, []);

  // Initialize auth
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // First check for existing session
        const { data: { session: localSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !localSession) {
          // No session found
          if (mounted) {
            setUser(null);
            setSession(null);
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        // Verify the session is still valid
        const { data: { user: validUser }, error: verifyError } = await supabase.auth.getUser();

        if (verifyError || !validUser) {
          clearAuthStorage();
          if (mounted) {
            setUser(null);
            setSession(null);
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        // Session is valid, get user details
        if (mounted) {
          setSession(localSession);
          const detailedUser = await getUserWithRole(validUser);
          setUser(detailedUser);
          setLoading(false);
          setInitialized(true);
        }

      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mounted) {
          clearAuthStorage();
          setUser(null);
          setSession(null);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    // Delay initialization slightly to avoid race conditions
    const timer = setTimeout(() => {
      initializeAuth();
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [getUserWithRole]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state change:', event);
      
      if (event === 'SIGNED_OUT' || !newSession) {
        clearAuthStorage();
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        const detailedUser = await getUserWithRole(newSession.user);
        setUser(detailedUser);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [getUserWithRole]);

  const signIn = async (email: string, password: string, rememberMe = true) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Don't set user/session here - let onAuthStateChange handle it
      showSuccess("Logged in successfully");
      
      // IMPORTANT: Wait a moment for state to update, then redirect
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      
    } catch (error: any) {
      console.error('Sign in error:', error);
      showError(error.message || "Login failed");
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      clearAuthStorage();
      setUser(null);
      setSession(null);
      showSuccess("Logged out successfully");
      
      // Redirect to login
      window.location.href = '/login';
    } catch (error: any) {
      console.error('Sign out error:', error);
      clearAuthStorage();
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
