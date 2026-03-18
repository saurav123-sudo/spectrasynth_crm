// Utility functions for user role management
import React from 'react';

// Get current user from localStorage
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Check if current user is admin
export const isAdmin = () => {
  const user = getCurrentUser();
  if (!user) return false;
  
  // Check if user has admin role
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.some(role => role.role === 'admin' || role === 'admin');
  }
  
  // Check if user has admin in permissions or directly
  if (user.role === 'admin') return true;
  if (user.permissions && user.permissions.includes('admin')) return true;
  
  return false;
};

// Check if user has specific role
export const hasRole = (roleName) => {
  const user = getCurrentUser();
  if (!user) return false;
  
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.some(role => 
      (typeof role === 'string' && role === roleName) ||
      (role.role === roleName)
    );
  }
  
  return user.role === roleName;
};

// Hook for checking admin status in components
export const useIsAdmin = () => {
  const [isAdminUser, setIsAdminUser] = React.useState(false);
  
  React.useEffect(() => {
    setIsAdminUser(isAdmin());
  }, []);
  
  return isAdminUser;
};