import React, { useState, useEffect, useCallback } from 'react';
import { authAPI, clearAuthStorage } from '../services/api';
import AuthContext from './authContextStore';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const resetAuthState = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    clearAuthStorage();
  }, []);

  const bootstrapSession = useCallback(async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      resetAuthState();
      setAuthChecked(true);
      setIsLoadingAuth(false);
      return;
    }

    try {
      setIsLoadingAuth(true);
      const response = await authAPI.getCurrentUser({ skipAuthRedirect: true });
      const nextUser = response.data;
      setUser(nextUser);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(nextUser));
    } catch {
      resetAuthState();
    } finally {
      setAuthChecked(true);
      setIsLoadingAuth(false);
    }
  }, [resetAuthState]);

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    resetAuthState();
    setAuthChecked(true);
    setIsLoadingAuth(false);
  };

  const value = {
    user,
    isAuthenticated,
    isLoadingAuth,
    authChecked,
    loading: isLoadingAuth,
    login,
    updateUser,
    logout,
    bootstrapSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
