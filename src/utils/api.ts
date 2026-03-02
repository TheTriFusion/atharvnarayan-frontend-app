// API utility functions for making requests to backend
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL, { BASE_URL } from '../config/api';

// Request cache to prevent duplicate calls
const pendingRequests = new Map();

// Get JWT token from AsyncStorage
const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('token');
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// Set JWT token in AsyncStorage
export const setToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('token', token);
  } catch (error) {
    console.error('Error setting token:', error);
  }
};

// Remove JWT token from AsyncStorage
export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('token');
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

// Generic API request function with request deduplication
const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = await getToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const isFormData = options.body instanceof FormData;

  // Create a unique key for this request
  const requestKey = `${options.method || 'GET'}:${url}:${isFormData ? 'formdata' : JSON.stringify(options.body || {})}`;

  // If there's a pending request with the same key, return it
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  const { headers: customHeaders, ...restOptions } = options;

  const config: RequestInit = {
    ...restOptions,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...customHeaders,
    },
  };

  if (!isFormData && config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  // Create the request promise
  const requestPromise = (async () => {
    try {
      const response = await fetch(url, config);

      // Handle network errors
      if (!response.ok && response.status === 0) {
        throw new Error('Network error: Unable to connect to server. Please check if the backend is running.');
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // If response is not JSON, create error message
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        // Don't clear token here - let auth flow (e.g. getCurrentUser on app load) handle expiry.
        // Clearing on every 401 was causing owners to get logged out when APIs returned 401.
        throw new Error(data.message || `Request failed: ${response.status} ${response.statusText}`);
      }

      return data;
    } catch (error: any) {
      // Handle network/fetch errors
      // React Native fetch throws TypeError with "Network request failed" message
      if (error.name === 'TypeError' && (
        error.message.includes('fetch') ||
        error.message.includes('Network request failed') ||
        error.message.includes('Failed to fetch')
      )) {
        console.error('Network Error: Backend server may not be running or CORS issue');
        throw new Error('Cannot connect to server. Please ensure the backend is running on api.thetrifusion.in');
      }
      console.error('API Error:', error);
      throw error;
    } finally {
      // Remove from pending requests after completion
      pendingRequests.delete(requestKey);
    }
  })();

  // Store the pending request
  pendingRequests.set(requestKey, requestPromise);

  return requestPromise;
};

/**
 * Converts a relative image path from the backend into a full URL.
 * Handles paths starting with or without /uploads.
 */
export const getImageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;

  // Ensure we don't have double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // If the path already includes /uploads, just prepend BASE_URL
  if (cleanPath.startsWith('/uploads')) {
    return `${BASE_URL}${cleanPath}`;
  }

  // Otherwise append /uploads and the path
  return `${BASE_URL}/uploads${cleanPath}`;
};

// Auth API
export const authAPI = {
  // Regular user login (owners, drivers, sellers)
  login: async (phoneNumber: string, password: string) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, password }),
    });
    if (response.success && response.token) {
      await setToken(response.token);
    }
    return response;
  },
  // Super admin login
  loginSuperAdmin: async (phoneNumber: string, password: string) => {
    const response = await apiRequest('/auth/login/superadmin', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, password }),
    });
    if (response.success && response.token) {
      await setToken(response.token);
    }
    return response;
  },
  register: async (userData: any) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  getCurrentUser: async () => {
    // Don't call if no token exists
    const token = await getToken();
    if (!token) {
      return { success: false, message: 'No token' };
    }
    return apiRequest('/auth/me');
  },
  logout: async () => {
    await removeToken();
  },
};

