import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

// Auth Screens
import Login from '../screens/Auth/Login';
import OwnerRegistration from '../screens/Auth/OwnerRegistration';

// Super Admin Screens
import SuperAdminDashboard from '../screens/SuperAdmin/Dashboard';
import SuperAdminOwnerManagement from '../screens/SuperAdmin/OwnerManagement';

// Cattle Feed Owner Screens
import CattleFeedOwnerDashboard from '../screens/CattleFeed/Owner/Dashboard';
import CattleFeedOwnerInventoryManagement from '../screens/CattleFeed/Owner/InventoryManagement';
import CattleFeedOwnerSalesManagement from '../screens/CattleFeed/Owner/SalesManagement';
import CattleFeedOwnerSellerManagement from '../screens/CattleFeed/Owner/SellerManagement';
import SupplierManagement from '../screens/CattleFeed/Owner/SupplierManagement';
import CattleFeedOwnerCustomerManagement from '../screens/CattleFeed/Owner/CustomerManagement';
import CattleFeedOwnerOrderManagement from '../screens/CattleFeed/Owner/OrderManagement';
import CattleFeedOwnerFinanceManagement from '../screens/CattleFeed/Owner/FinanceManagement';

// Cattle Feed Seller Screens
import CattleFeedSellerSales from '../screens/CattleFeed/Seller/SellerSales';

// Milk Truck Owner Screens
import MilkTruckOwnerDashboard from '../screens/MilkTruck/Owner/Dashboard';
import MilkTruckOwnerBMCManagement from '../screens/MilkTruck/Owner/BMCManagement';
import MilkTruckOwnerVehicleManagement from '../screens/MilkTruck/Owner/VehicleManagement';
import MilkTruckOwnerDriverManagement from '../screens/MilkTruck/Owner/DriverManagement';
import MilkTruckOwnerDriverTrips from '../screens/MilkTruck/Owner/DriverTrips';
import MilkTruckOwnerRouteManagement from '../screens/MilkTruck/Owner/RouteManagement';
import MilkTruckOwnerPricingManagement from '../screens/MilkTruck/Owner/PricingManagement';
import MilkTruckOwnerReports from '../screens/MilkTruck/Owner/Reports';
import MilkTruckOwnerTripDetails from '../screens/MilkTruck/Owner/OwnerTripDetails';

// Milk Truck Driver Screens
import MilkTruckDriverDashboard from '../screens/MilkTruck/Driver/DriverDashboard';
import MilkTruckDriverTripPage from '../screens/MilkTruck/Driver/TripPage';
import MilkTruckDriverTripDetails from '../screens/MilkTruck/Driver/TripDetails';

// Cattle Feed Truck Owner Screens
import CattleFeedTruckOwnerDashboard from '../screens/CattleFeedTruck/Owner/Dashboard';
import WarehouseManagement from '../screens/CattleFeedTruck/Owner/WarehouseManagement';
import VehicleManagement from '../screens/CattleFeedTruck/Owner/VehicleManagement';
import DeliveryPointManagement from '../screens/CattleFeedTruck/Owner/DeliveryPointManagement';
import RouteManagement from '../screens/CattleFeedTruck/Owner/RouteManagement';
import DriverManagement from '../screens/CattleFeedTruck/Owner/DriverManagement';
import FeedProductManagement from '../screens/CattleFeedTruck/Owner/FeedProductManagement';
import TripManagement from '../screens/CattleFeedTruck/Owner/TripManagement';

// Cattle Feed Truck Driver Screens
import CattleFeedTruckDriverDashboard from '../screens/CattleFeedTruck/Driver/Dashboard';
import CattleFeedTruckDriverActiveTrip from '../screens/CattleFeedTruck/Driver/ActiveTrip';
import CattleFeedTruckDriverCreateTrip from '../screens/CattleFeedTruck/Driver/CreateTrip';

// Cattle Feed Truck Super Admin Screens
import CattleFeedTruckSuperAdminDashboard from '../screens/CattleFeedTruck/SuperAdmin/Dashboard';

