import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import { useToast } from '../../../contexts/ToastContext';
import {
  getMilkTruckTrips,
  getMilkTruckBMCs,
  getMilkTruckVehicles,
  getMilkTruckDrivers,
  getMilkTruckRoutes,
  getMilkTruckPricing,
  deleteMilkTruckTrip,
} from '../../../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import ScreenHeader from '../../../components/common/ScreenHeader';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

const MilkTruckOwnerDashboard: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalTrips: 0,
    completedTrips: 0,
    inProgressTrips: 0,
    totalBMCs: 0,
    totalVehicles: 0,
    totalDrivers: 0,
    totalRoutes: 0,
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [completedTrips, setCompletedTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [bmcs, setBMCs] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
    loadNotifications();
  }, [selectedOwnerId]);

  const loadNotifications = async () => {
    try {
      const notifsJson = await AsyncStorage.getItem('ownerNotifications');
      const notifs = notifsJson ? JSON.parse(notifsJson) : [];
      setNotifications(notifs.slice(0, 10));
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const clearNotifications = async () => {
    try {
      await AsyncStorage.removeItem('ownerNotifications');
      setNotifications([]);
      toast.success('Notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const loadAllData = async () => {
    try {
      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      const [trips, bmcs, vehiclesData, drivers, routesData] = await Promise.all([
        getMilkTruckTrips(ownerId),
        getMilkTruckBMCs(ownerId),
        getMilkTruckVehicles(ownerId),
        getMilkTruckDrivers(ownerId),
        getMilkTruckRoutes(ownerId),
      ]);

      const tripsArray = Array.isArray(trips) ? trips : [];
      const bmcsArray = Array.isArray(bmcs) ? bmcs : [];
      const vehiclesArray = Array.isArray(vehiclesData) ? vehiclesData : [];
      const driversArray = Array.isArray(drivers) ? drivers : [];
      const routesArray = Array.isArray(routesData) ? routesData : [];

      setStats({
        totalTrips: tripsArray.length,
        completedTrips: tripsArray.filter((t: any) => t.status === 'completed').length,
        inProgressTrips: tripsArray.filter((t: any) => t.status === 'in_progress' || t.status === 'in_transit').length,
        totalBMCs: bmcsArray.length,
        totalVehicles: vehiclesArray.length,
        totalDrivers: driversArray.length,
        totalRoutes: routesArray.length,
      });

      const completed = tripsArray
        .filter((t: any) => t.status === 'completed')
        .sort((a: any, b: any) => new Date(b.endTime || b.createdAt).getTime() - new Date(a.endTime || a.createdAt).getTime());
      setCompletedTrips(completed);

      setDrivers(driversArray);
      setVehicles(vehiclesArray);
      setRoutes(routesArray);
      setBMCs(bmcsArray);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast.error('Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAllData(), loadNotifications()]);
    setRefreshing(false);
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      const success = await deleteMilkTruckTrip(tripId);
      if (success) {
        toast.success('Trip deleted successfully!');
        setDeleteConfirm(null);
        await loadAllData();
      } else {
        toast.error('Failed to delete trip');
      }
    } catch (error: any) {
      console.error('Error deleting trip:', error);
      toast.error(`Error: ${error.message || 'Failed to delete trip'}`);
    }
  };

  const handleDriverClick = (driverId: string) => {
    navigation.navigate('MilkTruckOwnerDriverTrips', { driverId });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary[600]}
        />
      }
    >
      {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}
      <ScreenHeader
        title="Owner Dashboard"
        subtitle="Milk Truck Management"
      />
      <View style={styles.content}>

        {/* Quick Actions */}
        <Card variant="elevated" style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <Button
              onPress={() => navigation.navigate('MilkTruckOwnerBMCs')}
              variant="primary"
              style={styles.actionButton}
            >
              🏭 BMCs
            </Button>
            <Button
              onPress={() => navigation.navigate('MilkTruckOwnerVehicles')}
              variant="primary"
              style={styles.actionButton}
            >
              🚛 Vehicles
            </Button>
            <Button
              onPress={() => navigation.navigate('MilkTruckOwnerDrivers')}
              variant="primary"
              style={styles.actionButton}
            >
              👥 Drivers
            </Button>
            <Button
              onPress={() => navigation.navigate('MilkTruckOwnerRoutes')}
              variant="primary"
              style={styles.actionButton}
            >
              🛣️ Routes
            </Button>
            <Button
              onPress={() => navigation.navigate('MilkTruckOwnerPricing')}
              variant="primary"
              style={styles.actionButton}
            >
              💰 Pricing
            </Button>
            <Button
              onPress={() => navigation.navigate('MilkTruckOwnerReports')}
              variant="primary"
              style={styles.actionButton}
            >
              📊 Reports
            </Button>
          </View>
        </Card>

        {/* Driver Overview Section */}
        {drivers.length > 0 && (
          <Card variant="elevated" style={styles.driverOverviewCard}>
            <Text style={styles.sectionTitle}>Driver Overview</Text>
            <View style={styles.driversGrid}>
              {drivers.map((driver) => {
                const driverTrips = completedTrips.filter((t: any) => {
                  const tripDriverId = t.driverId?._id || t.driverId?.id || t.driverId;
                  const driverId = driver._id || driver.id;
                  return tripDriverId === driverId;
                });
                const activeTrips = completedTrips.filter((t: any) => {
                  const tripDriverId = t.driverId?._id || t.driverId?.id || t.driverId;
                  const driverId = driver._id || driver.id;
                  return tripDriverId === driverId && (t.status === 'in_progress' || t.status === 'in_transit');
                });
                const totalTrips = driverTrips.length;
                const completedCount = driverTrips.filter((t: any) => t.status === 'completed').length;

                return (
                  <TouchableOpacity
                    key={driver._id || driver.id}
                    style={styles.driverCard}
                    activeOpacity={0.7}
                    onPress={() => handleDriverClick(driver._id || driver.id)}
                  >
                    <View style={styles.driverCardHeader}>
                      <View style={styles.driverInfo}>
                        <Text style={styles.driverName}>{driver.name}</Text>
                        <Text style={styles.driverPhone}>{driver.phoneNumber || 'N/A'}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDriverClick(driver._id || driver.id)}
                        style={styles.viewTripsButton}
                      >
                        <Text style={styles.viewTripsText}>View →</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.driverStats}>
                      <View style={styles.driverStatItem}>
                        <Text style={[styles.driverStatValue, { color: colors.primary[600] }]}>{totalTrips}</Text>
                        <Text style={styles.driverStatLabel}>Total</Text>
                      </View>
                      <View style={styles.driverStatItem}>
                        <Text style={[styles.driverStatValue, { color: colors.success[600] }]}>{completedCount}</Text>
                        <Text style={styles.driverStatLabel}>Completed</Text>
                      </View>
                      <View style={styles.driverStatItem}>
                        <Text style={[styles.driverStatValue, { color: colors.warning[600] }]}>{activeTrips.length}</Text>
                        <Text style={styles.driverStatLabel}>Active</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}

        {/* Real-time Notifications */}
        <Card variant="elevated" style={styles.notificationsCard}>
          <View style={styles.notificationsHeader}>
            <Text style={styles.sectionTitle}>Real-time BMC Collection Updates</Text>
            {notifications.length > 0 && (
              <Button onPress={clearNotifications} variant="outline" size="sm">
                Clear All
              </Button>
            )}
          </View>
          {notifications.length > 0 ? (
            <ScrollView style={styles.notificationsList} nestedScrollEnabled>
              {notifications.map((notif: any) => (
                <View key={notif.id} style={styles.notificationItem}>
                  <Text style={styles.notificationMessage}>{notif.message}</Text>
                  
                  {/* Handle old notification format (totals) */}
                  {notif.totals && (
                    <View style={styles.notificationDetails}>
                      <Text style={styles.notificationDetailText}>
                        Total Milk: <Text style={styles.notificationDetailValue}>{notif.totals.totalMilk?.toFixed(2) || '0.00'}L</Text>
                      </Text>
                      <Text style={styles.notificationDetailText}>
                        Total Expenses: <Text style={styles.notificationDetailValue}>₹{notif.totals.totalExpenses?.toFixed(2) || '0.00'}</Text>
                      </Text>
                    </View>
                  )}

                  {/* Handle new notification format (summary) */}
                  {notif.summary && (
                    <View style={styles.notificationDetails}>
                      <Text style={styles.notificationDetailText}>
                        Total Milk: <Text style={styles.notificationDetailValue}>{notif.summary.totalMilk?.toFixed(2) || '0.00'}L</Text>
                      </Text>
                      <Text style={styles.notificationDetailText}>
                        Total Expenses: <Text style={styles.notificationDetailValue}>₹{notif.summary.totalExpenses?.toFixed(2) || '0.00'}</Text>
                      </Text>
                      {notif.summary.finalPrice && (
                        <Text style={styles.notificationDetailText}>
                          Final Price: <Text style={styles.notificationDetailValue}>₹{notif.summary.finalPrice?.toFixed(2)}</Text>
                        </Text>
                      )}
                    </View>
                  )}

                  {notif.variance && (
                    <View style={styles.varianceContainer}>
                      <Text style={styles.varianceLabel}>Variance:</Text>
                      <Text style={[
                        styles.varianceValue,
                        { color: notif.variance.milk < 0 ? colors.error[600] : colors.success[600] }
                      ]}>
                        {notif.variance.milk > 0 ? '+' : ''}{notif.variance.milk?.toFixed(2) || '0.00'}L
                      </Text>
                    </View>
                  )}

                  <Text style={styles.notificationTime}>
                    {new Date(notif.timestamp).toLocaleString()}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyNotifications}>
              <Text style={styles.emptyNotificationsText}>
                No recent updates. BMC collection data will appear here in real-time.
              </Text>
            </View>
          )}
        </Card>

        {/* Trip Completed History */}
        {completedTrips.length > 0 && (
          <Card variant="elevated" style={styles.tripsCard}>
            <Text style={styles.sectionTitle}>Trip Completed History</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Date</Text>
                  <Text style={[styles.tableHeaderText, { width: 80 }]}>Trip ID</Text>
                  <Text style={[styles.tableHeaderText, { width: 120 }]}>Route / Vehicle</Text>
                  <Text style={[styles.tableHeaderText, { width: 80 }]}>Collected</Text>
                  <Text style={[styles.tableHeaderText, { width: 80 }]}>Dairy Rec.</Text>
                  <Text style={[styles.tableHeaderText, { width: 80 }]}>Variance</Text>
                  <Text style={[styles.tableHeaderText, { width: 70 }]}>BMCs</Text>
                  <Text style={[styles.tableHeaderText, { width: 120 }]}>Actions</Text>
                </View>
                {/* Table Rows */}
                {completedTrips.map((trip: any) => {
                  const vehicleReg = trip.vehicleId?.registrationNumber || vehicles.find((v: any) => (v._id || v.id) === (trip.vehicleId?._id || trip.vehicleId?.id || trip.vehicleId))?.registrationNumber || 'N/A';
                  const routeName = trip.routeId?.name || routes.find((r: any) => (r._id || r.id) === (trip.routeId?._id || trip.routeId?.id || trip.routeId))?.name || 'N/A';

                  const collected = trip.dairyConfirmation?.collectionTotals?.milk || trip.summary?.totalMilk || 0;
                  const dairy = trip.dairyConfirmation?.totalMilkQuantity || trip.summary?.totalMilk || 0;
                  const diff = trip.dairyConfirmation?.variance?.milk || (dairy - collected);
                  const bmcCount = trip.bmcEntries?.length || 0;
                  const tripId = trip._id || trip.id || `trip-${Math.random()}`;

                  return (
                    <View key={tripId} style={styles.tableRow}>
                      <View style={[styles.tableCell, { width: 100 }]}>
                        <Text style={styles.tableCellText}>
                          {new Date(trip.endTime || trip.startTime || trip.createdAt).toLocaleDateString()}
                        </Text>
                        <Text style={styles.tableCellSubText}>
                          {new Date(trip.endTime || trip.startTime || trip.createdAt).toLocaleTimeString()}
                        </Text>
                      </View>
                      <View style={[styles.tableCell, { width: 80 }]}>
                        <Text style={[styles.tableCellText, styles.monoText]}>
                          #{tripId ? tripId.toString().substring(tripId.toString().length - 6) : 'N/A'}
                        </Text>
                      </View>
                      <View style={[styles.tableCell, { width: 120 }]}>
                        <Text style={[styles.tableCellText, styles.boldText]}>{routeName}</Text>
                        <Text style={styles.tableCellSubText}>{vehicleReg}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: 80 }]}>
                        <Text style={[styles.tableCellText, styles.boldText]}>
                          {collected.toFixed(2)} L
                        </Text>
                      </View>
                      <View style={[styles.tableCell, { width: 80 }]}>
                        <Text style={[styles.tableCellText, styles.boldText]}>
                          {dairy.toFixed(2)} L
                        </Text>
                      </View>
                      <View style={[styles.tableCell, { width: 80 }]}>
                        <Text style={[
                          styles.tableCellText,
                          styles.boldText,
                          { color: diff < 0 ? colors.error[600] : diff > 0 ? colors.success[600] : colors.text.tertiary }
                        ]}>
                          {diff > 0 ? '+' : ''}{diff !== 0 ? diff.toFixed(2) : '-'} L
                        </Text>
                      </View>
                      <View style={[styles.tableCell, { width: 70 }]}>
                        <Text style={styles.tableCellText}>
                          {bmcCount} BMC{bmcCount !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View style={[styles.tableCell, styles.actionsCell, { width: 120 }]}>
                        <Button
                          onPress={() => setSelectedTrip(trip)}
                          variant="outline"
                          size="sm"
                          style={styles.viewButton}
                        >
                          View
                        </Button>
                        <TouchableOpacity
                          onPress={() => setDeleteConfirm(tripId)}
                          style={[styles.deleteButton, { borderColor: colors.error[600] }]}
                        >
                          <Text style={{ color: colors.error[600], fontSize: typography.fontSize.xs }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </Card>
        )}
      </View>

      {/* Trip Details Modal */}
      {selectedTrip && (
        <TripDetailsModal
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onUpdate={() => {
            setSelectedTrip(null);
            loadAllData();
          }}
          bmcs={bmcs}
          routes={routes}
          vehicles={vehicles}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal visible={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Trip?">
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete this trip? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalActions}>
              <Button
                onPress={() => setDeleteConfirm(null)}
                variant="outline"
                style={styles.deleteModalButton}
              >
                Cancel
              </Button>
              <TouchableOpacity
                onPress={() => handleDeleteTrip(deleteConfirm)}
                style={[styles.deleteModalButton, { backgroundColor: colors.error[600] }]}
              >
                <Text style={{ color: colors.text.inverse, fontWeight: typography.fontWeight.semibold }}>Delete Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

// Trip Details Modal Component
const TripDetailsModal: React.FC<{
  trip: any;
  onClose: () => void;
  onUpdate: () => void;
  bmcs: any[];
  routes: any[];
  vehicles: any[];
}> = ({ trip, onClose, bmcs, routes, vehicles }) => {
  const [pricing, setPricing] = useState<any>({ basePricePerLiter: 50, fatPricePerPercent: 2, snfPricePerPercent: 1 });
  const [basePricePerLiter, setBasePricePerLiter] = useState('50');
  const [fatPricePerPercent, setFatPricePerPercent] = useState('2');
  const [snfPricePerPercent, setSnfPricePerPercent] = useState('1');

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      const pricingData = await getMilkTruckPricing();
      if (pricingData) {
        setPricing(pricingData);
        setBasePricePerLiter(pricingData.basePricePerLiter?.toString() || '50');
        setFatPricePerPercent(pricingData.fatPricePerPercent?.toString() || '2');
        setSnfPricePerPercent(pricingData.snfPricePerPercent?.toString() || '1');
      }
    } catch (error) {
      console.error('Error loading pricing:', error);
    }
  };

  if (!trip) return null;

  const tripId = trip._id || trip.id;
  const displayTripId = tripId ? tripId.toString().substring(tripId.toString().length - 6) : 'N/A';

  const vehicle = vehicles.find((v: any) => (v._id || v.id) === (trip.vehicleId?._id || trip.vehicleId?.id || trip.vehicleId));
  const tripRoute = routes.find((r: any) => (r._id || r.id) === (trip.routeId?._id || trip.routeId?.id || trip.routeId));

  // Calculate dairy-verified (At Dairy) totals
  const dairyTotals = trip.bmcEntries?.reduce((acc: any, entry: any) => {
    const data = entry.dairyVerifiedData || entry.collectionData;
    if (!data) return acc;

    const milk = parseFloat(data.milkQuantity) || 0;
    const fat = parseFloat(data.fatContent) || 0;
    const snf = parseFloat(data.snfContent) || 0;

    acc.milk += milk;
    acc.fatKg += (milk * fat) / 100;
    acc.snfKg += (milk * snf) / 100;

    return acc;
  }, { milk: 0, fatKg: 0, snfKg: 0 }) || { milk: 0, fatKg: 0, snfKg: 0 };

  const dairyAvgFat = dairyTotals.milk > 0 ? (dairyTotals.fatKg / dairyTotals.milk) * 100 : 0;
  const dairyAvgSnf = dairyTotals.milk > 0 ? (dairyTotals.snfKg / dairyTotals.milk) * 100 : 0;

  // Calculate price
  const calculatePrice = () => {
    const basePrice = parseFloat(basePricePerLiter) || 0;
    const fatPrice = parseFloat(fatPricePerPercent) || 0;
    const snfPrice = parseFloat(snfPricePerPercent) || 0;

    const totalMilkPrice = basePrice * dairyTotals.milk;
    const totalFatPrice = fatPrice * dairyAvgFat;
    const totalSnfPrice = snfPrice * dairyAvgSnf;

    return totalMilkPrice + totalFatPrice + totalSnfPrice;
  };

  const totalPrice = calculatePrice();
  const bmcEntries = trip.bmcEntries || [];

  return (
    <Modal visible={!!trip} onClose={onClose} title="🧾 Trip Payment Details">
      <ScrollView style={styles.modalContent}>
        {/* Header Info */}
        <View style={styles.modalHeaderInfo}>
          <Text style={styles.modalHeaderText}>🆔 {displayTripId}</Text>
          <Text style={styles.modalHeaderText}>
            📅 {trip.endTime || trip.startTime ? new Date(trip.endTime || trip.startTime).toLocaleString() : 'N/A'}
          </Text>
        </View>
          <Text style={styles.modalSubHeader}>
            Route: <Text style={styles.paymentBoldText}>{tripRoute?.name || 'Unknown Route'}</Text> • Vehicle: <Text style={styles.paymentBoldText}>{vehicle?.registrationNumber || 'Unknown Vehicle'}</Text>
          </Text>

        {/* Trip Information */}
        <Card variant="elevated" style={styles.infoCard}>
          <Text style={styles.cardTitle}>Trip Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Start Time:</Text>
              <Text style={styles.infoValue}>{trip.startTime ? new Date(trip.startTime).toLocaleString() : 'N/A'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>End Time:</Text>
              <Text style={styles.infoValue}>{trip.endTime ? new Date(trip.endTime).toLocaleString() : 'N/A'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Route:</Text>
              <Text style={styles.infoValue}>{tripRoute?.name || 'Unknown'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Vehicle:</Text>
              <Text style={styles.infoValue}>{vehicle?.registrationNumber || 'Unknown'}</Text>
            </View>
          </View>
        </Card>

        {/* Trip Summary */}
        {trip.summary && (
          <Card variant="elevated" style={StyleSheet.flatten([styles.summaryCard, { backgroundColor: colors.success[50] }])}>
            <Text style={StyleSheet.flatten([styles.cardTitle, { color: colors.success[800] }])}>Trip Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Milk</Text>
                <Text style={styles.summaryValue}>{dairyTotals.milk.toFixed(2)} L</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Avg Fat</Text>
                <Text style={styles.summaryValue}>{dairyAvgFat.toFixed(2)}%</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Avg SNF</Text>
                <Text style={styles.summaryValue}>{dairyAvgSnf.toFixed(2)}%</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Expenses</Text>
                <Text style={styles.summaryValue}>₹{trip.summary.totalExpenses?.toFixed(2) || '0.00'}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* BMC-wise Comparison Table */}
        {bmcEntries.length > 0 && (
          <Card variant="elevated" style={styles.comparisonCard}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.cardTitle}>📊 BMC-wise Comparison: Collection vs Dairy Verification</Text>
              <Text style={styles.comparisonSubtitle}>Compare original BMC collection data with dairy-verified values</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, { width: 100 }]}>BMC Name</Text>
                  <Text style={[styles.tableHeaderCell, styles.greenHeader, { width: 60 }]}>Milk (L)</Text>
                  <Text style={[styles.tableHeaderCell, styles.greenHeader, { width: 60 }]}>Fat %</Text>
                  <Text style={[styles.tableHeaderCell, styles.greenHeader, { width: 60 }]}>SNF %</Text>
                  <Text style={[styles.tableHeaderCell, styles.purpleHeader, { width: 60 }]}>Milk (L)</Text>
                  <Text style={[styles.tableHeaderCell, styles.purpleHeader, { width: 60 }]}>Fat %</Text>
                  <Text style={[styles.tableHeaderCell, styles.purpleHeader, { width: 60 }]}>SNF %</Text>
                  <Text style={[styles.tableHeaderCell, { width: 60 }]}>Milk (L)</Text>
                  <Text style={[styles.tableHeaderCell, { width: 60 }]}>Fat %</Text>
                  <Text style={[styles.tableHeaderCell, { width: 60 }]}>Fat (kg)</Text>
                  <Text style={[styles.tableHeaderCell, { width: 60 }]}>SNF %</Text>
                  <Text style={[styles.tableHeaderCell, { width: 60 }]}>SNF (kg)</Text>
                </View>
                <View style={styles.tableSubHeaderRow}>
                  <Text style={[styles.tableSubHeaderCell, { width: 100 }]}>At BMC (Original)</Text>
                  <Text style={[styles.tableSubHeaderCell, styles.greenHeader, { width: 60 }]}>-</Text>
                  <Text style={[styles.tableSubHeaderCell, styles.greenHeader, { width: 60 }]}>-</Text>
                  <Text style={[styles.tableSubHeaderCell, styles.greenHeader, { width: 60 }]}>-</Text>
                  <Text style={[styles.tableSubHeaderCell, styles.purpleHeader, { width: 60 }]}>At Dairy (Verified)</Text>
                  <Text style={[styles.tableSubHeaderCell, styles.purpleHeader, { width: 60 }]}>-</Text>
                  <Text style={[styles.tableSubHeaderCell, styles.purpleHeader, { width: 60 }]}>-</Text>
                  <Text style={[styles.tableSubHeaderCell, { width: 60 }]}>Variance</Text>
                  <Text style={[styles.tableSubHeaderCell, { width: 60 }]}>-</Text>
                  <Text style={[styles.tableSubHeaderCell, { width: 60 }]}>-</Text>
                  <Text style={[styles.tableSubHeaderCell, { width: 60 }]}>-</Text>
                  <Text style={[styles.tableSubHeaderCell, { width: 60 }]}>-</Text>
                </View>
                {/* Table Rows */}
                {bmcEntries.map((entry: any, index: number) => {
                  const entryBmcId = entry.bmcId?._id || entry.bmcId?.id || entry.bmcId;
                  const bmcName = entry.bmcId?.name || bmcs.find((b: any) => (b._id || b.id) === entryBmcId)?.name || 'Unknown BMC';

                  const atBMC = entry.collectionData;
                  const atDairy = entry.dairyVerifiedData || entry.collectionData;

                  if (!atBMC) return null;

                  const milkVar = atDairy ? (parseFloat(atDairy.milkQuantity) - parseFloat(atBMC.milkQuantity)) : 0;
                  const fatVar = atDairy ? (parseFloat(atDairy.fatContent) - parseFloat(atBMC.fatContent)) : 0;
                  const snfVar = atDairy ? (parseFloat(atDairy.snfContent) - parseFloat(atBMC.snfContent)) : 0;

                  const atBMCFatKg = (parseFloat(atBMC.milkQuantity) * parseFloat(atBMC.fatContent)) / 100;
                  const atBMCSnfKg = (parseFloat(atBMC.milkQuantity) * parseFloat(atBMC.snfContent)) / 100;
                  const atDairyFatKg = atDairy ? (parseFloat(atDairy.milkQuantity) * parseFloat(atDairy.fatContent)) / 100 : 0;
                  const atDairySnfKg = atDairy ? (parseFloat(atDairy.milkQuantity) * parseFloat(atDairy.snfContent)) / 100 : 0;
                  const fatKgVar = atDairyFatKg - atBMCFatKg;
                  const snfKgVar = atDairySnfKg - atBMCSnfKg;

                  return (
                    <View key={index} style={styles.paymentTableRow}>
                      <Text style={[styles.paymentTableCell, styles.paymentBoldText, { width: 100 }]}>{bmcName}</Text>
                      <Text style={[styles.paymentTableCell, styles.greenCell, { width: 60 }]}>{parseFloat(atBMC.milkQuantity).toFixed(2)}</Text>
                      <Text style={[styles.paymentTableCell, styles.greenCell, { width: 60 }]}>{parseFloat(atBMC.fatContent).toFixed(2)}</Text>
                      <Text style={[styles.paymentTableCell, styles.greenCell, { width: 60 }]}>{parseFloat(atBMC.snfContent).toFixed(2)}</Text>
                      <Text style={[styles.paymentTableCell, styles.purpleCell, { width: 60 }]}>{atDairy ? parseFloat(atDairy.milkQuantity).toFixed(2) : '-'}</Text>
                      <Text style={[styles.paymentTableCell, styles.purpleCell, { width: 60 }]}>{atDairy ? parseFloat(atDairy.fatContent).toFixed(2) : '-'}</Text>
                      <Text style={[styles.paymentTableCell, styles.purpleCell, { width: 60 }]}>{atDairy ? parseFloat(atDairy.snfContent).toFixed(2) : '-'}</Text>
                      <Text style={[styles.paymentTableCell, { width: 60, color: milkVar < 0 ? colors.error[600] : milkVar > 0 ? colors.success[600] : colors.text.tertiary }]}>
                        {milkVar !== 0 ? (milkVar > 0 ? '+' : '') + milkVar.toFixed(2) : '0.00'}
                      </Text>
                      <Text style={[styles.paymentTableCell, { width: 60, color: fatVar < 0 ? colors.error[600] : fatVar > 0 ? colors.success[600] : colors.text.tertiary }]}>
                        {fatVar !== 0 ? (fatVar > 0 ? '+' : '') + fatVar.toFixed(2) : '0.00'}
                      </Text>
                      <Text style={[styles.paymentTableCell, { width: 60, color: fatKgVar < 0 ? colors.error[600] : fatKgVar > 0 ? colors.success[600] : colors.text.tertiary }]}>
                        {fatKgVar !== 0 ? (fatKgVar > 0 ? '+' : '') + fatKgVar.toFixed(2) : '0.00'}
                      </Text>
                      <Text style={[styles.paymentTableCell, { width: 60, color: snfVar < 0 ? colors.error[600] : snfVar > 0 ? colors.success[600] : colors.text.tertiary }]}>
                        {snfVar !== 0 ? (snfVar > 0 ? '+' : '') + snfVar.toFixed(2) : '0.00'}
                      </Text>
                      <Text style={[styles.paymentTableCell, { width: 60, color: snfKgVar < 0 ? colors.error[600] : snfKgVar > 0 ? colors.success[600] : colors.text.tertiary }]}>
                        {snfKgVar !== 0 ? (snfKgVar > 0 ? '+' : '') + snfKgVar.toFixed(2) : '0.00'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: colors.success[100] }]} />
                <Text style={styles.legendText}>Original Collection at BMC</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: colors.secondary[100] }]} />
                <Text style={styles.legendText}>Dairy Verified Values</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Payment Calculation */}
        <Card variant="elevated" style={StyleSheet.flatten([styles.paymentCard, { backgroundColor: colors.warning[50] }])}>
          <Text style={StyleSheet.flatten([styles.cardTitle, { color: colors.warning[900] }])}>💰 Payment Calculation</Text>
          <View style={styles.pricingInputs}>
            <View style={styles.pricingInput}>
              <Text style={styles.pricingLabel}>Base Price per Liter (₹)</Text>
              <Input
                value={basePricePerLiter}
                onChangeText={setBasePricePerLiter}
                keyboardType="numeric"
                placeholder="50"
              />
            </View>
            <View style={styles.pricingInput}>
              <Text style={styles.pricingLabel}>Fat Price per % (₹)</Text>
              <Input
                value={fatPricePerPercent}
                onChangeText={setFatPricePerPercent}
                keyboardType="numeric"
                placeholder="2"
              />
            </View>
            <View style={styles.pricingInput}>
              <Text style={styles.pricingLabel}>SNF Price per % (₹)</Text>
              <Input
                value={snfPricePerPercent}
                onChangeText={setSnfPricePerPercent}
                keyboardType="numeric"
                placeholder="1"
              />
            </View>
          </View>
          <View style={styles.calculationBreakdown}>
            <Text style={styles.breakdownTitle}>Calculation Breakdown:</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Milk Payment:</Text>
              <Text style={styles.breakdownValue}>
                ₹{basePricePerLiter} × {dairyTotals.milk.toFixed(2)}L = ₹{(parseFloat(basePricePerLiter) * dairyTotals.milk).toFixed(2)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Fat Bonus:</Text>
              <Text style={styles.breakdownValue}>
                ₹{fatPricePerPercent} × {dairyAvgFat.toFixed(2)}% = ₹{(parseFloat(fatPricePerPercent) * dairyAvgFat).toFixed(2)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>SNF Bonus:</Text>
              <Text style={styles.breakdownValue}>
                ₹{snfPricePerPercent} × {dairyAvgSnf.toFixed(2)}% = ₹{(parseFloat(snfPricePerPercent) * dairyAvgSnf).toFixed(2)}
              </Text>
            </View>
            <View style={styles.totalPaymentRow}>
              <Text style={styles.totalPaymentLabel}>Total Payment:</Text>
              <Text style={styles.totalPaymentValue}>₹{totalPrice.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.paymentNote}>
            <Text style={styles.paymentNoteText}>
              💡 <Text style={styles.paymentBoldText}>Note:</Text> Payment is calculated based on dairy-verified milk quantities (At Dairy values).
            </Text>
          </View>
        </Card>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  loadingText: {
    fontSize: typography.fontSize.lg,
    color: colors.text.tertiary,
    marginTop: spacing.md,
    fontWeight: typography.fontWeight.medium,
  },
  content: {
    padding: spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 0,
    overflow: 'hidden',
  },
  statCardInner: {
    padding: spacing.lg,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  statValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
    color: colors.text.inverse,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.inverse,
    textAlign: 'center',
    opacity: 0.95,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: 0.3,
  },
  actionsCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
  },
  notificationsCard: {
    marginBottom: spacing.lg,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  notificationItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  notificationMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  notificationTime: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  tripsCard: {
    marginBottom: spacing.lg,
  },
  tripItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  tripItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tripDate: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  tripRoute: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  tripDriver: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  tripTime: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  driverOverviewCard: {
    marginBottom: spacing.lg,
  },
  driversGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  driverCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.sm,
  },
  driverCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  driverPhone: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  viewTripsButton: {
    paddingHorizontal: spacing.sm,
  },
  viewTripsText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.medium,
  },
  driverStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  driverStatItem: {
    alignItems: 'center',
  },
  driverStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  driverStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  notificationsList: {
    maxHeight: 400,
  },
  notificationDetails: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  notificationDetailText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  notificationDetailValue: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  varianceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  varianceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  varianceValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  emptyNotifications: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyNotificationsText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.border.light,
  },
  tableHeaderText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  tableCell: {
    paddingHorizontal: spacing.xs,
  },
  tableCellText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  tableCellSubText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  monoText: {
    fontFamily: 'monospace',
  },
  boldText: {
    fontWeight: typography.fontWeight.semibold,
  },
  actionsCell: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  viewButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deleteButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: spacing.md,
  },
  tripDetails: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  bmcEntriesSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.border.light,
  },
  bmcEntry: {
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  bmcName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  bmcQuantity: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
    marginBottom: spacing.xs,
  },
  bmcTime: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  deleteModalContent: {
    padding: spacing.md,
  },
  deleteModalText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  deleteModalButton: {
    minWidth: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderInfo: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  modalHeaderText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  modalSubHeader: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  paymentBoldText: {
    fontWeight: typography.fontWeight.semibold,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  summaryCard: {
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success[200],
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  comparisonCard: {
    marginBottom: spacing.lg,
  },
  comparisonHeader: {
    marginBottom: spacing.md,
  },
  comparisonSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: colors.border.light,
  },
  tableHeaderCell: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  greenHeader: {
    backgroundColor: colors.success[50],
    color: colors.success[700],
  },
  purpleHeader: {
    backgroundColor: colors.secondary[50],
    color: colors.secondary[700],
  },
  tableSubHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tableSubHeaderCell: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  paymentTableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  paymentTableCell: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  greenCell: {
    backgroundColor: colors.success[50],
  },
  purpleCell: {
    backgroundColor: colors.secondary[50],
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
  },
  legendText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  paymentCard: {
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.warning[200],
  },
  pricingInputs: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  pricingInput: {
    marginBottom: spacing.sm,
  },
  pricingLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  calculationBreakdown: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning[300],
    marginBottom: spacing.md,
  },
  breakdownTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  breakdownLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  breakdownValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: 'monospace',
    color: colors.text.primary,
  },
  totalPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  totalPaymentLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.success[700],
  },
  totalPaymentValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.success[700],
  },
  paymentNote: {
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  paymentNoteText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[800],
  },
});

export default MilkTruckOwnerDashboard;
