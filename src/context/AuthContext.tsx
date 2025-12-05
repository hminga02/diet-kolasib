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
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Get user with role details
  const getUserWithRole = useCallback(async (baseUser: User): Promise<UserWithRole | null> => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, name, avatar_url, cloudinary_public_id')
        .eq('id', baseUser.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return { ...baseUser, role: 'student', name: baseUser.email };
      }

      let userWithRole: UserWithRole = { 
        ...baseUser, 
        role: profile?.role || 'student', 
        name: profile?.name || baseUser.email,
        avatar_url: profile?.avatar_url,
        cloudinary_public_id: profile?.cloudinary_public_id
      };

      // Try to fetch additional role details
      try {
        if (userWithRole.role === "student") {
          const { data } = await supabase.from('students').select('*').eq('user_id', baseUser.id).single();
          if (data) Object.assign(userWithRole, data);
        } else if (userWithRole.role === "faculty") {
          const { data } = await supabase.from('faculty').select('*').eq('user_id', baseUser.id).single();
          if (data) Object.assign(userWithRole, data);
        }
      } catch (err) {
        console.warn('Role details fetch error:', err);
      }

      return userWithRole;
    } catch (error) {
      console.error('getUserWithRole error:', error);
      return { ...baseUser, role: 'student', name: baseUser.email };
    }
  }, []);

  // Initialize auth - SIMPLE VERSION
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...");
        
        // Get current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          if (mounted) {
            setUser(null);
            setSession(null);
            setLoading(false);
            setInitialized(true);
          }
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

        // Validate user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

        if (userError || !currentUser) {
          console.error("User validation error:", userError);
          if (mounted) {
            setUser(null);
            setSession(null);
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        // Get user details
        const detailedUser = await getUserWithRole(currentUser);
        
        if (mounted) {
          setSession(currentSession);
          setUser(detailedUser);
          setLoading(false);
          setInitialized(true);
          console.log("Auth initialized with user:", detailedUser?.email);
        }

      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mounted) {
          setUser(null);
          setSession(null);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Auth state change:", event);
      
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
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
      }

      if (event === 'TOKEN_REFRESHED' && newSession) {
        setSession(newSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [getUserWithRole]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log("Signing in...", email);
      
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
      
      // Auth state will be updated via onAuthStateChange
      // Redirect will happen in ProtectedRoute or useEffect
      
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
      setUser(null);
      setSession(null);
      showSuccess("Logged out successfully");
      window.location.href = '/login';
    } catch (error: any) {
      console.error('Sign out error:', error);
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
