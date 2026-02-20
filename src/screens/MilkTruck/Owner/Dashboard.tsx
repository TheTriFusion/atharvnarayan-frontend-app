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
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(true); // Default to expanded for better visibility

  // 3D Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const quickActionsRotate = useRef(new Animated.Value(0)).current;
  const quickActionsScale = useRef(new Animated.Value(0)).current; // For staggered entrance
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
      Animated.timing(quickActionsScale, {
        toValue: 1,
        duration: 800,
        delay: 300,
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
                  const toValue = quickActionsExpanded ? 0 : 1;
                  Animated.parallel([
                    Animated.spring(quickActionsRotate, {
                      toValue,
                      tension: 100,
                      friction: 8,
                      useNativeDriver: true,
                    }),
                    Animated.timing(quickActionsScale, {
                      toValue,
                      duration: 400,
                      useNativeDriver: true,
                    })
                  ]).start();
                  setQuickActionsExpanded(!quickActionsExpanded);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.sectionTitleContainer}>
                  <LinearGradient
                    colors={[colors.primary[600], colors.primary[400]]}
                    style={styles.sectionIconTitle}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.sectionIconEmoji}>⚡</Text>
                  </LinearGradient>
                  <Text style={styles.sectionTitle}>Quick Actions</Text>
                </View>
                <Animated.View
                  style={[
                    styles.accordionIconWrapper,
                    {
                      transform: [
                        {
                          rotate: quickActionsRotate.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '180deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.accordionIcon}>▼</Text>
                </Animated.View>
              </TouchableOpacity>
              {quickActionsExpanded && (
                <View style={styles.actionsGridContainer}>
                  <View style={styles.actionsGrid}>
                    {[
                      { label: 'BMCs', icon: '🏭', color: ['#6366F1', '#4F46E5'], screen: 'MilkTruckOwnerBMCs' },
                      { label: 'Vehicles', icon: '🚚', color: ['#0EA5E9', '#0284C7'], screen: 'MilkTruckOwnerVehicles' },
                      { label: 'Drivers', icon: '👥', color: ['#8B5CF6', '#7C3AED'], screen: 'MilkTruckOwnerDrivers' },
                      { label: 'Routes', icon: '🛣️', color: ['#10B981', '#059669'], screen: 'MilkTruckOwnerRoutes' },
                      { label: 'Pricing', icon: '💰', color: ['#F59E0B', '#D97706'], screen: 'MilkTruckOwnerPricing' },
                      { label: 'Alerts', icon: '🗑️', color: ['#EF4444', '#DC2626'], action: clearNotifications, isDanger: true },
                    ].map((action, index) => (
                      <Animated.View
                        key={index}
                        style={[
                          styles.actionItem,
                          {
                            opacity: quickActionsScale,
                            transform: [
                              { scale: quickActionsScale },
                              {
                                translateY: quickActionsScale.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [20, 0],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.actionButtonPremium}
                          onPress={() => {
                            if (action.action) {
                              action.action();
                            } else if (action.screen) {
                              navigation.navigate(action.screen);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <LinearGradient
                            colors={action.color}
                            style={styles.actionIconGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Text style={styles.actionIconText}>{action.icon}</Text>
                          </LinearGradient>
                          <Text style={[styles.actionLabelText, action.isDanger && { color: colors.error[600] }]}>
                            {action.label}
                          </Text>
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </View>
                </View>
              )}
            </Card>
          </Animated.View>

          {/* Real-time Notifications & Map Section */}
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
                <View style={styles.sectionTitleContainer}>
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.sectionIconTitle}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.sectionIconEmoji}>📡</Text>
                  </LinearGradient>
                  <Text style={styles.sectionTitle}>Live Fleet Tracking</Text>
                </View>
                {notifications.length > 0 && (
                  <TouchableOpacity onPress={clearNotifications} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Mock Map UI */}
              <View style={styles.mapPlaceholderWrapper}>
                <LinearGradient
                  colors={['#E0F2FE', '#F0F9FF']}
                  style={styles.mockMap}
                >
                  {/* Grid Lines */}
                  {[...Array(5)].map((_, i) => (
                    <View key={`v-${i}`} style={[styles.mapGridLineV, { left: `${(i + 1) * 20}%` }]} />
                  ))}
                  {[...Array(4)].map((_, i) => (
                    <View key={`h-${i}`} style={[styles.mapGridLineH, { top: `${(i + 1) * 20}%` }]} />
                  ))}

                  {/* Route Paths */}
                  <View style={styles.mapRouteLine} />

                  {/* Active Trucks / Points */}
                  <View style={[styles.mapPoint, { top: '30%', left: '40%' }]}>
                    <View style={styles.pingAnimation} />
                    <View style={styles.pointDot} />
                    <View style={styles.pointLabel}>
                      <Text style={styles.pointLabelText}>Mh1987</Text>
                    </View>
                  </View>

                  <View style={[styles.mapPoint, { top: '60%', left: '70%', opacity: 0.6 }]}>
                    <View style={[styles.pointDot, { backgroundColor: colors.primary[400] }]} />
                    <View style={styles.pointLabel}>
                      <Text style={styles.pointLabelText}>Mh4567</Text>
                    </View>
                  </View>

                  <View style={styles.mapOverlayIcon}>
                    <Text style={styles.mapOverlayEmoji}>📍</Text>
                  </View>
                </LinearGradient>
              </View>

              <Text style={styles.realTimeUpdateLabel}>RECENT ACTIVITY</Text>

              {notifications.length > 0 ? (
                <ScrollView style={styles.notificationsList} nestedScrollEnabled>
                  {notifications.map((notif: any) => (
                    <View key={notif.id} style={styles.notificationItem}>
                      <View style={styles.notifHeaderMain}>
                        <View style={styles.notifStatusPulse} />
                        <Text style={styles.notificationMessage}>{notif.message}</Text>
                      </View>

                      {/* Handle notification format */}
                      {(notif.totals || notif.summary) && (
                        <View style={styles.notificationDetails}>
                          <View style={styles.notifStatRow}>
                            <View style={styles.notifStat}>
                              <Text style={styles.notifStatLabel}>TOTAL MILK</Text>
                              <Text style={styles.notifStatValue}>
                                {(notif.totals?.totalMilk || notif.summary?.totalMilk)?.toFixed(2) || '0.00'}L
                              </Text>
                            </View>
                            <View style={styles.notifStat}>
                              <Text style={styles.notifStatLabel}>EXPENSES</Text>
                              <Text style={styles.notifStatValue}>
                                ₹{(notif.totals?.totalExpenses || notif.summary?.totalExpenses)?.toFixed(2) || '0.00'}
                              </Text>
                            </View>
                            {notif.variance && (
                              <View style={styles.notifStat}>
                                <Text style={styles.notifStatLabel}>VARIANCE</Text>
                                <Text style={[
                                  styles.notifStatValue,
                                  { color: notif.variance.milk < 0 ? colors.error[600] : colors.success[600] }
                                ]}>
                                  {notif.variance.milk > 0 ? '+' : ''}{notif.variance.milk?.toFixed(2) || '0.00'}L
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )}

                      <Text style={styles.notificationTime}>
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyNotifications}>
                  <Text style={styles.emptyNotificationsText}>
                    Awaiting live updates from BMC network...
                  </Text>
                </View>
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
                <View style={styles.sectionTitleContainer}>
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED']}
                    style={styles.sectionIconTitle}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.sectionIconEmoji}>👥</Text>
                  </LinearGradient>
                  <Text style={styles.sectionTitle}>Driver Overview</Text>
                </View>
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
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconTitle: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionIconEmoji: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
  },
  accordionIconWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accordionIcon: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
  },
  actionsGridContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primary[50],
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionItem: {
    width: '31%',
    marginBottom: spacing.md,
  },
  actionButtonPremium: {
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary[50],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconGradient: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  actionIconText: {
    fontSize: 18,
  },
  actionLabelText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    textAlign: 'center',
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
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[50],
  },
  notifHeaderMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  notifStatusPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success[500],
  },
  notificationMessage: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary[900],
    flex: 1,
  },
  notifStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  notifStat: {
    flex: 1,
  },
  notifStatLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  notifStatValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary[700],
  },
  notificationTime: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'right',
    fontWeight: '500',
  },
  mapPlaceholderWrapper: {
    height: 140,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary[50],
  },
  mockMap: {
    flex: 1,
    position: 'relative',
  },
  mapGridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  mapGridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  mapRouteLine: {
    position: 'absolute',
    top: '40%',
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 2,
    transform: [{ rotate: '25deg' }],
  },
  mapPoint: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[600],
    borderWidth: 2,
    borderColor: 'white',
  },
  pingAnimation: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary[400],
    opacity: 0.3,
  },
  pointLabel: {
    position: 'absolute',
    top: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    ...shadows.sm,
  },
  pointLabelText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.primary[900],
  },
  mapOverlayIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'white',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  mapOverlayEmoji: {
    fontSize: 14,
  },
  realTimeUpdateLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primary[500],
    letterSpacing: 1.5,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  clearBtn: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  clearBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary[600],
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[50],
    ...shadows.sm,
  },
  driverCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 14,
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
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
  },
  driverStatItem: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  statIconBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconMini: {
    fontSize: 12,
  },
  driverStatValue: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  driverStatLabel: {
    fontSize: 9,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
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
