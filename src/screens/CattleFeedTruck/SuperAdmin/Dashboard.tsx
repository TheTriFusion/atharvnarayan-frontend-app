import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useOwner } from '../../../contexts/OwnerContext';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { usersAPI, cattleFeedTruckAPI } from '../../../utils/api';
import { useToast } from '../../../contexts/ToastContext';

const CattleFeedTruckSuperAdminDashboard: React.FC = () => {
  const { selectedOwnerId } = useOwner();
  const navigation = useNavigation<any>();
  const { error: showError } = useToast();
  const [stats, setStats] = useState({
    totalOwners: 0,
    totalDrivers: 0,
    totalWarehouses: 0,
    totalVehicles: 0,
    totalDeliveryPoints: 0,
    totalRoutes: 0,
    totalTrips: 0,
    activeTrips: 0,
    completedTrips: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentTrips, setRecentTrips] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedOwnerId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const ownersResponse = await usersAPI.getUsers({ role: 'cattleFeedTruckOwner', systemType: 'cattleFeedTruck' });
      const owners = ownersResponse.success ? ownersResponse.data : [];

      let totalDrivers = 0;
      let totalWarehouses = 0;
      let totalVehicles = 0;
      let totalDeliveryPoints = 0;
      let totalRoutes = 0;
      let totalTrips = 0;
      let activeTrips = 0;
      let completedTrips = 0;
      let allTrips: any[] = [];

      if (selectedOwnerId) {
        const [warehouses, vehicles, deliveryPoints, routes, drivers, trips] = await Promise.all([
          cattleFeedTruckAPI.getWarehouses(),
          cattleFeedTruckAPI.getVehicles(),
          cattleFeedTruckAPI.getDeliveryPoints(),
          cattleFeedTruckAPI.getRoutes(),
          cattleFeedTruckAPI.getDrivers(),
          cattleFeedTruckAPI.getTrips(),
        ]);

        totalDrivers = (drivers.success ? drivers.data : []).length;
        totalWarehouses = (warehouses.success ? warehouses.data : []).length;
        totalVehicles = (vehicles.success ? vehicles.data : []).length;
        totalDeliveryPoints = (deliveryPoints.success ? deliveryPoints.data : []).length;
        totalRoutes = (routes.success ? routes.data : []).length;
        allTrips = trips.success ? trips.data : [];
        totalTrips = allTrips.length;
        activeTrips = allTrips.filter((t: any) => t.status === 'loading' || t.status === 'in_transit').length;
        completedTrips = allTrips.filter((t: any) => t.status === 'completed').length;
      }

      setStats({
        totalOwners: owners.length,
        totalDrivers,
        totalWarehouses,
        totalVehicles,
        totalDeliveryPoints,
        totalRoutes,
        totalTrips,
        activeTrips,
        completedTrips,
      });

      setRecentTrips(allTrips.slice(0, 10));
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      showError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cattle Feed Truck System</Text>
          <Text style={styles.subtitle}>Super Admin Dashboard</Text>
        </View>
        <Button variant="primary" onPress={fetchDashboardData}>
          🔄 Refresh
        </Button>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.primaryStatCard}>
          <Text style={styles.primaryStatLabel}>Total Owners</Text>
          <Text style={styles.primaryStatValue}>{stats.totalOwners}</Text>
        </Card>
        <Card style={styles.primaryStatCard}>
          <Text style={styles.primaryStatLabel}>Total Drivers</Text>
          <Text style={styles.primaryStatValue}>{stats.totalDrivers}</Text>
        </Card>
        <Card style={styles.primaryStatCard}>
          <Text style={styles.primaryStatLabel}>Total Trips</Text>
          <Text style={styles.primaryStatValue}>{stats.totalTrips}</Text>
        </Card>
        <Card style={styles.primaryStatCard}>
          <Text style={styles.primaryStatLabel}>Active Trips</Text>
          <Text style={styles.primaryStatValue}>{stats.activeTrips}</Text>
        </Card>
      </View>

      <View style={styles.secondaryStatsRow}>
        <Card style={styles.secondaryStatCard}>
          <Text style={styles.secondaryStatLabel}>Warehouses</Text>
          <Text style={styles.secondaryStatValue}>{stats.totalWarehouses}</Text>
        </Card>
        <Card style={styles.secondaryStatCard}>
          <Text style={styles.secondaryStatLabel}>Vehicles</Text>
          <Text style={styles.secondaryStatValue}>{stats.totalVehicles}</Text>
        </Card>
        <Card style={styles.secondaryStatCard}>
          <Text style={styles.secondaryStatLabel}>Delivery Points</Text>
          <Text style={styles.secondaryStatValue}>{stats.totalDeliveryPoints}</Text>
        </Card>
        <Card style={styles.secondaryStatCard}>
          <Text style={styles.secondaryStatLabel}>Routes</Text>
          <Text style={styles.secondaryStatValue}>{stats.totalRoutes}</Text>
        </Card>
      </View>

      <Card style={styles.quickActionsCard}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <Button
            variant="primary"
            onPress={() => navigation.navigate('WarehouseManagement')}
            style={styles.quickActionButton}
          >
            🏭 Warehouses
          </Button>
          <Button
            variant="primary"
            onPress={() => navigation.navigate('VehicleManagement')}
            style={styles.quickActionButton}
          >
            🚛 Vehicles
          </Button>
          <Button
            variant="primary"
            onPress={() => navigation.navigate('DeliveryPointManagement')}
            style={styles.quickActionButton}
          >
            📍 Delivery Points
          </Button>
          <Button
            variant="primary"
            onPress={() => navigation.navigate('RouteManagement')}
            style={styles.quickActionButton}
          >
            🛣️ Routes
          </Button>
          <Button
            variant="primary"
            onPress={() => navigation.navigate('DriverManagement')}
            style={styles.quickActionButton}
          >
            👥 Drivers
          </Button>
          <Button
            variant="primary"
            onPress={() => navigation.navigate('TripManagement')}
            style={styles.quickActionButton}
          >
            📊 Trips
          </Button>
          <Button
            variant="primary"
            onPress={() => navigation.navigate('FeedProductManagement')}
            style={styles.quickActionButton}
          >
            🌾 Feed Products
          </Button>
          <Button
            variant="primary"
            onPress={() => navigation.navigate('SuperAdminOwnerManagement')}
            style={styles.quickActionButton}
          >
            🏢 Manage Owners
          </Button>
        </View>
      </Card>

      {recentTrips.length > 0 && (
        <Card>
          <Text style={styles.recentTripsTitle}>Recent Trips</Text>
          <View style={styles.tripsList}>
            {recentTrips.map((trip) => (
              <View key={trip._id} style={styles.tripItem}>
                <View style={styles.tripItemContent}>
                  <Text style={styles.tripDate}>
                    {new Date(trip.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.tripDriver}>
                    Driver: {trip.driverId?.name || 'N/A'}
                  </Text>
                  <Text style={styles.tripRoute}>
                    Route: {trip.routeId?.name || 'N/A'}
                  </Text>
                  <Text style={styles.tripVehicle}>
                    Vehicle: {trip.vehicleId?.registrationNumber || 'N/A'}
                  </Text>
                  <View style={[styles.statusBadge, 
                    trip.status === 'completed' ? styles.completedBadge :
                    trip.status === 'in_transit' ? styles.inTransitBadge :
                    trip.status === 'loading' ? styles.loadingBadge : styles.pendingBadge]}>
                    <Text style={styles.statusText}>
                      {trip.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  primaryStatCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  primaryStatLabel: {
    fontSize: 12,
    color: '#ffffff',
    marginBottom: 8,
  },
  primaryStatValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  secondaryStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  secondaryStatCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    alignItems: 'center',
  },
  secondaryStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  secondaryStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  quickActionsCard: {
    marginBottom: 16,
  },
  quickActionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
  },
  recentTripsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  tripsList: {
    gap: 12,
  },
  tripItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  tripItemContent: {
    gap: 4,
  },
  tripDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  tripDriver: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  tripRoute: {
    fontSize: 14,
    color: '#374151',
  },
  tripVehicle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completedBadge: {
    backgroundColor: '#d1fae5',
  },
  inTransitBadge: {
    backgroundColor: '#dbeafe',
  },
  loadingBadge: {
    backgroundColor: '#fef3c7',
  },
  pendingBadge: {
    backgroundColor: '#f3f4f6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
});

export default CattleFeedTruckSuperAdminDashboard;
