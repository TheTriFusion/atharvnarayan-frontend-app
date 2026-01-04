import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

interface OwnerData {
  id: string;
  name?: string;
  [key: string]: any;
}

interface OwnerContextType {
  selectedOwnerId: string | null;
  selectedOwnerData: OwnerData | null;
  ownerType: 'cattleFeed' | 'milkTruck' | 'cattleFeedTruck';
  selectOwner: (ownerId: string, ownerData: OwnerData, type?: 'cattleFeed' | 'milkTruck' | 'cattleFeedTruck') => Promise<void>;
  clearOwner: () => Promise<void>;
  hasOwnerSelected: boolean;
}

const OwnerContext = createContext<OwnerContextType | undefined>(undefined);

export const useOwner = (): OwnerContextType => {
  const context = useContext(OwnerContext);
  if (!context) {
    console.error('useOwner: Context not found, returning default values');
    // Return default values instead of throwing
    return {
      selectedOwnerId: null,
      selectedOwnerData: null,
      ownerType: 'cattleFeed',
      selectOwner: async () => {},
      clearOwner: async () => {},
      hasOwnerSelected: false,
    };
  }
  return context;
};

export const OwnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const isSuperAdmin = auth?.isSuperAdmin || false;
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [selectedOwnerData, setSelectedOwnerData] = useState<OwnerData | null>(null);
  const [ownerType, setOwnerType] = useState<'cattleFeed' | 'milkTruck' | 'cattleFeedTruck'>('cattleFeed');
  const hasLoadedRef = useRef(false);

  // Load selected owner from AsyncStorage - only once
  useEffect(() => {
    if (isSuperAdmin && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      const loadOwner = async () => {
        try {
          const saved = await AsyncStorage.getItem('superadmin_selected_owner');
          if (saved) {
            const parsed = JSON.parse(saved);
            setSelectedOwnerId(parsed.ownerId);
            setSelectedOwnerData(parsed.ownerData);
            setOwnerType(parsed.ownerType || 'cattleFeed');
          }
        } catch (error) {
          console.error('Failed to parse saved owner:', error);
        }
      };
      loadOwner();
    }
  }, [isSuperAdmin]);

  // Memoize callbacks to prevent re-renders
  const selectOwner = useCallback(async (ownerId: string, ownerData: OwnerData, type: 'cattleFeed' | 'milkTruck' | 'cattleFeedTruck' = 'cattleFeed') => {
    setSelectedOwnerId(ownerId);
    setSelectedOwnerData(ownerData);
    setOwnerType(type);
    
    if (ownerId && ownerData) {
      await AsyncStorage.setItem(
        'superadmin_selected_owner',
        JSON.stringify({ ownerId, ownerData, ownerType: type })
      );
    } else {
      await AsyncStorage.removeItem('superadmin_selected_owner');
    }
  }, []);

  const clearOwner = useCallback(async () => {
    setSelectedOwnerId(null);
    setSelectedOwnerData(null);
    await AsyncStorage.removeItem('superadmin_selected_owner');
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    selectedOwnerId,
    selectedOwnerData,
    ownerType,
    selectOwner,
    clearOwner,
    hasOwnerSelected: !!selectedOwnerId,
  }), [selectedOwnerId, selectedOwnerData, ownerType, selectOwner, clearOwner]);

  return <OwnerContext.Provider value={value}>{children}</OwnerContext.Provider>;
};

