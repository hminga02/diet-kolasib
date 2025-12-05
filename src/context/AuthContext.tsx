// Add this helper function at the top of AuthProvider
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

// Update the signOut function to include service worker cleanup
const signOut = async () => {
  setLoading(true);
  try {
    await supabase.auth.signOut();
    
    // Clear service workers and caches
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

// Also update forceClearStaleSession to clear service workers
const forceClearStaleSession = async () => {
  console.log("Force clearing stale session...");
  
  // Clear service workers
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
