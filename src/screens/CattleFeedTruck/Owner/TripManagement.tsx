import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, Animated, StatusBar, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../../../contexts/ToastContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';

interface Trip {
  _id: string;
  date?: string;
  createdAt?: string;
  from?: string;
  to?: string;
  status?: string;
  driverId?: any;
  vehicleId?: any;
  routeId?: any;
  tripDetails?: any;
  deliveryEntries?: any[];
  summary?: any;
  startTime?: string;
  endTime?: string;
}

const TripManagement: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
      loadNotifications();
    }, [])
  );

  useEffect(() => {
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

    // Pulse animation for live indicator
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    if (autoRefresh) pulse.start();
    else pulse.stop();

    return () => pulse.stop();
  }, [autoRefresh]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchData(true);
        loadNotifications();
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadNotifications = async () => {
    try {
      const notifsJson = await AsyncStorage.getItem('cattleFeedTruckOwnerNotifications');
      const notifs = notifsJson ? JSON.parse(notifsJson) : [];
      setNotifications(notifs.slice(0, 10)); // Keep only latest 10 for performance
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const clearNotifications = async () => {
    try {
      await AsyncStorage.removeItem('cattleFeedTruckOwnerNotifications');
      setNotifications([]);
      toast.success('Live alerts cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await cattleFeedTruckAPI.getTrips(user?.id);
      const data = Array.isArray(response) ? response : (Array.isArray(response.data) ? response.data : []);
      setTrips(data);
    } catch (error: any) {
      console.error('Error fetching trips:', error);
      if (!silent) toast.error('Connection to fleet lost');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleCreate = () => {
    navigation.navigate('ManageTrip');
  };

  const getStatusInfo = (status?: string) => {
    switch (status) {
      case 'pending': return { label: 'O-ASSIGNED', color: '#B45309', bg: '#FEF3C7', icon: '⏳' };
      case 'loading': return { label: 'LOADING', color: '#1D4ED8', bg: '#DBEAFE', icon: '🏗️' };
      case 'in_transit': return { label: 'IN TRANSIT', color: '#7E22CE', bg: '#F3E8FF', icon: '🚛' };
      case 'completed': return { label: 'FINISHED', color: '#15803D', bg: '#DCFCE7', icon: '✅' };
      case 'cancelled': return { label: 'CANCELLED', color: '#B91C1C', bg: '#FEE2E2', icon: '❌' };
      default: return { label: status?.toUpperCase() || 'UNKNOWN', color: '#374151', bg: '#F3F4F6', icon: '❓' };
    }
  };

  const calculateDeliveredBags = (trip: Trip) => {
    if (trip.deliveryEntries && trip.deliveryEntries.length > 0) {
      return trip.deliveryEntries.reduce((sum, entry) => {
        const actualDelivery = entry.actualDelivery;
        if (actualDelivery && actualDelivery.feedItems) {
          return sum + actualDelivery.feedItems.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
        }
        return sum;
      }, 0);
    }
    return 0;
  };

  const getTotalBags = (trip: Trip) => {
    return trip.summary?.totalQuantityLoaded || trip.tripDetails?.totalBags || 0;
  };

  const toggleTripExpansion = (tripId: string) => {
    setExpandedTrips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tripId)) newSet.delete(tripId);
      else newSet.add(tripId);
      return newSet;
    });
  };

  const filteredTrips = trips.filter(trip => {
    if (filter === 'all') return true;
    return trip.status === filter;
  });

  const StatusChip = ({ status, active }: { status: string, active: boolean }) => (
    <TouchableOpacity
      onPress={() => setFilter(status)}
      style={[
        styles.filterChip,
        active && styles.filterChipActive,
        active && { backgroundColor: getStatusInfo(status === 'all' ? 'completed' : status).bg }
      ]}
    >
      <Text style={[styles.filterChipText, active && { color: getStatusInfo(status === 'all' ? 'completed' : status).color }]}>
        {status.replace('_', ' ').toUpperCase()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={[colors.primary[600], colors.primary[400], colors.background.primary]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
      />

      <View style={styles.headerSpacer} />

      <ScreenHeader
        title="Fleet Operations"
        subtitle="Live tracking and dispatcher"
        transparent
        titleStyle={{ color: '#fff' }}
        subtitleStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
        rightAction={
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={[styles.headerIconBtn, !autoRefresh && styles.headerIconBtnOff]}
              onPress={() => setAutoRefresh(!autoRefresh)}
            >
              <Animated.View style={{ opacity: pulseAnim }}>
                <Text style={styles.headerIconText}>{autoRefresh ? '📡' : '💤'}</Text>
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerNewBtn}
              onPress={handleCreate}
            >
              <Text style={styles.headerNewBtnText}>+ New Load</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Persistent Live Indicator */}
      <View style={styles.liveToolbar}>
        <View style={styles.liveIndicator}>
          <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
          <Text style={styles.liveLabel}>
            {autoRefresh ? "SYSTEM ONLINE - SYNCING" : "LIVE FEED PAUSED"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowNotifications(!showNotifications)}>
          <Text style={styles.alertsLabel}>
            ALERTS {notifications.length > 0 ? `(${notifications.length})` : ''} {showNotifications ? '▼' : '▲'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Notifications Panel */}
          {showNotifications && (
            <View style={styles.notificationsWrapper}>
              <Card style={styles.notificationsCard}>
                <View style={styles.notifHeader}>
                  <Text style={styles.notifTitle}>Dispatch Intelligence</Text>
                  <TouchableOpacity onPress={clearNotifications}>
                    <Text style={styles.notifClear}>Clear Feed</Text>
                  </TouchableOpacity>
                </View>
                {notifications.length === 0 ? (
                  <View style={styles.notifEmpty}>
                    <Text style={styles.notifEmptyText}>No recent alerts from the field</Text>
                  </View>
                ) : (
                  notifications.map((notif, idx) => (
                    <View key={notif.id || idx} style={styles.notifItem}>
                      <View style={styles.notifIcon}>
                        <Text style={{ fontSize: 14 }}>{notif.type === 'trip_completed' ? '🏆' : '📦'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notifMsg}>{notif.message}</Text>
                        <Text style={styles.notifTime}>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Trip #{notif.tripNumber}</Text>
                      </View>
                    </View>
                  ))
                )}
              </Card>
            </View>
          )}

          {/* Filters Bar */}
          <HorizontalGrid style={styles.filtersBar}>
            <StatusChip status="all" active={filter === 'all'} />
            <StatusChip status="pending" active={filter === 'pending'} />
            <StatusChip status="loading" active={filter === 'loading'} />
            <StatusChip status="in_transit" active={filter === 'in_transit'} />
            <StatusChip status="completed" active={filter === 'completed'} />
          </HorizontalGrid>

          {loading && !refreshing && (
            <View style={styles.centralLoader}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
            </View>
          )}

          {!loading && filteredTrips.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🚛💨</Text>
              <Text style={styles.emptyTitle}>Fleet Idle</Text>
              <Text style={styles.emptySub}>No active shipments found for this status.</Text>
              <Button onPress={handleCreate} style={styles.emptyBtn}>Start Dispatch</Button>
            </View>
          ) : (
            <View style={styles.tripList}>
              {filteredTrips.map((trip) => {
                const s = getStatusInfo(trip.status);
                const delivered = calculateDeliveredBags(trip);
                const total = getTotalBags(trip);
                const isExpanded = expandedTrips.has(trip._id);
                const progress = total > 0 ? (delivered / total) : 0;

                return (
                  <View key={trip._id} style={styles.tripCardContainer}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => toggleTripExpansion(trip._id)}
                      style={[styles.tripCard, isExpanded && styles.tripCardActive]}
                    >
                      <View style={styles.tripTop}>
                        <View style={styles.tripHeading}>
                          <View style={styles.truckIcon}>
                            <Text style={{ fontSize: 20 }}>{s.icon}</Text>
                          </View>
                          <View>
                            <Text style={styles.truckPlate}>{trip.vehicleId?.registrationNumber || 'NO-PLATE'}</Text>
                            <Text style={styles.driverName}>{trip.driverId?.name || 'Unassigned'}</Text>
                          </View>
                        </View>
                        <View style={[styles.statusBox, { backgroundColor: s.bg }]}>
                          <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                        </View>
                      </View>

                      <View style={styles.routeBox}>
                        <View style={styles.routePoint}>
                          <View style={styles.routeDot} />
                          <Text style={styles.routeText}>{trip.from || 'Warehouse'}</Text>
                        </View>
                        <View style={styles.routeLine} />
                        <View style={styles.routePoint}>
                          <View style={[styles.routeDot, { backgroundColor: colors.primary[500] }]} />
                          <Text style={styles.routeText}>{trip.to || 'Last Stop'}</Text>
                        </View>
                      </View>

                      <View style={styles.progressSection}>
                        <View style={styles.progressLabelRow}>
                          <Text style={styles.progressLabel}>Loading Progress</Text>
                          <Text style={styles.progressValue}>{delivered} / {total} Bags</Text>
                        </View>
                        <View style={styles.barBg}>
                          <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: progress >= 1 ? colors.success[500] : colors.primary[500] }]} />
                        </View>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaText}>📅 {new Date(trip.date || trip.createdAt || '').toLocaleDateString()}</Text>
                          <Text style={styles.metaText}>📍 {trip.deliveryEntries?.length || 0} Drop-offs</Text>
                          <Text style={styles.metaText}>🛣️ {(trip.summary?.totalKm || trip.tripDetails?.distance || 0).toFixed(1)} km</Text>
                        </View>
                      </View>

                      {isExpanded && (
                        <View style={styles.expansionPanel}>
                          <TouchableOpacity
                            style={styles.viewPathBtn}
                            onPress={() => navigation.navigate('CattleFeedTruckOwnerTripDetail', { tripId: trip._id })}
                          >
                            <Text style={styles.viewPathBtnText}>View path on map</Text>
                          </TouchableOpacity>
                          <View style={styles.expansionDivider} />
                          <View style={styles.expandedGrid}>
                            <View style={styles.expandedItem}>
                              <Text style={styles.expandedLabel}>Start Log</Text>
                              <Text style={styles.expandedValue}>{trip.startTime ? new Date(trip.startTime).toLocaleTimeString() : '---'}</Text>
                            </View>
                            <View style={styles.expandedItem}>
                              <Text style={styles.expandedLabel}>Current KM</Text>
                              <Text style={styles.expandedValue}>{trip.summary?.totalKm || trip.tripDetails?.distance || 0} km</Text>
                            </View>
                            <View style={styles.expandedItem}>
                              <Text style={styles.expandedLabel}>Delivered</Text>
                              <Text style={[styles.expandedValue, { color: colors.success[600] }]}>{trip.summary?.totalQuantityDelivered || delivered}</Text>
                            </View>
                            <View style={styles.expandedItem}>
                              <Text style={styles.expandedLabel}>Drops Done</Text>
                              <Text style={styles.expandedValue}>{trip.summary?.numberOfCompletedDeliveries || 0} / {trip.deliveryEntries?.length || 0}</Text>
                            </View>
                          </View>

                          {trip.deliveryEntries && trip.deliveryEntries.length > 0 && (
                            <View style={styles.miniList}>
                              <Text style={styles.miniListTitle}>Recent Drop Log</Text>
                              {trip.deliveryEntries.slice(0, 3).map((e, i) => (
                                <View key={i} style={styles.miniListItem}>
                                  <Text style={styles.miniListPlace} numberOfLines={1}>{e.deliveryPointId?.name || e.location || 'Unknown Point'}</Text>
                                  <Text style={[styles.miniListStatus, { color: e.actualDelivery?.deliveredAt ? colors.success[600] : colors.text.tertiary }]}>
                                    {e.actualDelivery?.deliveredAt ? 'DELIVERED' : 'PENDING'}
                                  </Text>
                                </View>
                              ))}
                              {trip.deliveryEntries.length > 3 && (
                                <Text style={styles.miniListMore}>+ {trip.deliveryEntries.length - 3} more locations</Text>
                              )}
                            </View>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

// Helper component for horizontal list
const HorizontalGrid = ({ children, style }: any) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={style}
  >
    {children}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  headerSpacer: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerIconBtnOff: {
    opacity: 0.6,
  },
  headerIconText: {
    fontSize: 18,
  },
  headerNewBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: borderRadius.full,
    ...shadows.md,
  },
  headerNewBtnText: {
    color: colors.primary[700],
    fontWeight: 'bold',
    fontSize: 14,
  },
  liveToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success[500],
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  alertsLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  notificationsWrapper: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  notificationsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text.primary,
    textTransform: 'uppercase',
  },
  notifClear: {
    fontSize: 12,
    color: colors.primary[600],
    fontWeight: '600',
  },
  notifItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  notifIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifMsg: {
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: '500',
  },
  notifTime: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  notifEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  notifEmptyText: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  filtersBar: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterChipActive: {
    ...shadows.md,
    borderColor: 'transparent',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  centralLoader: {
    paddingVertical: 100,
    alignItems: 'center',
  },
  tripList: {
    paddingHorizontal: spacing.md,
    gap: 16,
  },
  tripCardContainer: {
    ...shadows.md,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.md,
  },
  tripCardActive: {
    borderColor: colors.primary[200],
    ...shadows.lg,
    transform: [{ scale: 1.01 }],
  },
  tripTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tripHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  truckIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  truckPlate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  driverName: {
    fontSize: 13,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  statusBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.medium,
  },
  routeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    maxWidth: 100,
  },
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
    marginHorizontal: 10,
    borderStyle: 'dashed',
  },
  progressSection: {
    gap: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text.primary,
  },
  barBg: {
    height: 8,
    backgroundColor: colors.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  expansionPanel: {
    marginTop: 16,
  },
  viewPathBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    marginBottom: 12,
  },
  viewPathBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[600],
  },
  expansionDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginBottom: 16,
  },
  expandedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  expandedItem: {
    width: '45%',
  },
  expandedLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  expandedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  miniList: {
    marginTop: 20,
    backgroundColor: colors.background.tertiary,
    padding: 12,
    borderRadius: 12,
  },
  miniListTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.text.secondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  miniListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
  },
  miniListPlace: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  miniListStatus: {
    fontSize: 10,
    fontWeight: '800',
  },
  miniListMore: {
    fontSize: 10,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    paddingHorizontal: 60,
    marginBottom: 30,
  },
  emptyBtn: {
    width: 200,
    backgroundColor: '#fff',
  },
});

export default TripManagement;
