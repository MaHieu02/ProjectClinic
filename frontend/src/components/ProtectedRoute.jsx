import React from 'react';
import { getCurrentUserFromStorage, canAccessRoute } from '@/utils/auth.js';

const ProtectedRoute = ({ children, requiredRole = null, redirectTo = '/login' }) => {
  const user = getCurrentUserFromStorage();
  
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  
  if (requiredRole && !canAccessRoute(requiredRole)) {
    switch (user.role) {
      case 'patient':
        window.location.href = '/';
        break;
      case 'doctor':
        window.location.href = '/doctor';
        break;
      case 'receptionist':
        window.location.href = '/receptionist';
        break;
      case 'admin':
        window.location.href = '/admin';
        break;
      default:
        window.location.href = '/login';
    }
    return null;
  }
  
  return children;
};

export default ProtectedRoute;