import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Animated, StatusBar, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
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
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(false);

  // 3D Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const quickActionsRotate = useRef(new Animated.Value(0)).current;
  const driverOverviewScale = useRef(new Animated.Value(1)).current;
  const notificationsCardScale = useRef(new Animated.Value(1)).current;
  const tripsCardScale = useRef(new Animated.Value(1)).current;
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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
    loadNotifications();

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
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
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Background Gradient */}
      <LinearGradient
        colors={[colors.primary[600], colors.primary[400], colors.background.primary]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.8 }}
      />

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary[600]}
          />
        }
      >
        {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}
        <View style={styles.headerSpacer} />
        <ScreenHeader
          title="Milk Truck Management"
          subtitle="Fleet & Operations"
          transparent
        />
        <View style={styles.content}>

          {/* Quick Actions Accordion */}
          <Animated.View
            style={[
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  {
                    rotateX: quickActionsRotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '2deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Card variant="elevated" style={styles.actionsCard3D}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => {
                  Animated.spring(quickActionsRotate, {
                    toValue: quickActionsExpanded ? 0 : 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                  }).start();
                  setQuickActionsExpanded(!quickActionsExpanded);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <Animated.Text
                  style={[
                    styles.accordionIcon,
                    {
                      transform: [
                        {
                          rotate: quickActionsRotate.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '90deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {quickActionsExpanded ? '▼' : '▶'}
                </Animated.Text>
              </TouchableOpacity>
              {quickActionsExpanded && (
                <Animated.View
                  style={[
                    styles.actionsGrid,
                    {
                      opacity: quickActionsRotate.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 0.5, 1],
                      }),
                    },
                  ]}
                >
                  <View style={styles.actionItem}>
                    <TouchableOpacity
                      style={styles.actionButtonCompact}
                      onPress={() => {
                        navigation.navigate('MilkTruckOwnerBMCs');
                        setQuickActionsExpanded(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.actionIconContainer, { backgroundColor: colors.primary[50] }]}>
                        <Text style={styles.actionIcon}>🏭</Text>
                      </View>
                      <Text style={styles.actionText}>BMCs</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.actionItem}>
                    <TouchableOpacity
                      style={styles.actionButtonCompact}
                      onPress={() => {
                        navigation.navigate('MilkTruckOwnerVehicles');
                        setQuickActionsExpanded(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.actionIconContainer, { backgroundColor: '#E0F2FE' }]}>
                        <Text style={styles.actionIcon}>🚚</Text>
                      </View>
                      <Text style={styles.actionText}>Vehicles</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.actionItem}>
                    <TouchableOpacity
                      style={styles.actionButtonCompact}
                      onPress={() => {
                        navigation.navigate('MilkTruckOwnerDrivers');
                        setQuickActionsExpanded(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.actionIconContainer, { backgroundColor: '#F0F9FF' }]}>
                        <Text style={styles.actionIcon}>👥</Text>
                      </View>
                      <Text style={styles.actionText}>Drivers</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.actionItem}>
                    <TouchableOpacity
                      style={styles.actionButtonCompact}
                      onPress={() => {
                        navigation.navigate('MilkTruckOwnerRoutes');
                        setQuickActionsExpanded(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.actionIconContainer, { backgroundColor: '#E0F7FA' }]}>
                        <Text style={styles.actionIcon}>🛣️</Text>
                      </View>
                      <Text style={styles.actionText}>Routes</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.actionItem}>
                    <TouchableOpacity
                      style={styles.actionButtonCompact}
                      onPress={() => {
                        navigation.navigate('MilkTruckOwnerPricing');
                        setQuickActionsExpanded(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.actionIconContainer, { backgroundColor: '#FFF7ED' }]}>
                        <Text style={styles.actionIcon}>💰</Text>
                      </View>
                      <Text style={styles.actionText}>Pricing</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.actionItem}>
                    <TouchableOpacity
                      style={[styles.actionButtonCompact, { borderColor: colors.error[100] }]}
                      onPress={clearNotifications}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.actionIconContainer, { backgroundColor: colors.error[50] }]}>
                        <Text style={styles.actionIcon}>🗑️</Text>
                      </View>
                      <Text style={[styles.actionText, { color: colors.error[600] }]}>Clear Alerts</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}
            </Card>
          </Animated.View>

          {/* Driver Overview Section */}
          {drivers.length > 0 && (
            <Animated.View
              style={[
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { scale: driverOverviewScale },
                    {
                      rotateY: driverOverviewScale.interpolate({
                        inputRange: [0.95, 1],
                        outputRange: ['-2deg', '0deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Card variant="elevated" style={styles.driverOverviewCard3D}>
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
                      <Animated.View
                        key={driver._id || driver.id}
                        style={styles.driverCardContainer}
                      >
                        <TouchableOpacity
                          style={styles.driverCard3D}
                          activeOpacity={0.9}
                          onPress={() => handleDriverClick(driver._id || driver.id)}
                        >
                          <View style={styles.driverCardHeader}>
                            <View style={styles.avatarContainer}>
                              <Text style={styles.avatarText}>
                                {driver.name ? driver.name.split(' ').map((n: any) => n[0]).join('').toUpperCase().substring(0, 2) : 'D'}
                              </Text>
                            </View>
                            <View style={styles.driverInfo}>
                              <Text style={styles.driverName} numberOfLines={1}>{driver.name}</Text>
                              <View style={styles.phoneContainer}>
                                <Text style={styles.phoneIcon}>📞</Text>
                                <Text style={styles.driverPhone}>{driver.phoneNumber || 'N/A'}</Text>
                              </View>
                            </View>
                            <View style={styles.viewBadge}>
                              <Text style={styles.viewBadgeText}>Details</Text>
                            </View>
                          </View>
                          <View style={styles.driverStats}>
                            <View style={styles.driverStatItem}>
                              <View style={[styles.statIconBox, { backgroundColor: colors.primary[50] }]}>
                                <Text style={styles.statIconMini}>📊</Text>
                              </View>
                              <Text style={[styles.driverStatValue, { color: colors.primary[700] }]}>{totalTrips}</Text>
                              <Text style={styles.driverStatLabel}>Total</Text>
                            </View>
                            <View style={styles.driverStatItem}>
                              <View style={[styles.statIconBox, { backgroundColor: colors.success[50] }]}>
                                <Text style={styles.statIconMini}>✅</Text>
                              </View>
                              <Text style={[styles.driverStatValue, { color: colors.success[700] }]}>{completedCount}</Text>
                              <Text style={styles.driverStatLabel}>Done</Text>
                            </View>
                            <View style={styles.driverStatItem}>
                              <View style={[styles.statIconBox, { backgroundColor: colors.warning[50] }]}>
                                <Text style={styles.statIconMini}>⏳</Text>
                              </View>
                              <Text style={[styles.driverStatValue, { color: colors.warning[700] }]}>{activeTrips.length}</Text>
                              <Text style={styles.driverStatLabel}>Active</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })}
                </View>
              </Card>
            </Animated.View>
          )}

          {/* Real-time Notifications */}
          <Animated.View
            style={[
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: notificationsCardScale },
                ],
              },
            ]}
          >
            <Card variant="elevated" style={styles.notificationsCard3D}>
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
          </Animated.View>

          {/* Trip Completed History */}
          {completedTrips.length > 0 && (
            <Animated.View
              style={[
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { scale: tripsCardScale },
                  ],
                },
              ]}
            >
              <Card variant="elevated" style={styles.tripsCard3D}>
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
                              onPress={() => navigation.navigate('MilkTruckOwnerTripDetails', { tripId })}
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
            </Animated.View>
          )}
        </View>



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
    </View>
  );
};







