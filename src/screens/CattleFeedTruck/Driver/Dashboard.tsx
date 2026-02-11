import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity, Animated, Dimensions, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import ProfileMenu from '../../../components/common/ProfileMenu';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

const { width } = Dimensions.get('window');

interface Trip {
  _id: string;
  date?: string;
  createdAt?: string;
  from?: string;
  to?: string;
  status?: string;
  vehicleId?: any;
  driverId?: any;
  tripDetails?: any;
  deliveryEntries?: any[];
  deliveries?: any[];
  summary?: any;
  endTime?: string;
  updatedAt?: string;
  distance?: number | string;
}

interface Vehicle {
  _id: string;
  registrationNumber: string;
  vehicleType?: string;
}

const CattleFeedTruckDriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchData = async () => {
    try {
      const [tripsRes, vehiclesRes] = await Promise.all([
        cattleFeedTruckAPI.getTrips(),
        cattleFeedTruckAPI.getVehicles(),
      ]);

      const tripsData = Array.isArray(tripsRes) ? tripsRes : (Array.isArray(tripsRes?.data) ? tripsRes.data : []);
      const vehiclesData = Array.isArray(vehiclesRes) ? vehiclesRes : (Array.isArray(vehiclesRes?.data) ? vehiclesRes.data : []);

      setTrips(tripsData);
      setVehicles(vehiclesData);

      // Start entry animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      fadeAnim.setValue(0);
      fetchData();

      const checkActiveTrip = async () => {
        try {
          const tripsRes = await cattleFeedTruckAPI.getTrips();
          const tripsArray = Array.isArray(tripsRes) ? tripsRes : (Array.isArray(tripsRes?.data) ? tripsRes.data : []);
          const userId = user?._id || user?.id;

          const activeTrip = tripsArray.find((trip: Trip) => {
            const driverId = trip.driverId?._id || trip.driverId;
            return driverId && userId && driverId.toString() === userId.toString() &&
              (trip.status === 'loading' || trip.status === 'in_transit');
          });

          if (activeTrip && isActive) {
            navigation.replace('CattleFeedTruckDriverActiveTrip');
          }
        } catch (error) {
          console.error('Error checking active trip:', error);
        }
      };

      if (user) {
        checkActiveTrip();
      }

      return () => {
        isActive = false;
      };
    }, [user, navigation])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleStartTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    setShowStartModal(true);
  };

  const startTripFromModal = async () => {
    if (!selectedTripId) return;

    try {
      await cattleFeedTruckAPI.updateTrip(selectedTripId, { status: 'in_transit', startTime: new Date() });
      setShowStartModal(false);
      toast.success('Trip started! Navigating to active trip...');
      setTimeout(() => {
        navigation.replace('CattleFeedTruckDriverActiveTrip');
      }, 500);
    } catch (error: any) {
      console.error('Error starting trip:', error);
      toast.error('Error starting trip');
    }
  };

  const userId = user?._id || user?.id;
  const myTrips = trips.filter(trip => {
    if (!userId) return false;
    const driverId = trip.driverId?._id || trip.driverId;
    return driverId && driverId.toString() === userId.toString();
  });

  const pendingTrips = myTrips.filter(t => t.status === 'pending');
  const completedTrips = myTrips.filter(t => t.status === 'completed').sort((a, b) => {
    const dateA = new Date(a.endTime || a.updatedAt || a.createdAt || '').getTime();
    const dateB = new Date(b.endTime || b.updatedAt || b.createdAt || '').getTime();
    return dateB - dateA;
  });

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [200, 140],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const renderTripItem = (item: Trip, index: number) => {
    const itemFade = fadeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const itemTranslateY = fadeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [20 + index * 10, 0],
    });

    const deliveredBags = item.deliveryEntries?.reduce((sum, entry) => {
      const actualDelivery = entry.actualDelivery;
      if (actualDelivery && actualDelivery.feedItems) {
        return sum + actualDelivery.feedItems.reduce((itemSum: number, i: any) => itemSum + (i.quantity || 0), 0);
      }
      return sum;
    }, 0) || 0;
    const totalBags = item.summary?.totalQuantityLoaded || item.tripDetails?.totalBags || 0;

    return (
      <Animated.View
        key={item._id}
        style={{
          opacity: itemFade,
          transform: [{ translateY: itemTranslateY }]
        }}
      >
        <Card variant="elevated" style={styles.tripCard}>
          <View style={styles.tripCardContent}>
            <View style={styles.tripInfoSection}>
              <View style={styles.tripHeaderRow}>
                <Text style={styles.tripIdText}>#{item._id.substring(item._id.length - 6)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? colors.success[50] : colors.warning[50] }]}>
                  <Text style={[styles.statusBadgeText, { color: item.status === 'completed' ? colors.success[700] : colors.warning[700] }]}>
                    {item.status?.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.tripRouteText}>{item.from} → {item.to}</Text>
              <Text style={styles.tripDateText}>
                📅 {new Date(item.date || item.createdAt || '').toLocaleDateString()}
              </Text>
              <Text style={styles.tripVehicleText}>🚛 {item.vehicleId?.registrationNumber || 'No Vehicle'}</Text>
            </View>

            <View style={styles.tripStatsSection}>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>📦 {deliveredBags}/{totalBags} Bags</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>📍 {item.deliveryEntries?.length || 0} Locs</Text>
              </View>
            </View>
          </View>
        </Card>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Custom Premium Header */}
      <Animated.View style={[styles.headerContainer, { height: headerHeight, opacity: headerOpacity }]}>
        <LinearGradient
          colors={[colors.secondary[800], colors.secondary[900]]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerWelcomeLabel}>DELIVERY DRIVER,</Text>
              <Text style={styles.headerWelcomeValue}>{user?.name?.toUpperCase()}</Text>
            </View>
            <ProfileMenu />
          </View>

          <View style={styles.headerBottom}>
            <View style={styles.dateContainer}>
              <Text style={styles.headerDateText}>
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondary[500]}
            colors={[colors.secondary[500]]}
          />
        }
      >
        {/* Dashboard Stats */}
        <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ scale: fadeAnim }] }]}>
          <Card style={styles.statBox}>
            <Text style={styles.statValue}>{myTrips.length}</Text>
            <Text style={styles.statLabel}>TOTAL TRIPS</Text>
          </Card>
          <Card style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.success[600] }]}>{completedTrips.length}</Text>
            <Text style={styles.statLabel}>COMPLETED</Text>
          </Card>
          <Card style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.warning[600] }]}>
              {myTrips.filter(t => {
                const tripDate = new Date(t.date || t.createdAt || '').toDateString();
                const today = new Date().toDateString();
                return tripDate === today;
              }).length}
            </Text>
            <Text style={styles.statLabel}>TODAY</Text>
          </Card>
        </Animated.View>

        {/* Main Action Button */}
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            })
          }]
        }}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.primaryActionButton}
            onPress={() => navigation.navigate('CattleFeedTruckDriverCreateTrip')}
          >
            <LinearGradient
              colors={[colors.primary[500], colors.primary[700]]}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.actionButtonIcon}>🚀</Text>
              <Text style={styles.actionButtonText}>CREATE NEW DELIVERY TRIP</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Pending Trips */}
        {pendingTrips.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIndicator} />
              <Text style={styles.sectionTitle}>PENDING TRIPS</Text>
            </View>
            {pendingTrips.map((trip) => (
              <Card key={trip._id} variant="elevated" style={styles.pendingTripCard}>
                <View style={styles.tripHeaderRow}>
                  <Text style={[styles.tripIdText, { color: colors.text.primary }]}>Trip #{trip._id.substring(trip._id.length - 6)}</Text>
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => handleStartTrip(trip._id)}
                  >
                    <Text style={styles.startButtonText}>Start Trip</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.tripRouteText}>{trip.from} → {trip.to}</Text>
                <View style={styles.pendingDetailsRow}>
                  <Text style={styles.pendingDetailText}>📅 {new Date(trip.date || trip.createdAt || '').toLocaleDateString()}</Text>
                  <Text style={styles.pendingDetailText}>📦 {trip.tripDetails?.totalBags || 0} Bags</Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Recent History */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIndicator, { backgroundColor: colors.secondary[400] }]} />
            <Text style={styles.sectionTitle}>RECENT COMPLETED TRIPS</Text>
          </View>

          {completedTrips.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Text style={styles.emptyIcon}>📦</Text>
              </View>
              <Text style={styles.emptyTitle}>No Completed Trips</Text>
              <Text style={styles.emptySubtitle}>Your finished delivery trips will appear here.</Text>
            </View>
          ) : (
            completedTrips.slice(0, 10).map((trip, index) => renderTripItem(trip, index))
          )}
        </View>

        <View style={styles.footerSpacing} />
      </Animated.ScrollView>

      {/* Premium Start Trip Modal */}
      {selectedTripId && (
        <Modal
          visible={showStartModal}
          onClose={() => setShowStartModal(false)}
          title="Start Trip"
          subtitle="Confirm your vehicle and route"
          icon="🚚"
          footer={
            <View style={styles.modalFooter}>
              <Button
                onPress={() => setShowStartModal(false)}
                variant="secondary"
                style={[styles.modalBtn, { marginRight: spacing.md }]}
              >
                Cancel
              </Button>
              <Button
                onPress={startTripFromModal}
                style={styles.modalBtn}
              >
                Start Now
              </Button>
            </View>
          }
        >
          {(() => {
            const trip = trips.find(t => t._id === selectedTripId);
            if (!trip) return null;
            return (
              <View style={styles.startModalContent}>
                <View style={styles.tripSummaryCard}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>VEHICLE</Text>
                    <Text style={styles.summaryValue}>{trip.vehicleId?.registrationNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>ROUTE</Text>
                    <Text style={styles.summaryValue}>{trip.from} → {trip.to}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>LOAD</Text>
                    <Text style={styles.summaryValue}>{trip.tripDetails?.totalBags || 0} Bags</Text>
                  </View>
                </View>

                <Text style={styles.disclaimerText}>
                  By starting this trip, your starting location and time will be recorded.
                </Text>
              </View>
            );
          })()}
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  headerContainer: {
    width: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerWelcomeLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
  },
  headerWelcomeValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  headerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  headerDateText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 210,
    paddingHorizontal: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  primaryActionButton: {
    width: '100%',
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  actionButtonIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  sectionContainer: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingLeft: spacing.xs,
  },
  sectionIndicator: {
    width: 4,
    height: 16,
    backgroundColor: colors.secondary[600],
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
  },
  pendingTripCard: {
    marginBottom: spacing.md,
    borderColor: colors.warning[200],
    borderWidth: 1,
  },
  startButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingDetailsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  pendingDetailText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  tripCard: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  tripCardContent: {
    padding: spacing.lg,
  },
  tripInfoSection: {
    flex: 1,
  },
  tripHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tripIdText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.tertiary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
  tripRouteText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  tripDateText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  tripVehicleText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  tripStatsSection: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statChip: {
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statChipText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  footerSpacing: {
    height: 100,
  },
  modalFooter: {
    flexDirection: 'row',
  },
  modalBtn: {
    flex: 1,
  },
  startModalContent: {
    paddingVertical: spacing.sm,
  },
  tripSummaryCard: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  summaryItem: {
    marginVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.xs,
  },
  disclaimerText: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
});

export default CattleFeedTruckDriverDashboard;