// Cattle Feed API
export const cattleFeedAPI = {
  // Inventory
  getInventory: (ownerId: string | null = null) => {
    const url = ownerId ? `/cattle-feed/inventory?ownerId=${ownerId}` : '/cattle-feed/inventory';
    return apiRequest(url);
  },
  getInventoryItem: (id: string) => apiRequest(`/cattle-feed/inventory/${id}`),
  createInventory: (data: any) => apiRequest('/cattle-feed/inventory', { method: 'POST', body: JSON.stringify(data) }),
  updateInventory: (id: string, data: any) => apiRequest(`/cattle-feed/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInventory: (id: string) => apiRequest(`/cattle-feed/inventory/${id}`, { method: 'DELETE' }),

  // Sales
  getSales: (ownerId: string | null = null) => {
    const url = ownerId ? `/cattle-feed/sales?ownerId=${ownerId}` : '/cattle-feed/sales';
    return apiRequest(url);
  },
  getSale: (id: string) => apiRequest(`/cattle-feed/sales/${id}`),
  createSale: (data: any) => apiRequest('/cattle-feed/sales', { method: 'POST', body: JSON.stringify(data) }),
  updateSale: (id: string, data: any) => apiRequest(`/cattle-feed/sales/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSale: (id: string) => apiRequest(`/cattle-feed/sales/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: (ownerId: string | null = null) => {
    const url = ownerId ? `/cattle-feed/customers?ownerId=${ownerId}` : '/cattle-feed/customers';
    return apiRequest(url);
  },
  getCustomer: (id: string) => apiRequest(`/cattle-feed/customers/${id}`),
  getCustomerByPhone: (phone: string) => apiRequest(`/cattle-feed/customers/phone/${phone}`),
  getCustomerPurchases: (phone: string) => apiRequest(`/cattle-feed/customers/phone/${phone}/purchases`),
  createCustomer: (data: any) => apiRequest('/cattle-feed/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) => apiRequest(`/cattle-feed/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => apiRequest(`/cattle-feed/customers/${id}`, { method: 'DELETE' }),
  // Customer Orders
  getOrders: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/customer-orders${queryString ? `?${queryString}` : ''}`);
  },
  getOrder: (id: string) => apiRequest(`/customer-orders/${id}`),
  updateOrderStatus: (id: string, status: string, notes: string) => apiRequest(`/customer-orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, notes })
  }),
  updateOrderPayment: (id: string, data: any) => apiRequest(`/customer-orders/${id}/payment`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteOrder: (id: string) => apiRequest(`/customer-orders/${id}`, { method: 'DELETE' }),
};