const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.medium,
  },
  headerSpacer: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
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
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  actionsCard3D: {
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: 'white',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primary[50],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    marginBottom: spacing.lg,
  },
  accordionIcon: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  actionItem: {
    width: '31%',
    marginBottom: spacing.md,
  },
  actionButtonCompact: {
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary[50],
    ...shadows.sm,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[700],
    textAlign: 'center',
  },
  notificationsCard: {
    marginBottom: spacing.md,
  },
  notificationsCard3D: {
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: 'white',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primary[50],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  notificationItem: {
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[500],
  },
  notificationMessage: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    marginBottom: spacing.xs,
  },
  notificationTime: {
    fontSize: typography.fontSize.xs - 1,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  tripsCard: {
    marginBottom: spacing.md,
  },
  tripsCard3D: {
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: 'white',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primary[50],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
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
    marginBottom: spacing.md,
  },
  driverOverviewCard3D: {
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: 'white',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primary[50],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  driversGrid: {
    paddingTop: spacing.sm,
  },
  driverCardContainer: {
    marginBottom: spacing.md,
  },
  driverCard3D: {
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[50],
    ...shadows.md,
  },
  driverCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[700],
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    marginBottom: 2,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  driverPhone: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  viewBadge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  viewBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
    textTransform: 'uppercase',
  },
  driverStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  driverStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statIconMini: {
    fontSize: 12,
  },
  driverStatValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  driverStatLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    marginTop: 2,
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
    backgroundColor: colors.primary[50],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  tableHeaderText: {
    color: colors.primary[900],
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[50],
    backgroundColor: 'white',
  },
  tableCell: {
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[800],
    textAlign: 'center',
    fontWeight: typography.fontWeight.medium,
  },
  tableCellSubText: {
    fontSize: 10,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: typography.fontWeight.bold,
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
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[700],
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
