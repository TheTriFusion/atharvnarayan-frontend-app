// API Configuration
// Use environment variable or default to localhost for development
// For React Native, you can use react-native-config or set this directly
// For Android emulator, use 10.0.2.2 instead of localhost
// For iOS simulator, use localhost or your machine's IP

import { Platform } from 'react-native';

// You can set this via environment variable or change directly here
const getBaseUrl = () => {
  return 'https://api.thetrifusion.in';
};

const BASE_URL = getBaseUrl();
const API_BASE_URL = `${BASE_URL}/api`;

// Socket.io server (same host as API, no /api path; change when backend is ready)
const getSocketUrl = () => {
  const base = 'https://api.thetrifusion.in';
  return base;
};

export const SOCKET_URL = getSocketUrl();
export { BASE_URL };
export default API_BASE_URL;

