// Multi-language support for Atharvnarayana Main App (Super Admin, Owners, Drivers, Sellers)
import AsyncStorage from '@react-native-async-storage/async-storage';

export const translations = {
  en: {
    // Navigation & Common
    nav: {
      dashboard: 'Dashboard',
      logout: 'Logout',
      profile: 'Profile',
      settings: 'Settings',
    },

    // Super Admin
    superAdmin: {
      title: 'Super Admin Dashboard',
      cattleFeedOwners: 'Retail Shop Owners',
      milkTruckOwners: 'Milk Truck Owners',
      ownerManagement: 'Owner Management',
      systemStats: 'System Statistics',
      addOwner: 'Add New Owner',
      editOwner: 'Edit Owner',
      deleteOwner: 'Delete Owner',
      totalOwners: 'Total Owners',
      activeOwners: 'Active Owners',
    },

    // Cattle Feed
    cattleFeed: {
      dashboard: 'Dashboard',
      inventory: 'Inventory Management',
      sales: 'Sales Management',
      suppliers: 'Supplier Management',
      customers: 'Customer Management',
      finance: 'Finance Management',
      orders: 'Customer Orders',
      sellers: 'Seller Management',
      addInventory: 'Add Inventory',
      addSale: 'Add Sale',
      addCustomer: 'Add Customer',
      addSeller: 'Add Seller',
      productName: 'Product Name',
      category: 'Category',
      quantity: 'Quantity',
      unit: 'Unit',
      wholesalePrice: 'Wholesale Price',
      retailPrice: 'Retail Price',
      supplier: 'Supplier',
      expiryDate: 'Expiry Date',
      batchNumber: 'Batch Number',
      totalItems: 'Total Items',
      totalValue: 'Total Value',
      lowStock: 'Low Stock Items',
      totalSales: 'Total Sales',
      totalRevenue: 'Total Revenue',
    },

    // Milk Truck
    milkTruck: {
      dashboard: 'Dashboard',
      bmcManagement: 'BMC Management',
      vehicleManagement: 'Vehicle Management',
      driverManagement: 'Driver Management',
      routeManagement: 'Route Management',
      pricing: 'Pricing Management',
      reports: 'Reports',
      addBMC: 'Add BMC',
      addVehicle: 'Add Vehicle',
      addDriver: 'Add Driver',
      addRoute: 'Add Route',
      bmcName: 'BMC Name',
      location: 'Location',
      contact: 'Contact',
      registration: 'Registration Number',
      capacity: 'Capacity (Liters)',
      driverName: 'Driver Name',
      licenseNumber: 'License Number',
      phoneNumber: 'Phone Number',
      routeName: 'Route Name',
      assignedDriver: 'Assigned Driver',
      assignedVehicle: 'Assigned Vehicle',
      totalTrips: 'Total Trips',
      activeTrips: 'Active Trips',
      completedTrips: 'Completed Trips',
    },

    // Cattle Feed Truck
    cattleFeedTruck: {
      dashboard: 'Dashboard',
      warehouses: 'Warehouse Management',
      vehicles: 'Vehicle Management',
      deliveryPoints: 'Delivery Points',
      routes: 'Route Management',
      drivers: 'Driver Management',
      trips: 'Trip Management',
      feedProducts: 'Feed Products',
      addWarehouse: 'Add Warehouse',
      addVehicle: 'Add Vehicle',
      addDeliveryPoint: 'Add Delivery Point',
      addRoute: 'Add Route',
      addDriver: 'Add Driver',
      addProduct: 'Add Product',
      totalTrips: 'Total Trips',
      activeTrips: 'Active Trips',
      completedTrips: 'Completed Trips',
    },

    // Forms & Actions
    forms: {
      name: 'Name',
      phone: 'Phone Number',
      email: 'Email',
      password: 'Password',
      username: 'Username',
      address: 'Address',
      save: 'Save',
      cancel: 'Cancel',
      update: 'Update',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      submit: 'Submit',
      close: 'Close',
      confirm: 'Confirm',
      required: 'Required',
      optional: 'Optional',
    },

    // Messages
    messages: {
      success: 'Success!',
      error: 'Error',
      loading: 'Loading...',
      noData: 'No data found',
      confirmDelete: 'Are you sure you want to delete this?',
      saveSuccess: 'Saved successfully!',
      updateSuccess: 'Updated successfully!',
      deleteSuccess: 'Deleted successfully!',
      saveFailed: 'Failed to save',
      loadFailed: 'Failed to load data',
    },

    // Login
    login: {
      title: 'Login',
      welcome: 'Welcome',
      userLogin: 'User Login',
      superAdminLogin: 'Super Admin Login',
      loginAs: 'Login as',
      enterPhone: 'Enter phone number',
      enterPassword: 'Enter password',
      loginButton: 'Login',
      loggingIn: 'Logging in...',
    },
  },

  hi: {
    // Navigation & Common
    nav: {
      dashboard: 'डैशबोर्ड',
      logout: 'लॉगआउट',
      profile: 'प्रोफ़ाइल',
      settings: 'सेटिंग्स',
    },

    // Super Admin
    superAdmin: {
      title: 'सुपर एडमिन डैशबोर्ड',
      cattleFeedOwners: 'पशु आहार मालिक',
      milkTruckOwners: 'दूध ट्रक मालिक',
      ownerManagement: 'मालिक प्रबंधन',
      systemStats: 'सिस्टम आंकड़े',
      addOwner: 'नया मालिक जोड़ें',
      editOwner: 'मालिक संपादित करें',
      deleteOwner: 'मालिक हटाएं',
      totalOwners: 'कुल मालिक',
      activeOwners: 'सक्रिय मालिक',
    },

    // Cattle Feed
    cattleFeed: {
      dashboard: 'डैशबोर्ड',
      inventory: 'इन्वेंट्री प्रबंधन',
      sales: 'बिक्री प्रबंधन',
      customers: 'ग्राहक प्रबंधन',
      finance: 'वित्त प्रबंधन',
      orders: 'ग्राहक आदेश',
      sellers: 'विक्रेता प्रबंधन',
      addInventory: 'इन्वेंट्री जोड़ें',
      addSale: 'बिक्री जोड़ें',
      addCustomer: 'ग्राहक जोड़ें',
      addSeller: 'विक्रेता जोड़ें',
      productName: 'उत्पाद का नाम',
      category: 'श्रेणी',
      quantity: 'मात्रा',
      unit: 'इकाई',
      wholesalePrice: 'थोक मूल्य',
      retailPrice: 'खुदरा मूल्य',
      supplier: 'आपूर्तिकर्ता',
      expiryDate: 'समाप्ति तिथि',
      batchNumber: 'बैच नंबर',
      totalItems: 'कुल आइटम',
      totalValue: 'कुल मूल्य',
      lowStock: 'कम स्टॉक आइटम',
      totalSales: 'कुल बिक्री',
      totalRevenue: 'कुल राजस्व',
    },

    // Milk Truck
    milkTruck: {
      dashboard: 'डैशबोर्ड',
      bmcManagement: 'बीएमसी प्रबंधन',
      vehicleManagement: 'वाहन प्रबंधन',
      driverManagement: 'ड्राइवर प्रबंधन',
      routeManagement: 'मार्ग प्रबंधन',
      pricing: 'मूल्य निर्धारण',
      reports: 'रिपोर्ट',
      addBMC: 'बीएमसी जोड़ें',
      addVehicle: 'वाहन जोड़ें',
      addDriver: 'ड्राइवर जोड़ें',
      addRoute: 'मार्ग जोड़ें',
      bmcName: 'बीएमसी का नाम',
      location: 'स्थान',
      contact: 'संपर्क',
      registration: 'पंजीकरण संख्या',
      capacity: 'क्षमता (लीटर)',
      driverName: 'ड्राइवर का नाम',
      licenseNumber: 'लाइसेंस नंबर',
      phoneNumber: 'फ़ोन नंबर',
      routeName: 'मार्ग का नाम',
      assignedDriver: 'नियुक्त ड्राइवर',
      assignedVehicle: 'नियुक्त वाहन',
      totalTrips: 'कुल यात्राएं',
      activeTrips: 'सक्रिय यात्राएं',
      completedTrips: 'पूर्ण यात्राएं',
    },

    // Cattle Feed Truck
    cattleFeedTruck: {
      dashboard: 'डैशबोर्ड',
      warehouses: 'गोदाम प्रबंधन',
      vehicles: 'वाहन प्रबंधन',
      deliveryPoints: 'डिलीवरी पॉइंट',
      routes: 'मार्ग प्रबंधन',
      drivers: 'ड्राइवर प्रबंधन',
      trips: 'यात्रा प्रबंधन',
      feedProducts: 'चारा उत्पाद',
      addWarehouse: 'गोदाम जोड़ें',
      addVehicle: 'वाहन जोड़ें',
      addDeliveryPoint: 'डिलीवरी पॉइंट जोड़ें',
      addRoute: 'मार्ग जोड़ें',
      addDriver: 'ड्राइवर जोड़ें',
      addProduct: 'उत्पाद जोड़ें',
      totalTrips: 'कुल यात्राएं',
      activeTrips: 'सक्रिय यात्राएं',
      completedTrips: 'पूर्ण यात्राएं',
    },

    // Forms & Actions
    forms: {
      name: 'नाम',
      phone: 'फ़ोन नंबर',
      email: 'ईमेल',
      password: 'पासवर्ड',
      username: 'यूज़रनेम',
      address: 'पता',
      save: 'सहेजें',
      cancel: 'रद्द करें',
      update: 'अपडेट करें',
      delete: 'हटाएं',
      edit: 'संपादित करें',
      add: 'जोड़ें',
      search: 'खोजें',
      filter: 'फ़िल्टर',
      submit: 'जमा करें',
      close: 'बंद करें',
      confirm: 'पुष्टि करें',
      required: 'आवश्यक',
      optional: 'वैकल्पिक',
    },

    // Messages
    messages: {
      success: 'सफलता!',
      error: 'त्रुटि',
      loading: 'लोड हो रहा है...',
      noData: 'कोई डेटा नहीं मिला',
      confirmDelete: 'क्या आप वाकई इसे हटाना चाहते हैं?',
      saveSuccess: 'सफलतापूर्वक सहेजा गया!',
      updateSuccess: 'सफलतापूर्वक अपडेट किया गया!',
      deleteSuccess: 'सफलतापूर्वक हटाया गया!',
      saveFailed: 'सहेजने में विफल',
      loadFailed: 'डेटा लोड करने में विफल',
    },

    // Login
    login: {
      title: 'लॉगिन',
      welcome: 'स्वागत है',
      userLogin: 'यूजर लॉगिन',
      superAdminLogin: 'सुपर एडमिन लॉगिन',
      loginAs: 'लॉगिन करें',
      enterPhone: 'फ़ोन नंबर दर्ज करें',
      enterPassword: 'पासवर्ड दर्ज करें',
      loginButton: 'लॉगिन करें',
      loggingIn: 'लॉगिन हो रहा है...',
    },
  },
};

// Language management
let currentLanguage = 'en';

export const setLanguage = async (lang: string): Promise<void> => {
  currentLanguage = lang;
  try {
    await AsyncStorage.setItem('appLanguage', lang);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

export const getLanguage = async (): Promise<string> => {
  try {
    const lang = await AsyncStorage.getItem('appLanguage');
    return lang || 'en';
  } catch (error) {
    console.error('Error getting language:', error);
    return 'en';
  }
};

// Initialize language on module load
getLanguage().then(lang => {
  currentLanguage = lang;
});

export const t = (key: string): string => {
  if (!key || typeof key !== 'string') return key || '';

  const keys = key.split('.');
  let value: any = translations[currentLanguage as keyof typeof translations];

  for (const k of keys) {
    value = value?.[k];
  }

  return value || key;
};

export default { translations, setLanguage, getLanguage, t };