// Suppliers API
export const suppliersAPI = {
  // Suppliers
  getSuppliers: (ownerId: string | null = null) => {
    const url = ownerId ? `/suppliers?ownerId=${ownerId}` : '/suppliers';
    return apiRequest(url);
  },
  createSupplier: (data: any) => apiRequest('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: any) => apiRequest(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => apiRequest(`/suppliers/${id}`, { method: 'DELETE' }),

  // Purchase Orders
  getPurchaseOrders: (ownerId: string | null = null) => {
    const url = ownerId ? `/suppliers/purchase-orders?ownerId=${ownerId}` : '/suppliers/purchase-orders';
    return apiRequest(url);
  },
  createPurchaseOrder: (data: any) => apiRequest('/suppliers/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchaseOrder: (id: string, data: any) => apiRequest(`/suppliers/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Milk Truck API
export const milkTruckAPI = {
  // BMCs
  getBMCs: (ownerId: string | null = null) => {
    const url = ownerId ? `/milk-truck/bmcs?ownerId=${ownerId}` : '/milk-truck/bmcs';
    return apiRequest(url);
  },
  getBMC: (id: string) => apiRequest(`/milk-truck/bmcs/${id}`),
  createBMC: (data: any) => apiRequest('/milk-truck/bmcs', { method: 'POST', body: JSON.stringify(data) }),
  updateBMC: (id: string, data: any) => apiRequest(`/milk-truck/bmcs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBMC: (id: string) => apiRequest(`/milk-truck/bmcs/${id}`, { method: 'DELETE' }),
  getBMCHistory: (id: string) => apiRequest(`/milk-truck/bmcs/${id}/history`),

  // Vehicles
  getVehicles: (ownerId: string | null = null) => {
    const url = ownerId ? `/milk-truck/vehicles?ownerId=${ownerId}` : '/milk-truck/vehicles';
    return apiRequest(url);
  },
  getVehicle: (id: string) => apiRequest(`/milk-truck/vehicles/${id}`),
  createVehicle: (data: any) => apiRequest('/milk-truck/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  updateVehicle: (id: string, data: any) => apiRequest(`/milk-truck/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVehicle: (id: string) => apiRequest(`/milk-truck/vehicles/${id}`, { method: 'DELETE' }),

  // Routes
  getRoutes: (ownerId: string | null = null) => {
    const url = ownerId ? `/milk-truck/routes?ownerId=${ownerId}` : '/milk-truck/routes';
    return apiRequest(url);
  },
  getRoute: (id: string) => apiRequest(`/milk-truck/routes/${id}`),
  createRoute: (data: any) => apiRequest('/milk-truck/routes', { method: 'POST', body: JSON.stringify(data) }),
  updateRoute: (id: string, data: any) => apiRequest(`/milk-truck/routes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoute: (id: string) => apiRequest(`/milk-truck/routes/${id}`, { method: 'DELETE' }),

  // Trips
  getTrips: (ownerId: string | null = null) => {
    const url = ownerId ? `/milk-truck/trips?ownerId=${ownerId}` : '/milk-truck/trips';
    return apiRequest(url);
  },
  getTrip: (id: string) => apiRequest(`/milk-truck/trips/${id}`),
  sendTripLocation: (tripId: string, latitude: number, longitude: number) =>
    apiRequest(`/milk-truck/trips/${tripId}/location`, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    }),
  createTrip: (data: any) => apiRequest('/milk-truck/trips', { method: 'POST', body: JSON.stringify(data) }),
  updateTrip: (id: string, data: any) => apiRequest(`/milk-truck/trips/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTrip: (id: string) => apiRequest(`/milk-truck/trips/${id}`, { method: 'DELETE' }),
  addBMCEntry: (id: string, data: any) => apiRequest(`/milk-truck/trips/${id}/bmc-entry`, { method: 'POST', body: data }),
  getBMCEntry: (tripId: string, bmcId: string) => apiRequest(`/milk-truck/trips/${tripId}/bmc-entry/${bmcId}`),

  // Pricing
  getPricing: () => apiRequest('/milk-truck/pricing'),
  updatePricing: (data: any) => apiRequest('/milk-truck/pricing', { method: 'PUT', body: JSON.stringify(data) }),
};

// Users API
export const usersAPI = {
  getUsers: (params: any = {}, ownerId: string | null = null) => {
    const allParams = { ...params };
    if (ownerId) {
      allParams.ownerId = ownerId;
    }
    const queryString = new URLSearchParams(allParams).toString();
    return apiRequest(`/users${queryString ? `?${queryString}` : ''}`);
  },
  getUser: (id: string) => apiRequest(`/users/${id}`),
  getUserByPhone: (phoneNumber: string) => apiRequest(`/users/phone/${phoneNumber}`),
  createUser: (data: any) => apiRequest('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
};

// Cattle Feed Truck API
export const cattleFeedTruckAPI = {
  // Warehouses
  getWarehouses: (ownerId: string | null = null) => {
    const url = ownerId ? `/cattle-feed-truck/warehouses?ownerId=${ownerId}` : '/cattle-feed-truck/warehouses';
    return apiRequest(url);
  },
  getWarehouse: (id: string) => apiRequest(`/cattle-feed-truck/warehouses/${id}`),
  createWarehouse: (data: any) => apiRequest('/cattle-feed-truck/warehouses', { method: 'POST', body: data }),
  updateWarehouse: (id: string, data: any) => apiRequest(`/cattle-feed-truck/warehouses/${id}`, { method: 'PUT', body: data }),
  deleteWarehouse: (id: string) => apiRequest(`/cattle-feed-truck/warehouses/${id}`, { method: 'DELETE' }),

  // Vehicles
  getVehicles: (ownerId: string | null = null) => {
    const url = ownerId ? `/cattle-feed-truck/vehicles?ownerId=${ownerId}` : '/cattle-feed-truck/vehicles';
    return apiRequest(url);
  },
  getVehicle: (id: string) => apiRequest(`/cattle-feed-truck/vehicles/${id}`),
  createVehicle: (data: any) => apiRequest('/cattle-feed-truck/vehicles', { method: 'POST', body: data }),
  updateVehicle: (id: string, data: any) => apiRequest(`/cattle-feed-truck/vehicles/${id}`, { method: 'PUT', body: data }),
  deleteVehicle: (id: string) => apiRequest(`/cattle-feed-truck/vehicles/${id}`, { method: 'DELETE' }),

  // Delivery Points
  getDeliveryPoints: (ownerId: string | null = null) => {
    const url = ownerId ? `/cattle-feed-truck/delivery-points?ownerId=${ownerId}` : '/cattle-feed-truck/delivery-points';
    return apiRequest(url);
  },
  getDeliveryPoint: (id: string) => apiRequest(`/cattle-feed-truck/delivery-points/${id}`),
  createDeliveryPoint: (data: any) => apiRequest('/cattle-feed-truck/delivery-points', { method: 'POST', body: data }),
  updateDeliveryPoint: (id: string, data: any) => apiRequest(`/cattle-feed-truck/delivery-points/${id}`, { method: 'PUT', body: data }),
  deleteDeliveryPoint: (id: string) => apiRequest(`/cattle-feed-truck/delivery-points/${id}`, { method: 'DELETE' }),

  // Routes
  getRoutes: (ownerId: string | null = null) => {
    const url = ownerId ? `/cattle-feed-truck/routes?ownerId=${ownerId}` : '/cattle-feed-truck/routes';
    return apiRequest(url);
  },
  getRoute: (id: string) => apiRequest(`/cattle-feed-truck/routes/${id}`),
  createRoute: (data: any) => apiRequest('/cattle-feed-truck/routes', { method: 'POST', body: data }),
  updateRoute: (id: string, data: any) => apiRequest(`/cattle-feed-truck/routes/${id}`, { method: 'PUT', body: data }),
  deleteRoute: (id: string) => apiRequest(`/cattle-feed-truck/routes/${id}`, { method: 'DELETE' }),

  // Drivers
  getDrivers: (ownerId: string | null = null) => {
    const url = ownerId ? `/cattle-feed-truck/drivers?ownerId=${ownerId}` : '/cattle-feed-truck/drivers';
    return apiRequest(url);
  },
  getDriver: (id: string) => apiRequest(`/cattle-feed-truck/drivers/${id}`),
  createDriver: (data: any) => apiRequest('/cattle-feed-truck/drivers', { method: 'POST', body: data }),
  updateDriver: (id: string, data: any) => apiRequest(`/cattle-feed-truck/drivers/${id}`, { method: 'PUT', body: data }),
  deleteDriver: (id: string) => apiRequest(`/cattle-feed-truck/drivers/${id}`, { method: 'DELETE' }),

  // Feed Products
  getFeedProducts: (ownerId: string | null = null) => {
    const url = ownerId ? `/cattle-feed-truck/feed-products?ownerId=${ownerId}` : '/cattle-feed-truck/feed-products';
    return apiRequest(url);
  },
  getFeedProduct: (id: string) => apiRequest(`/cattle-feed-truck/feed-products/${id}`),
  createFeedProduct: (data: any) => apiRequest('/cattle-feed-truck/feed-products', { method: 'POST', body: data }),
  updateFeedProduct: (id: string, data: any) => apiRequest(`/cattle-feed-truck/feed-products/${id}`, { method: 'PUT', body: data }),
  deleteFeedProduct: (id: string) => apiRequest(`/cattle-feed-truck/feed-products/${id}`, { method: 'DELETE' }),

  // Trips
  getTrips: (ownerId: string | null = null) => {
    const url = ownerId ? `/cattle-feed-truck/trips?ownerId=${ownerId}` : '/cattle-feed-truck/trips';
    return apiRequest(url);
  },
  getTrip: (id: string) => apiRequest(`/cattle-feed-truck/trips/${id}`),
  createTrip: (data: any) => apiRequest('/cattle-feed-truck/trips', { method: 'POST', body: data }),
  updateTrip: (id: string, data: any) => apiRequest(`/cattle-feed-truck/trips/${id}`, { method: 'PUT', body: data }),
  deleteTrip: (id: string) => apiRequest(`/cattle-feed-truck/trips/${id}`, { method: 'DELETE' }),
  addDelivery: (tripId: string, data: any) => apiRequest(`/cattle-feed-truck/trips/${tripId}/deliveries`, { method: 'POST', body: data }),
  updateDelivery: (tripId: string, deliveryId: string, data: any) => apiRequest(`/cattle-feed-truck/trips/${tripId}/deliveries/${deliveryId}`, { method: 'PUT', body: data }),
  deleteDelivery: (tripId: string, deliveryId: string) => apiRequest(`/cattle-feed-truck/trips/${tripId}/deliveries/${deliveryId}`, { method: 'DELETE' }),
  sendTripLocation: (tripId: string, latitude: number, longitude: number) =>
    apiRequest(`/cattle-feed-truck/trips/${tripId}/location`, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    }),
};

// GPS Tracking API
export const gpsAPI = {
  getFleetStatus: () => apiRequest('/gps/fleet-status'),
  getActiveTrips: (ownerId?: string) => {
    const url = ownerId ? `/gps/active-trips?ownerId=${ownerId}` : '/gps/active-trips';
    return apiRequest(url);
  },
  getTripTracking: (tripId: string) => apiRequest(`/gps/trips/${tripId}/tracking`),
  updateTripLocation: (tripId: string, latitude: number, longitude: number) =>
    apiRequest(`/gps/trips/${tripId}/location`, {
      method: 'PUT',
      body: JSON.stringify({ latitude, longitude }),
    }),
  updateUserLocation: (latitude: number, longitude: number) =>
    apiRequest('/gps/user-location', {
      method: 'PUT',
      body: JSON.stringify({ latitude, longitude }),
    }),
  notifyArrival: (tripId: string, bmcId: string) =>
    apiRequest(`/gps/trips/${tripId}/notify-arrival`, {
      method: 'POST',
      body: JSON.stringify({ bmcId }),
    }),
};

