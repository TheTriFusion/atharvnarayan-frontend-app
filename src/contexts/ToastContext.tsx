import React, { createContext, useContext, useState } from 'react';
import Toast from 'react-native-toast-message';

interface ToastContextType {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const success = (message: string, duration: number = 3000) => {
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: message,
      visibilityTime: duration,
    });
  };

  const error = (message: string, duration: number = 3000) => {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: message,
      visibilityTime: duration,
    });
  };

  const warning = (message: string, duration: number = 3000) => {
    Toast.show({
      type: 'info',
      text1: 'Warning',
      text2: message,
      visibilityTime: duration,
    });
  };

  const info = (message: string, duration: number = 3000) => {
    Toast.show({
      type: 'info',
      text1: 'Info',
      text2: message,
      visibilityTime: duration,
    });
  };

  const value: ToastContextType = {
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

