// API Configuration
// Use environment variable or default to localhost for development
// For React Native, you can use react-native-config or set this directly
// For Android emulator, use 10.0.2.2 instead of localhost
// For iOS simulator, use localhost or your machine's IP

import { Platform } from 'react-native';

// You can set this via environment variable or change directly here
const getApiBaseUrl = () => {
  // For Android emulator, use 10.0.2.2
  // For iOS simulator, use localhost
  // For physical device, use your machine's IP (e.g., 'http://192.168.1.100:5000/api')
  
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access localhost
    return 'http://10.0.2.2:5000/api';
  } else {
    // iOS simulator can use localhost
    return 'http://localhost:5000/api';
  }
};

const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;

