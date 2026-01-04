import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useToast } from '../../contexts/ToastContext';
import { useOwner } from '../../contexts/OwnerContext';
import {
  getCattleFeedInventory,
  getCattleFeedSales,
  getCattleFeedSellers,
  getCattleFeedOwners,
  getMilkTruckOwners,
  getMilkTruckDrivers,
  getMilkTruckVehicles,
  getMilkTruckTrips,
  getMilkTruckBMCs,
  getMilkTruckRoutes,
} from '../../utils/storage';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const Dashboard: React.FC = () => {
  const { selectedOwnerId, ownerType } = useOwner();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const [cattleFeedStats, setCattleFeedStats] = useState({
    totalInventoryItems: 0,
    totalStockValue: 0,
    lowStockItems: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalSellers: 0,
  });

  const [milkTruckStats, setMilkTruckStats] = useState({
    totalTrips: 0,
    completedTrips: 0,
    inProgressTrips: 0,
    totalBMCs: 0,
    totalVehicles: 0,
    totalDrivers: 0,
    totalRoutes: 0,
  });

  const [ownerCounts, setOwnerCounts] = useState({
    totalCattleFeedOwners: 0,
    totalMilkTruckOwners: 0,
  });

  const [loadingCF, setLoadingCF] = useState(true);
  const [loadingMT, setLoadingMT] = useState(true);
  const [loadingOwners, setLoadingOwners] = useState(true);

  const cattleFeedOwnerId = useMemo(() => ownerType === 'cattleFeed' ? selectedOwnerId : null, [ownerType, selectedOwnerId]);
  const milkTruckOwnerId = useMemo(() => ownerType === 'milkTruck' ? selectedOwnerId : null, [ownerType, selectedOwnerId]);

  useEffect(() => {
    loadOwnerCounts();
  }, []);

  useEffect(() => {
    loadCFData();
  }, [cattleFeedOwnerId]);

  useEffect(() => {
    loadMTData();
  }, [milkTruckOwnerId]);

  const loadOwnerCounts = async () => {
    try {
      const [cfOwners, mtOwners] = await Promise.all([
        getCattleFeedOwners(),
        getMilkTruckOwners(),
      ]);
      setOwnerCounts({
        totalCattleFeedOwners: cfOwners.length,
        totalMilkTruckOwners: mtOwners.length,
      });
    } catch (error: any) {
      console.error('Failed to load owner counts', error);
      toast.error('Failed to load owner counts');
    } finally {
      setLoadingOwners(false);
    }
  };

  const loadCFData = async () => {
    setLoadingCF(true);
    try {
      const [inventory, sales, sellers] = await Promise.all([
        getCattleFeedInventory(cattleFeedOwnerId),
        getCattleFeedSales(cattleFeedOwnerId),
        getCattleFeedSellers(cattleFeedOwnerId),
      ]);

      const totalItems = inventory.length;
      const stockValue = inventory.reduce((sum: number, item: any) => sum + (item.quantity * item.retailPrice), 0);
      const lowStock = inventory.filter((item: any) => item.quantity < 50).length;
      const totalSalesCount = sales.length;
      const totalRevenue = sales.reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0);

      setCattleFeedStats({
        totalInventoryItems: totalItems,
        totalStockValue: stockValue,
        lowStockItems: lowStock,
        totalSales: totalSalesCount,
        totalRevenue,
        totalSellers: sellers.length,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to load Cattle Feed stats');
    } finally {
      setLoadingCF(false);
    }
  };

  const loadMTData = async () => {
    setLoadingMT(true);
    try {
      const [trips, bmcs, vehicles, drivers, routes] = await Promise.all([
        getMilkTruckTrips(milkTruckOwnerId),
        getMilkTruckBMCs(milkTruckOwnerId),
        getMilkTruckVehicles(milkTruckOwnerId),
        getMilkTruckDrivers(milkTruckOwnerId),
        getMilkTruckRoutes(milkTruckOwnerId),
      ]);

      const completedTrips = trips.filter((t: any) => t.status === 'completed').length;
      const inProgressTrips = trips.filter((t: any) => t.status === 'in_progress' || t.status === 'in_transit').length;

      setMilkTruckStats({
        totalTrips: trips.length,
        completedTrips,
        inProgressTrips,
        totalBMCs: bmcs.length,
        totalVehicles: vehicles.length,
        totalDrivers: drivers.length,
        totalRoutes: routes.length,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to load Milk Truck stats');
    } finally {
      setLoadingMT(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadOwnerCounts(), loadCFData(), loadMTData()]);
    setRefreshing(false);
  };

  const loading = loadingCF || loadingMT || loadingOwners;

  if (loading && cattleFeedStats.totalInventoryItems === 0 && milkTruckStats.totalTrips === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Super Admin Dashboard</Text>
        {loading && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.loadingLabel}>Loading...</Text>
          </View>
        )}
        {!loading && (
          <Button onPress={handleRefresh} variant="secondary" style={styles.refreshButton}>
            🔄 Refresh
          </Button>
        )}
      </View>

      {/* Owner Counts */}
      <Card style={styles.ownerCountsCard}>
        <Text style={styles.sectionTitle}>System Overview</Text>
        <View style={styles.ownerCountsGrid}>
          <View style={styles.ownerCountItem}>
            <Text style={styles.ownerCountValue}>{ownerCounts.totalCattleFeedOwners}</Text>
            <Text style={styles.ownerCountLabel}>Cattle Feed Owners</Text>
          </View>
          <View style={styles.ownerCountItem}>
            <Text style={styles.ownerCountValue}>{ownerCounts.totalMilkTruckOwners}</Text>
            <Text style={styles.ownerCountLabel}>Milk Truck Owners</Text>
          </View>
        </View>
      </Card>

      {/* Cattle Feed Stats */}
      <View style={[styles.section, loadingCF && styles.sectionLoading]}>
        <Text style={styles.sectionTitle}>
          Cattle Feed System Overview
          {loadingCF && <Text style={styles.loadingLabel}> (Updating...)</Text>}
        </Text>
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#2563eb' }]}>
              {cattleFeedStats.totalInventoryItems}
            </Text>
            <Text style={styles.statLabel}>Total Inventory Items</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#16a34a' }]}>
              ₹{cattleFeedStats.totalStockValue.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total Stock Value</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#dc2626' }]}>
              {cattleFeedStats.lowStockItems}
            </Text>
            <Text style={styles.statLabel}>Low Stock Items</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#9333ea' }]}>
              {cattleFeedStats.totalSales}
            </Text>
            <Text style={styles.statLabel}>Total Sales</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#6366f1' }]}>
              ₹{cattleFeedStats.totalRevenue.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#14b8a6' }]}>
              {cattleFeedStats.totalSellers}
            </Text>
            <Text style={styles.statLabel}>Cattle Feed Sellers</Text>
          </Card>
        </View>
      </View>

      {/* Milk Truck Stats */}
      <View style={[styles.section, loadingMT && styles.sectionLoading]}>
        <Text style={styles.sectionTitle}>
          Milk Truck System Overview
          {loadingMT && <Text style={styles.loadingLabel}> (Updating...)</Text>}
        </Text>
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#2563eb' }]}>
              {milkTruckStats.totalTrips}
            </Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#16a34a' }]}>
              {milkTruckStats.completedTrips}
            </Text>
            <Text style={styles.statLabel}>Completed Trips</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#ea580c' }]}>
              {milkTruckStats.inProgressTrips}
            </Text>
            <Text style={styles.statLabel}>Active Trips</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#9333ea' }]}>
              {milkTruckStats.totalBMCs}
            </Text>
            <Text style={styles.statLabel}>Total BMCs</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#6366f1' }]}>
              {milkTruckStats.totalVehicles}
            </Text>
            <Text style={styles.statLabel}>Vehicles</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#14b8a6' }]}>
              {milkTruckStats.totalDrivers}
            </Text>
            <Text style={styles.statLabel}>Drivers</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#ec4899' }]}>
              {milkTruckStats.totalRoutes}
            </Text>
            <Text style={styles.statLabel}>Routes</Text>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ownerCountsCard: {
    margin: 16,
    marginTop: 0,
  },
  section: {
    marginBottom: 16,
  },
  sectionLoading: {
    opacity: 0.5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  ownerCountsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  ownerCountItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  ownerCountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  ownerCountLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default Dashboard;
