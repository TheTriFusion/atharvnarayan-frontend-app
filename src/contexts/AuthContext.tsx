import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authAPI, removeToken } from '../utils/api';

interface User {
  id: string;
  role: string;
  name?: string;
  phoneNumber?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  login: (phoneNumber: string, password: string) => Promise<{ success: boolean; user?: User; message?: string }>;
  loginSuperAdmin: (phoneNumber: string, password: string) => Promise<{ success: boolean; user?: User; message?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isCattleFeedOwner: boolean;
  isMilkTruckOwner: boolean;
  isCattleFeedTruckOwner: boolean;
  isCattleFeedTruckDriver: boolean;
  isSeller: boolean;
  isDriver: boolean;
  isAdmin: boolean;
  isOwner: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // Only check auth once on mount
    if (hasCheckedAuth.current) return;

    const checkAuth = async () => {
      try {
        // Only check if token exists
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        const token = await AsyncStorage.default.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await authAPI.getCurrentUser();
        const user = normalizeUser(response?.user);
        if (response.success && user) {
          setUser(user);
        } else {
          await removeToken();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        await removeToken();
      } finally {
        setLoading(false);
        hasCheckedAuth.current = true;
      }
    };

    checkAuth();
  }, []);

  const normalizeUser = (raw: any): User | null => {
    if (!raw || typeof raw !== 'object') return null;
    const id = raw.id ?? raw._id;
    const idStr = id != null ? String(id) : undefined;
    if (!idStr) return null;
    return { ...raw, id: idStr, _id: idStr };
  };

  const login = async (phoneNumber: string, password: string) => {
    try {
      const response = await authAPI.login(phoneNumber, password);
      const user = normalizeUser(response?.user);
      if (response.success && user) {
        setUser(user);
        return { success: true, user };
      }
      return { success: false, message: response?.message || 'Login failed' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const loginSuperAdmin = async (phoneNumber: string, password: string) => {
    try {
      const response = await authAPI.loginSuperAdmin(phoneNumber, password);
      const user = normalizeUser(response?.user);
      if (response.success && user) {
        setUser(user);
        return { success: true, user };
      }
      return { success: false, message: response?.message || 'Login failed' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const logout = async () => {
    setUser(null);
    hasCheckedAuth.current = false;
    await removeToken();
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    loginSuperAdmin,
    logout,
    loading,
    isAuthenticated: !!user,
    // Role checks
    isSuperAdmin: user?.role === 'superadmin',
    isCattleFeedOwner: user?.role === 'cattleFeedOwner',
    isMilkTruckOwner: user?.role === 'milkTruckOwner',
    isCattleFeedTruckOwner: user?.role === 'cattleFeedTruckOwner',
    isCattleFeedTruckDriver: user?.role === 'cattleFeedTruckDriver',
    isSeller: user?.role === 'cattleFeedSeller',
    isDriver: user?.role === 'milkTruckDriver',
    // Legacy aliases for backward compatibility
    isAdmin: user?.role === 'cattleFeedOwner' || user?.role === 'admin',
    isOwner: user?.role === 'milkTruckOwner' || user?.role === 'owner',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