const Stack = createNativeStackNavigator();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  // Determine initial route based on user role
  const getInitialRoute = () => {
    if (!isAuthenticated) return 'Login';

    switch (user?.role) {
      case 'superadmin':
        return 'SuperAdminDashboard';
      case 'cattleFeedOwner':
        return 'CattleFeedOwnerDashboard';
      case 'cattleFeedSeller':
        return 'CattleFeedSellerSales';
      case 'milkTruckOwner':
        return 'MilkTruckOwnerDashboard';
      case 'milkTruckDriver':
        return 'MilkTruckDriverDashboard';
      case 'cattleFeedTruckOwner':
        return 'CattleFeedTruckOwnerDashboard';
      case 'cattleFeedTruckDriver':
        return 'CattleFeedTruckDriverDashboard';
      default:
        return 'Login';
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{ headerShown: false }}
      >
        {/* Auth Routes */}
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Register" component={OwnerRegistration} />

        {/* Super Admin Routes */}
        <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboard} />
        <Stack.Screen name="SuperAdminOwnerManagement" component={SuperAdminOwnerManagement} />
        <Stack.Screen name="CattleFeedTruckSuperAdminDashboard" component={CattleFeedTruckSuperAdminDashboard} />

        {/* Cattle Feed Owner Routes */}
        <Stack.Screen name="CattleFeedOwnerDashboard" component={CattleFeedOwnerDashboard} />
        <Stack.Screen name="CattleFeedOwnerInventory" component={CattleFeedOwnerInventoryManagement} />
        <Stack.Screen name="CattleFeedOwnerSales" component={CattleFeedOwnerSalesManagement} />
        <Stack.Screen name="CattleFeedOwnerSellers" component={CattleFeedOwnerSellerManagement} />
        <Stack.Screen name="SupplierManagement" component={SupplierManagement} />
        <Stack.Screen name="CattleFeedOwnerCustomers" component={CattleFeedOwnerCustomerManagement} />
        <Stack.Screen name="CattleFeedOwnerOrders" component={CattleFeedOwnerOrderManagement} />
        <Stack.Screen name="CattleFeedOwnerFinance" component={CattleFeedOwnerFinanceManagement} />

        {/* Cattle Feed Seller Routes */}
        <Stack.Screen name="CattleFeedSellerSales" component={CattleFeedSellerSales} />

        {/* Milk Truck Owner Routes */}
        <Stack.Screen name="MilkTruckOwnerDashboard" component={MilkTruckOwnerDashboard} />
        <Stack.Screen name="MilkTruckOwnerBMCs" component={MilkTruckOwnerBMCManagement} />
        <Stack.Screen name="MilkTruckOwnerVehicles" component={MilkTruckOwnerVehicleManagement} />
        <Stack.Screen name="MilkTruckOwnerDrivers" component={MilkTruckOwnerDriverManagement} />
        <Stack.Screen name="MilkTruckOwnerDriverTrips" component={MilkTruckOwnerDriverTrips} />
        <Stack.Screen name="MilkTruckOwnerRoutes" component={MilkTruckOwnerRouteManagement} />
        <Stack.Screen name="MilkTruckOwnerPricing" component={MilkTruckOwnerPricingManagement} />
        <Stack.Screen name="MilkTruckOwnerReports" component={MilkTruckOwnerReports} />
        <Stack.Screen name="MilkTruckOwnerTripDetails" component={MilkTruckOwnerTripDetails} />

        {/* Milk Truck Driver Routes */}
        <Stack.Screen name="MilkTruckDriverDashboard" component={MilkTruckDriverDashboard} />
        <Stack.Screen name="MilkTruckDriverTrip" component={MilkTruckDriverTripPage} />
        <Stack.Screen name="MilkTruckDriverTripDetails" component={MilkTruckDriverTripDetails} />

        {/* Cattle Feed Truck Owner Routes */}
        <Stack.Screen name="CattleFeedTruckOwnerDashboard" component={CattleFeedTruckOwnerDashboard} />
        <Stack.Screen name="WarehouseManagement" component={WarehouseManagement} />
        <Stack.Screen name="VehicleManagement" component={VehicleManagement} />
        <Stack.Screen name="DeliveryPointManagement" component={DeliveryPointManagement} />
        <Stack.Screen name="RouteManagement" component={RouteManagement} />
        <Stack.Screen name="DriverManagement" component={DriverManagement} />
        <Stack.Screen name="FeedProductManagement" component={FeedProductManagement} />
        <Stack.Screen name="TripManagement" component={TripManagement} />

        {/* Cattle Feed Truck Driver Routes */}
        <Stack.Screen name="CattleFeedTruckDriverDashboard" component={CattleFeedTruckDriverDashboard} />
        <Stack.Screen name="CattleFeedTruckDriverActiveTrip" component={CattleFeedTruckDriverActiveTrip} />
        <Stack.Screen name="CattleFeedTruckDriverCreateTrip" component={CattleFeedTruckDriverCreateTrip} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

