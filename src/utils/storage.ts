// API-based storage utility functions for Atharvnarayana
// All data operations now go through the backend API
// Only JWT token is stored in AsyncStorage

import { cattleFeedAPI, milkTruckAPI, usersAPI, suppliersAPI, cattleFeedTruckAPI, removeToken } from './api';

// ==================== CATTLE FEED SYSTEM ====================

// Cattle Feed Inventory functions
export const getCattleFeedInventory = async (ownerId: string | null = null) => {
  try {
    const response = await cattleFeedAPI.getInventory(ownerId);
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return [];
  }
};

export const setCattleFeedInventory = async (inventory: any) => {
  console.warn('setCattleFeedInventory is deprecated. Use create/update/delete functions instead.');
  return inventory;
};

export const addCattleFeedInventory = async (item: any) => {
  try {
    const response = await cattleFeedAPI.createInventory(item);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating inventory item:', error);
    throw error;
  }
};

export const updateCattleFeedInventory = async (id: string, updates: any) => {
  try {
    const response = await cattleFeedAPI.updateInventory(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
};

export const deleteCattleFeedInventory = async (id: string) => {
  try {
    const response = await cattleFeedAPI.deleteInventory(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
};

export const getCattleFeedInventoryItem = async (id: string) => {
  try {
    const response = await cattleFeedAPI.getInventoryItem(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return null;
  }
};

// Cattle Feed Sales functions
export const getCattleFeedSales = async (ownerId: string | null = null) => {
  try {
    const response = await cattleFeedAPI.getSales(ownerId);
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching sales:', error);
    return [];
  }
};

export const setCattleFeedSales = async (sales: any) => {
  console.warn('setCattleFeedSales is deprecated. Use create/update/delete functions instead.');
  return sales;
};

export const addCattleFeedSale = async (sale: any) => {
  try {
    const response = await cattleFeedAPI.createSale(sale);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating sale:', error);
    throw error;
  }
};

export const updateCattleFeedSale = async (id: string, updates: any) => {
  try {
    const response = await cattleFeedAPI.updateSale(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating sale:', error);
    throw error;
  }
};

export const deleteCattleFeedSale = async (id: string) => {
  try {
    const response = await cattleFeedAPI.deleteSale(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting sale:', error);
    throw error;
  }
};

export const getCattleFeedSale = async (id: string) => {
  try {
    const response = await cattleFeedAPI.getSale(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching sale:', error);
    return null;
  }
};

// Cattle Feed Customers functions
export const getCattleFeedCustomers = async (ownerId: string | null = null) => {
  try {
    const response = await cattleFeedAPI.getCustomers(ownerId);
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
};

export const setCattleFeedCustomers = async (customers: any) => {
  console.warn('setCattleFeedCustomers is deprecated. Use create/update/delete functions instead.');
  return customers;
};

export const addCattleFeedCustomer = async (customer: any) => {
  try {
    const response = await cattleFeedAPI.createCustomer(customer);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

export const updateCattleFeedCustomer = async (id: string, updates: any) => {
  try {
    const response = await cattleFeedAPI.updateCustomer(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

export const deleteCattleFeedCustomer = async (id: string) => {
  try {
    const response = await cattleFeedAPI.deleteCustomer(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
};

export const getCattleFeedCustomer = async (id: string) => {
  try {
    const response = await cattleFeedAPI.getCustomer(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching customer:', error);
    return null;
  }
};

export const getCattleFeedCustomerByPhone = async (phone: string) => {
  try {
    const response = await cattleFeedAPI.getCustomerByPhone(phone);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching customer by phone:', error);
    return null;
  }
};

export const getCattleFeedCustomerPurchases = async (phone: string) => {
  try {
    const response = await cattleFeedAPI.getCustomerPurchases(phone);
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching customer purchases:', error);
    return [];
  }
};

export const updateCattleFeedCustomerFromSale = async (sale: any) => {
  console.warn('updateCattleFeedCustomerFromSale is deprecated. Customer is updated automatically on sale creation.');
  return null;
};

// Cattle Feed Orders functions
export const getCattleFeedOrders = async (params: any = {}) => {
  try {
    const response = await cattleFeedAPI.getOrders(params);
    return response.success ? response.orders : [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
};

export const updateCattleFeedOrderStatus = async (id: string, status: string, notes: string) => {
  try {
    const response = await cattleFeedAPI.updateOrderStatus(id, status, notes);
    return response.success ? response.order : null;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

export const updateCattleFeedOrderPayment = async (id: string, updates: any) => {
  try {
    const response = await cattleFeedAPI.updateOrderPayment(id, updates);
    return response.success ? response.order : null;
  } catch (error) {
    console.error('Error updating order payment:', error);
    throw error;
  }
};

export const deleteCattleFeedOrder = async (id: string) => {
  try {
    const response = await cattleFeedAPI.deleteOrder(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
};

// ==================== SUPPLIERS & PURCHASE ORDERS ====================

// Suppliers
export const getSuppliers = async (ownerId: string | null = null) => {
  try {
    const response = await suppliersAPI.getSuppliers(ownerId);
    return response.success ? response.suppliers : [];
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }
};

export const addSupplier = async (supplier: any) => {
  try {
    const response = await suppliersAPI.createSupplier(supplier);
    return response.success ? response.supplier : null;
  } catch (error) {
    console.error('Error creating supplier:', error);
    throw error;
  }
};

export const updateSupplier = async (id: string, updates: any) => {
  try {
    const response = await suppliersAPI.updateSupplier(id, updates);
    return response.success ? response.supplier : null;
  } catch (error) {
    console.error('Error updating supplier:', error);
    throw error;
  }
};

export const deleteSupplier = async (id: string) => {
  try {
    const response = await suppliersAPI.deleteSupplier(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting supplier:', error);
    throw error;
  }
};

// Purchase Orders
export const getPurchaseOrders = async (ownerId: string | null = null) => {
  try {
    const response = await suppliersAPI.getPurchaseOrders(ownerId);
    return response.success ? response.orders : [];
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return [];
  }
};

export const addPurchaseOrder = async (order: any) => {
  try {
    const response = await suppliersAPI.createPurchaseOrder(order);
    return response.success ? response.order : null;
  } catch (error) {
    console.error('Error creating purchase order:', error);
    throw error;
  }
};

export const updatePurchaseOrder = async (id: string, updates: any) => {
  try {
    const response = await suppliersAPI.updatePurchaseOrder(id, updates);
    return response.success ? response.order : null;
  } catch (error) {
    console.error('Error updating purchase order:', error);
    throw error;
  }
};

// Cattle Feed Sellers/Owners functions (now using Users API)
export const getCattleFeedSellers = async (ownerId: string | null = null) => {
  try {
    const response = await usersAPI.getUsers({ role: 'cattleFeedSeller', systemType: 'cattleFeed' }, ownerId);
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return [];
  }
};

export const setCattleFeedSellers = async (sellers: any) => {
  console.warn('setCattleFeedSellers is deprecated. Use create/update/delete functions instead.');
  return sellers;
};

export const addCattleFeedSeller = async (seller: any) => {
  try {
    const sellerData = {
      ...seller,
      role: 'cattleFeedSeller',
      systemType: 'cattleFeed',
    };
    const response = await usersAPI.createUser(sellerData);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating seller:', error);
    throw error;
  }
};

export const updateCattleFeedSeller = async (id: string, updates: any) => {
  try {
    const response = await usersAPI.updateUser(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating seller:', error);
    throw error;
  }
};

export const deleteCattleFeedSeller = async (id: string) => {
  try {
    const response = await usersAPI.deleteUser(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting seller:', error);
    throw error;
  }
};

export const getCattleFeedSeller = async (id: string) => {
  try {
    const response = await usersAPI.getUser(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching seller:', error);
    return null;
  }
};

export const getCattleFeedSellerByUsername = async (username: string) => {
  try {
    const sellers = await getCattleFeedSellers();
    return sellers.find((seller: any) => seller.username === username) || null;
  } catch (error) {
    console.error('Error fetching seller by username:', error);
    return null;
  }
};

export const getCattleFeedSellerByPhone = async (phoneNumber: string) => {
  try {
    const response = await usersAPI.getUserByPhone(phoneNumber);
    if (response.success && response.data.role === 'cattleFeedSeller') {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching seller by phone:', error);
    return null;
  }
};

// Cattle Feed Owners functions
export const getCattleFeedOwners = async () => {
  try {
    const response = await usersAPI.getUsers({ role: 'cattleFeedOwner', systemType: 'cattleFeed' });
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching cattle feed owners:', error);
    return [];
  }
};

export const setCattleFeedOwners = async (owners: any) => {
  console.warn('setCattleFeedOwners is deprecated. Use create/update/delete functions instead.');
  return owners;
};

export const getPendingCattleFeedOwners = async () => {
  try {
    const response = await usersAPI.getUsers({
      role: 'cattleFeedOwner',
      systemType: 'cattleFeed',
      onboardingStatus: 'pending',
      isActive: 'false'
    });
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching pending cattle feed owners:', error);
    return [];
  }
};

export const approveCattleFeedOwner = async (id: string, updates: any = {}) => {
  try {
    const response = await usersAPI.updateUser(id, {
      isActive: true,
      onboardingStatus: 'approved',
      ...updates
    });
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error approving cattle feed owner:', error);
    throw error;
  }
};

export const addCattleFeedOwner = async (owner: any) => {
  try {
    const ownerData = {
      ...owner,
      role: 'cattleFeedOwner',
      systemType: 'cattleFeed',
    };
    const response = await usersAPI.createUser(ownerData);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating cattle feed owner:', error);
    throw error;
  }
};

export const updateCattleFeedOwner = async (id: string, updates: any) => {
  try {
    const response = await usersAPI.updateUser(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating cattle feed owner:', error);
    throw error;
  }
};

export const deleteCattleFeedOwner = async (id: string) => {
  try {
    const response = await usersAPI.deleteUser(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting cattle feed owner:', error);
    throw error;
  }
};

export const getCattleFeedOwner = async (id: string) => {
  try {
    const response = await usersAPI.getUser(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching cattle feed owner:', error);
    return null;
  }
};

export const getCattleFeedOwnerByUsername = async (username: string) => {
  try {
    const owners = await getCattleFeedOwners();
    return owners.find((owner: any) => owner.username === username) || null;
  } catch (error) {
    console.error('Error fetching owner by username:', error);
    return null;
  }
};

export const getCattleFeedOwnerByPhone = async (phoneNumber: string) => {
  try {
    const response = await usersAPI.getUserByPhone(phoneNumber);
    if (response.success && response.data.role === 'cattleFeedOwner') {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching owner by phone:', error);
    return null;
  }
};

// ==================== MILK TRUCK SYSTEM ====================

// Milk Truck Owners functions
export const getMilkTruckOwners = async () => {
  try {
    const response = await usersAPI.getUsers({ role: 'milkTruckOwner', systemType: 'milkTruck' });
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching milk truck owners:', error);
    return [];
  }
};

export const setMilkTruckOwners = async (owners: any) => {
  console.warn('setMilkTruckOwners is deprecated. Use create/update/delete functions instead.');
  return owners;
};

export const getPendingMilkTruckOwners = async () => {
  try {
    const response = await usersAPI.getUsers({
      role: 'milkTruckOwner',
      systemType: 'milkTruck',
      onboardingStatus: 'pending',
      isActive: 'false'
    });
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching pending milk truck owners:', error);
    return [];
  }
};

export const approveMilkTruckOwner = async (id: string, updates: any = {}) => {
  try {
    const response = await usersAPI.updateUser(id, {
      isActive: true,
      onboardingStatus: 'approved',
      ...updates
    });
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error approving milk truck owner:', error);
    throw error;
  }
};

export const addMilkTruckOwner = async (owner: any) => {
  try {
    const ownerData = {
      ...owner,
      role: 'milkTruckOwner',
      systemType: 'milkTruck',
    };
    const response = await usersAPI.createUser(ownerData);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating milk truck owner:', error);
    throw error;
  }
};

export const updateMilkTruckOwner = async (id: string, updates: any) => {
  try {
    const response = await usersAPI.updateUser(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating milk truck owner:', error);
    throw error;
  }
};

export const deleteMilkTruckOwner = async (id: string) => {
  try {
    const response = await usersAPI.deleteUser(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting milk truck owner:', error);
    throw error;
  }
};

export const getMilkTruckOwner = async (id: string) => {
  try {
    const response = await usersAPI.getUser(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching milk truck owner:', error);
    return null;
  }
};

export const getMilkTruckOwnerByPhone = async (phoneNumber: string) => {
  try {
    const response = await usersAPI.getUserByPhone(phoneNumber);
    if (response.success && response.data.role === 'milkTruckOwner') {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching milk truck owner by phone:', error);
    return null;
  }
};

// Milk Truck Drivers functions
export const getMilkTruckDrivers = async (ownerId: string | null = null) => {
  try {
    const response = await usersAPI.getUsers({ role: 'milkTruckDriver', systemType: 'milkTruck' }, ownerId);
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching milk truck drivers:', error);
    return [];
  }
};

export const setMilkTruckDrivers = async (drivers: any) => {
  console.warn('setMilkTruckDrivers is deprecated. Use create/update/delete functions instead.');
  return drivers;
};

export const addMilkTruckDriver = async (driver: any) => {
  try {
    const driverData = {
      ...driver,
      role: 'milkTruckDriver',
      systemType: 'milkTruck',
      isActive: true,
    };
    const response = await usersAPI.createUser(driverData);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating milk truck driver:', error);
    throw error;
  }
};

export const updateMilkTruckDriver = async (id: string, updates: any) => {
  try {
    const response = await usersAPI.updateUser(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating milk truck driver:', error);
    throw error;
  }
};

export const deleteMilkTruckDriver = async (id: string) => {
  try {
    const response = await usersAPI.deleteUser(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting milk truck driver:', error);
    throw error;
  }
};

export const getMilkTruckDriver = async (id: string) => {
  try {
    const response = await usersAPI.getUser(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching milk truck driver:', error);
    return null;
  }
};

export const getMilkTruckDriverByPhone = async (phoneNumber: string) => {
  try {
    const response = await usersAPI.getUserByPhone(phoneNumber);
    if (response.success && response.data.role === 'milkTruckDriver') {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching milk truck driver by phone:', error);
    return null;
  }
};

// Milk Truck BMCs functions
export const getMilkTruckBMCs = async (ownerId: string | null = null) => {
  try {
    const response = await milkTruckAPI.getBMCs(ownerId);
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching BMCs:', error);
    return [];
  }
};

export const setMilkTruckBMCs = async (bmcs: any) => {
  console.warn('setMilkTruckBMCs is deprecated. Use create/update/delete functions instead.');
  return bmcs;
};

export const addMilkTruckBMC = async (bmc: any) => {
  try {
    const response = await milkTruckAPI.createBMC(bmc);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating BMC:', error);
    throw error;
  }
};

export const updateMilkTruckBMC = async (id: string, updates: any) => {
  try {
    const response = await milkTruckAPI.updateBMC(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating BMC:', error);
    throw error;
  }
};

export const deleteMilkTruckBMC = async (id: string) => {
  try {
    const response = await milkTruckAPI.deleteBMC(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting BMC:', error);
    throw error;
  }
};

export const getMilkTruckBMC = async (id: string) => {
  try {
    const response = await milkTruckAPI.getBMC(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching BMC:', error);
    return null;
  }
};

export const getMilkTruckBMCHistory = async (id: string) => {
  try {
    const response = await milkTruckAPI.getBMCHistory(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching BMC history:', error);
    return null;
  }
};

// Milk Truck Vehicles functions
export const getMilkTruckVehicles = async (ownerId: string | null = null) => {
  try {
    const response = await milkTruckAPI.getVehicles(ownerId);
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return [];
  }
};

export const setMilkTruckVehicles = async (vehicles: any) => {
  console.warn('setMilkTruckVehicles is deprecated. Use create/update/delete functions instead.');
  return vehicles;
};

export const addMilkTruckVehicle = async (vehicle: any) => {
  try {
    const response = await milkTruckAPI.createVehicle(vehicle);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating vehicle:', error);
    throw error;
  }
};

export const updateMilkTruckVehicle = async (id: string, updates: any) => {
  try {
    const response = await milkTruckAPI.updateVehicle(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
};

export const deleteMilkTruckVehicle = async (id: string) => {
  try {
    const response = await milkTruckAPI.deleteVehicle(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
};

export const getMilkTruckVehicle = async (id: string) => {
  try {
    const response = await milkTruckAPI.getVehicle(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return null;
  }
};

// Milk Truck Routes functions
export const getMilkTruckRoutes = async (ownerId: string | null = null) => {
  try {
    const response = await milkTruckAPI.getRoutes(ownerId);
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching routes:', error);
    return [];
  }
};

export const setMilkTruckRoutes = async (routes: any) => {
  console.warn('setMilkTruckRoutes is deprecated. Use create/update/delete functions instead.');
  return routes;
};

export const addMilkTruckRoute = async (route: any) => {
  try {
    const response = await milkTruckAPI.createRoute(route);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating route:', error);
    throw error;
  }
};

export const updateMilkTruckRoute = async (id: string, updates: any) => {
  try {
    const response = await milkTruckAPI.updateRoute(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating route:', error);
    throw error;
  }
};

export const deleteMilkTruckRoute = async (id: string) => {
  try {
    const response = await milkTruckAPI.deleteRoute(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting route:', error);
    throw error;
  }
};

export const getMilkTruckRoute = async (id: string) => {
  try {
    const response = await milkTruckAPI.getRoute(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
};

// Milk Truck Trips functions
export const getMilkTruckTrips = async (ownerId: string | null = null) => {
  try {
    const response = await milkTruckAPI.getTrips(ownerId);
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching trips:', error);
    return [];
  }
};

export const setMilkTruckTrips = async (trips: any) => {
  console.warn('setMilkTruckTrips is deprecated. Use create/update/delete functions instead.');
  return trips;
};

export const addMilkTruckTrip = async (trip: any) => {
  try {
    const response = await milkTruckAPI.createTrip(trip);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating trip:', error);
    throw error;
  }
};

export const updateMilkTruckTrip = async (id: string, updates: any) => {
  try {
    const response = await milkTruckAPI.updateTrip(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating trip:', error);
    throw error;
  }
};

export const deleteMilkTruckTrip = async (id: string) => {
  try {
    const response = await milkTruckAPI.deleteTrip(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting trip:', error);
    throw error;
  }
};

export const addBMCCollectionEntry = async (tripId: string, data: any) => {
  try {
    const response = await milkTruckAPI.addBMCEntry(tripId, data);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error adding BMC entry:', error);
    throw error;
  }
};

export const getMilkTruckTrip = async (id: string) => {
  if (!id || typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return null;
  }

  try {
    const response = await milkTruckAPI.getTrip(id);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error fetching trip:', error);
    return null;
  }
};

// Milk Truck Pricing functions
export const getMilkTruckPricing = async () => {
  try {
    const response = await milkTruckAPI.getPricing();
    return response.success ? response.data : {};
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return {};
  }
};

export const setMilkTruckPricing = async (pricing: any) => {
  try {
    const response = await milkTruckAPI.updatePricing(pricing);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating pricing:', error);
    throw error;
  }
};

// ==================== CATTLE FEED TRUCK OWNER FUNCTIONS ====================

export const getCattleFeedTruckOwners = async () => {
  try {
    const response = await usersAPI.getUsers({ role: 'cattleFeedTruckOwner', systemType: 'cattleFeedTruck' });
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching cattle feed truck owners:', error);
    return [];
  }
};

export const getPendingCattleFeedTruckOwners = async () => {
  try {
    const response = await usersAPI.getUsers({
      role: 'cattleFeedTruckOwner',
      systemType: 'cattleFeedTruck',
      onboardingStatus: 'pending',
      isActive: 'false'
    });
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching pending cattle feed truck owners:', error);
    return [];
  }
};

export const approveCattleFeedTruckOwner = async (id: string, updates: any = {}) => {
  try {
    const response = await usersAPI.updateUser(id, {
      isActive: true,
      onboardingStatus: 'approved',
      ...updates
    });
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error approving cattle feed truck owner:', error);
    throw error;
  }
};

export const addCattleFeedTruckOwner = async (ownerData: any) => {
  try {
    const response = await usersAPI.createUser({
      ...ownerData,
      role: 'cattleFeedTruckOwner',
      systemType: 'cattleFeedTruck'
    });
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating cattle feed truck owner:', error);
    throw error;
  }
};

export const updateCattleFeedTruckOwner = async (id: string, updates: any) => {
  try {
    const response = await usersAPI.updateUser(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating cattle feed truck owner:', error);
    throw error;
  }
};

export const deleteCattleFeedTruckOwner = async (id: string) => {
  try {
    const response = await usersAPI.deleteUser(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting cattle feed truck owner:', error);
    throw error;
  }
};

// ==================== CATTLE FEED TRUCK SYSTEM ====================

// Warehouses
export const getCattleFeedTruckWarehouses = async (ownerId: string | null = null) => {
  try {
    const response = await cattleFeedTruckAPI.getWarehouses(ownerId);
    return response.success ? response.data : (Array.isArray(response) ? response : []);
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    return [];
  }
};

export const getCattleFeedTruckWarehouse = async (id: string) => {
  try {
    const response = await cattleFeedTruckAPI.getWarehouse(id);
    return response.success ? response.data : (response || null);
  } catch (error) {
    console.error('Error fetching warehouse:', error);
    return null;
  }
};

export const addCattleFeedTruckWarehouse = async (warehouse: any) => {
  try {
    const response = await cattleFeedTruckAPI.createWarehouse(warehouse);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating warehouse:', error);
    throw error;
  }
};

export const updateCattleFeedTruckWarehouse = async (id: string, updates: any) => {
  try {
    const response = await cattleFeedTruckAPI.updateWarehouse(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating warehouse:', error);
    throw error;
  }
};

export const deleteCattleFeedTruckWarehouse = async (id: string) => {
  try {
    const response = await cattleFeedTruckAPI.deleteWarehouse(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting warehouse:', error);
    throw error;
  }
};

// Vehicles
export const getCattleFeedTruckVehicles = async (ownerId: string | null = null) => {
  try {
    const response = await cattleFeedTruckAPI.getVehicles(ownerId);
    return response.success ? response.data : (Array.isArray(response) ? response : []);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return [];
  }
};

export const getCattleFeedTruckVehicle = async (id: string) => {
  try {
    const response = await cattleFeedTruckAPI.getVehicle(id);
    return response.success ? response.data : (response || null);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return null;
  }
};

export const addCattleFeedTruckVehicle = async (vehicle: any) => {
  try {
    const response = await cattleFeedTruckAPI.createVehicle(vehicle);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating vehicle:', error);
    throw error;
  }
};

export const updateCattleFeedTruckVehicle = async (id: string, updates: any) => {
  try {
    const response = await cattleFeedTruckAPI.updateVehicle(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
};

export const deleteCattleFeedTruckVehicle = async (id: string) => {
  try {
    const response = await cattleFeedTruckAPI.deleteVehicle(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
};

// Delivery Points
export const getCattleFeedTruckDeliveryPoints = async (ownerId: string | null = null) => {
  try {
    const response = await cattleFeedTruckAPI.getDeliveryPoints(ownerId);
    return response.success ? response.data : (Array.isArray(response) ? response : []);
  } catch (error) {
    console.error('Error fetching delivery points:', error);
    return [];
  }
};

export const getCattleFeedTruckDeliveryPoint = async (id: string) => {
  try {
    const response = await cattleFeedTruckAPI.getDeliveryPoint(id);
    return response.success ? response.data : (response || null);
  } catch (error) {
    console.error('Error fetching delivery point:', error);
    return null;
  }
};

export const addCattleFeedTruckDeliveryPoint = async (deliveryPoint: any) => {
  try {
    const response = await cattleFeedTruckAPI.createDeliveryPoint(deliveryPoint);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating delivery point:', error);
    throw error;
  }
};

export const updateCattleFeedTruckDeliveryPoint = async (id: string, updates: any) => {
  try {
    const response = await cattleFeedTruckAPI.updateDeliveryPoint(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating delivery point:', error);
    throw error;
  }
};

export const deleteCattleFeedTruckDeliveryPoint = async (id: string) => {
  try {
    const response = await cattleFeedTruckAPI.deleteDeliveryPoint(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting delivery point:', error);
    throw error;
  }
};

// Routes
export const getCattleFeedTruckRoutes = async (ownerId: string | null = null) => {
  try {
    const response = await cattleFeedTruckAPI.getRoutes(ownerId);
    return response.success ? response.data : (Array.isArray(response) ? response : []);
  } catch (error) {
    console.error('Error fetching routes:', error);
    return [];
  }
};

export const getCattleFeedTruckRoute = async (id: string) => {
  try {
    const response = await cattleFeedTruckAPI.getRoute(id);
    return response.success ? response.data : (response || null);
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
};

export const addCattleFeedTruckRoute = async (route: any) => {
  try {
    const response = await cattleFeedTruckAPI.createRoute(route);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating route:', error);
    throw error;
  }
};

export const updateCattleFeedTruckRoute = async (id: string, updates: any) => {
  try {
    const response = await cattleFeedTruckAPI.updateRoute(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating route:', error);
    throw error;
  }
};

export const deleteCattleFeedTruckRoute = async (id: string) => {
  try {
    const response = await cattleFeedTruckAPI.deleteRoute(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting route:', error);
    throw error;
  }
};

// Drivers
export const getCattleFeedTruckDrivers = async (ownerId: string | null = null) => {
  try {
    const response = await cattleFeedTruckAPI.getDrivers(ownerId);
    return response.success ? response.data : (Array.isArray(response) ? response : []);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return [];
  }
};

export const getCattleFeedTruckDriver = async (id: string) => {
  try {
    const response = await cattleFeedTruckAPI.getDriver(id);
    return response.success ? response.data : (response || null);
  } catch (error) {
    console.error('Error fetching driver:', error);
    return null;
  }
};

export const addCattleFeedTruckDriver = async (driver: any) => {
  try {
    const response = await cattleFeedTruckAPI.createDriver(driver);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating driver:', error);
    throw error;
  }
};

export const updateCattleFeedTruckDriver = async (id: string, updates: any) => {
  try {
    const response = await cattleFeedTruckAPI.updateDriver(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating driver:', error);
    throw error;
  }
};

export const deleteCattleFeedTruckDriver = async (id: string) => {
  try {
    const response = await cattleFeedTruckAPI.deleteDriver(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting driver:', error);
    throw error;
  }
};

// Feed Products
export const getCattleFeedFeedProducts = async (ownerId: string | null = null) => {
  try {
    const response = await cattleFeedTruckAPI.getFeedProducts(ownerId);
    return response.success ? response.data : (Array.isArray(response) ? response : []);
  } catch (error) {
    console.error('Error fetching feed products:', error);
    return [];
  }
};

export const getCattleFeedFeedProduct = async (id: string) => {
  try {
    const response = await cattleFeedTruckAPI.getFeedProduct(id);
    return response.success ? response.data : (response || null);
  } catch (error) {
    console.error('Error fetching feed product:', error);
    return null;
  }
};

export const addCattleFeedFeedProduct = async (product: any) => {
  try {
    const response = await cattleFeedTruckAPI.createFeedProduct(product);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating feed product:', error);
    throw error;
  }
};

export const updateCattleFeedFeedProduct = async (id: string, updates: any) => {
  try {
    const response = await cattleFeedTruckAPI.updateFeedProduct(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating feed product:', error);
    throw error;
  }
};

export const deleteCattleFeedFeedProduct = async (id: string) => {
  try {
    const response = await cattleFeedTruckAPI.deleteFeedProduct(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting feed product:', error);
    throw error;
  }
};

// Trips
export const getCattleFeedTruckTrips = async (ownerId: string | null = null) => {
  try {
    const response = await cattleFeedTruckAPI.getTrips(ownerId);
    return response.success ? response.data : (Array.isArray(response) ? response : []);
  } catch (error) {
    console.error('Error fetching trips:', error);
    return [];
  }
};

export const getCattleFeedTruckTrip = async (id: string) => {
  try {
    const response = await cattleFeedTruckAPI.getTrip(id);
    return response.success ? response.data : (response || null);
  } catch (error) {
    console.error('Error fetching trip:', error);
    return null;
  }
};

export const addCattleFeedTruckTrip = async (trip: any) => {
  try {
    const response = await cattleFeedTruckAPI.createTrip(trip);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error creating trip:', error);
    throw error;
  }
};

export const updateCattleFeedTruckTrip = async (id: string, updates: any) => {
  try {
    const response = await cattleFeedTruckAPI.updateTrip(id, updates);
    return response.success ? response.data : null;
  } catch (error) {
    console.error('Error updating trip:', error);
    throw error;
  }
};

export const deleteCattleFeedTruckTrip = async (id: string) => {
  try {
    const response = await cattleFeedTruckAPI.deleteTrip(id);
    return response.success;
  } catch (error) {
    console.error('Error deleting trip:', error);
    throw error;
  }
};

// ==================== USER FUNCTIONS ====================

// Current user functions (now using JWT token)
export const getCurrentUser = () => {
  return null;
};

export const setCurrentUser = (user: any) => {
  console.warn('setCurrentUser is deprecated. User data comes from JWT token.');
};

export const clearCurrentUser = async () => {
  await removeToken();
};

// ==================== INITIALIZATION ====================

export const initializeStorage = async (initialData: any) => {
  console.warn('initializeStorage is deprecated. Data comes from backend API.');
  return true;
};

