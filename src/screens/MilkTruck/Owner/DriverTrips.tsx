import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform, Animated, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getMilkTruckTrips, getMilkTruckBMCs, getMilkTruckVehicles, getMilkTruckDrivers, getMilkTruckRoutes } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';
import { useToast } from '../../../contexts/ToastContext';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

const MilkTruckOwnerDriverTrips: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const { error: showError } = useToast();
  const driverId = route.params?.driverId;
  const [driver, setDriver] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (driverId) {
      loadData();
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      navigation.goBack();
    }
  }, [driverId, selectedOwnerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const ownerId = isSuperAdmin ? selectedOwnerId : null;

      const [allTrips, allDrivers, vehiclesData, routesData] = await Promise.all([
        getMilkTruckTrips(ownerId),
        getMilkTruckDrivers(ownerId),
        getMilkTruckVehicles(ownerId),
        getMilkTruckRoutes(ownerId),
      ]);

      const driversArray = Array.isArray(allDrivers) ? allDrivers : [];
      const foundDriver = driversArray.find(d => (d._id || d.id) === driverId);

      if (!foundDriver) {
        showError('Driver not found');
        navigation.goBack();
        return;
      }

      setDriver(foundDriver);

      const tripsArray = Array.isArray(allTrips) ? allTrips : [];
      const driverTrips = tripsArray.filter(t => {
        const tripDriverId = t.driverId?._id || t.driverId?.id || t.driverId;
        return tripDriverId === driverId;
      });

      const sortedTrips = driverTrips.sort((a, b) => {
        const dateA = new Date(a.endTime || a.startTime || a.createdAt).getTime();
        const dateB = new Date(b.endTime || b.startTime || b.createdAt).getTime();
        return dateB - dateA;
      });

      setTrips(sortedTrips);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setRoutes(Array.isArray(routesData) ? routesData : []);
    } catch (error: any) {
      console.error('Error loading driver trips:', error);
      showError(error.message || 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const completedTrips = trips.filter(t => t.status === 'completed');
  const activeTrips = trips.filter(t => t.status === 'in_progress');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#EDE9FE', '#F5F3FF', colors.background.primary]}
        style={styles.backgroundGradient}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}

        <View style={styles.headerSpacer} />
        <ScreenHeader
          title="Mission Logs"
          subtitle={driver ? `${driver.name}'s History` : 'Driver Trips'}
          showBackButton
          transparent
        />

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {loading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator color="#8B5CF6" size="large" />
              <Text style={styles.loadingText}>Retrieving mission logs...</Text>
            </View>
          ) : (
            <>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{trips.length}</Text>
                  <Text style={styles.statLab}>TOTAL</Text>
                </View>
                <View style={[styles.statBox, styles.statBoxSuccess]}>
                  <Text style={[styles.statVal, { color: colors.success[600] }]}>{completedTrips.length}</Text>
                  <Text style={styles.statLab}>DONE</Text>
                </View>
                <View style={[styles.statBox, styles.statBoxWarning]}>
                  <Text style={[styles.statVal, { color: colors.warning[600] }]}>{activeTrips.length}</Text>
                  <Text style={styles.statLab}>LIVE</Text>
                </View>
              </View>

              {trips.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyEmoji}>📋</Text>
                  <Text style={styles.emptyText}>No trips recorded yet</Text>
                </View>
              ) : (
                <View style={styles.tripList}>
                  {trips.map((trip, index) => {
                    const vehicleReg = trip.vehicleId?.registrationNumber || vehicles.find(v => (v._id || v.id) === (trip.vehicleId?._id || trip.vehicleId?.id || trip.vehicleId))?.registrationNumber || 'N/A';
                    const routeName = trip.routeId?.name || routes.find(r => (r._id || r.id) === (trip.routeId?._id || trip.routeId?.id || trip.routeId))?.name || 'N/A';
                    const collected = trip.dairyConfirmation?.collectionTotals?.milk || trip.summary?.totalMilk || 0;
                    const dairy = trip.dairyConfirmation?.totalMilkQuantity || trip.summary?.totalMilk || 0;
                    const diff = trip.dairyConfirmation?.variance?.milk || (dairy - collected);
                    const tripIdStr = (trip._id || trip.id).toString();
                    const shortId = tripIdStr.substring(tripIdStr.length - 6).toUpperCase();
                    const tripDate = new Date(trip.endTime || trip.startTime || trip.createdAt);

                    return (
                      <TouchableOpacity
                        key={trip._id || trip.id}
                        style={styles.tripCard}
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate('MilkTruckOwnerTripDetails', { tripId: trip._id || trip.id })}
                      >
                        <View style={styles.cardHeader}>
                          <View style={styles.dateLabel}>
                            <Text style={styles.dateDay}>{tripDate.getDate()}</Text>
                            <Text style={styles.dateMonth}>{tripDate.toLocaleString('en-US', { month: 'short' })}</Text>
                          </View>
                          <View style={styles.routeHeaderInfo}>
                            <Text style={styles.tripIdText}>#{shortId}</Text>
                            <Text style={styles.routeNameText}>{routeName}</Text>
                          </View>
                          <View style={[styles.statusBadge, trip.status === 'completed' ? styles.badgeSuccess : styles.badgeWarning]}>
                            <Text style={[styles.statusText, { color: trip.status === 'completed' ? colors.success[700] : colors.warning[700] }]}>
                              {trip.status === 'completed' ? 'DONE' : 'LIVE'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardDivider} />

                        <View style={styles.cardBody}>
                          <View style={styles.bodyItem}>
                            <Text style={styles.bodyLabel}>Vehicle</Text>
                            <Text style={styles.bodyVal}>{vehicleReg}</Text>
                          </View>
                          <View style={styles.bodyItem}>
                            <Text style={styles.bodyLabel}>Milk Collected</Text>
                            <Text style={styles.bodyVal}>{collected.toFixed(2)} L</Text>
                          </View>
                          <View style={styles.bodyItem}>
                            <Text style={styles.bodyLabel}>Dairy Verification</Text>
                            <Text style={[styles.bodyVal, diff !== 0 && { color: diff < 0 ? colors.error[600] : colors.success[600] }]}>
                              {dairy.toFixed(2)} L {diff !== 0 && `(${diff > 0 ? '+' : ''}${diff.toFixed(2)})`}
                            </Text>
                          </View>
                        </View>

                        <LinearGradient
                          colors={['transparent', 'rgba(139, 92, 246, 0.03)']}
                          style={styles.cardFooter}
                        >
                          <Text style={styles.footerText}>TAP TO VIEW DETAILED SETTLEMENT</Text>
                          <Text style={styles.footerIcon}>→</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

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
    height: 400,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  headerSpacer: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
  loadingWrapper: {
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: 50,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statBoxSuccess: {
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  statBoxWarning: {
    borderColor: 'rgba(245, 158, 11, 0.1)',
  },
  statVal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary[900],
  },
  statLab: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    marginTop: 2,
  },
  tripList: {
    gap: spacing.md,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: spacing.lg,
    alignItems: 'center',
  },
  dateLabel: {
    backgroundColor: '#F5F3FF',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  dateDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  dateMonth: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#7C3AED',
    textTransform: 'uppercase',
  },
  routeHeaderInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  tripIdText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  routeNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary[900],
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: colors.success[50],
  },
  badgeWarning: {
    backgroundColor: colors.warning[50],
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: spacing.lg,
  },
  cardBody: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  bodyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bodyLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  bodyVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[800],
  },
  cardFooter: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  footerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8B5CF6',
    letterSpacing: 0.5,
  },
  footerIcon: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 100,
  },
  emptyEmoji: {
    fontSize: 60,
    opacity: 0.2,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
});

export default MilkTruckOwnerDriverTrips;
