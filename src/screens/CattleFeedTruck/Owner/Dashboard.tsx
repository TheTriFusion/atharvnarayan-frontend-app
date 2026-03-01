import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, Animated, StatusBar, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import ScreenHeader from '../../../components/common/ScreenHeader';
import DriverPathMap, { Coord } from '../../../components/DriverPathMap';
import { useOwnerTripSocket } from '../../../hooks/useOwnerTripSocket';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

const CattleFeedTruckOwnerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fleetPathCoordinates, setFleetPathCoordinates] = useState<Coord[]>([]);

  const activeTripIds = useMemo(
    () =>
      trips
        .filter((t: any) => t.status === 'in_transit' || t.status === 'loading')
        .map((t: any) => t._id)
        .filter(Boolean),
    [trips]
  );

  useOwnerTripSocket({
    activeTripIds,
    ownerId: user?.id ?? null,
    enabled: true,
    onDriverLocation: (lat, lng) => {
      setFleetPathCoordinates((prev) => [...prev, { latitude: lat, longitude: lng }]);
    },
    onOwnerNotification: () => {
      // Optional: show toast or add notifications state
    },
  });

  useEffect(() => {
    if (activeTripIds.length === 0) setFleetPathCoordinates([]);
  }, [activeTripIds.length]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fetchDashboardData();

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
  }, []);


  const fetchDashboardData = async () => {
    try {
      const tripsResponse = await cattleFeedTruckAPI.getTrips(user?.id);
      const tripsData = Array.isArray(tripsResponse) ? tripsResponse : (Array.isArray(tripsResponse.data) ? tripsResponse.data : []);
      setTrips(tripsData);
      const activeIds = (tripsData || [])
        .filter((t: any) => t.status === 'in_transit' || t.status === 'loading')
        .map((t: any) => t._id)
        .filter(Boolean);
      if (activeIds.length > 0) {
        try {
          const tripRes = await cattleFeedTruckAPI.getTrip(activeIds[0]);
          const trip = tripRes?.data ?? tripRes;
          const history = trip?.locationHistory ?? [];
          const path: Coord[] = history
            .map((p: any) => ({ latitude: p.latitude ?? p.lat, longitude: p.longitude ?? p.lng }))
            .filter((p: Coord) => typeof p.latitude === 'number' && typeof p.longitude === 'number');
          setFleetPathCoordinates(path);
        } catch (_) { /* ignore */ }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background Gradient */}
      <LinearGradient
        colors={[colors.primary[600], colors.primary[400], colors.background.primary]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.8 }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        <View style={styles.headerSpacer} />

        {/* Header Section */}
        <ScreenHeader
          title="Cattle Feed Dashboard"
          subtitle={`Welcome back, ${user?.name}`}
          transparent
          titleStyle={{ color: '#fff' }}
          subtitleStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
        />

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Quick Actions Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitleLight}>Management Hub</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('VehicleManagement')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={styles.actionEmoji}>🚛</Text>
                </View>
                <Text style={styles.actionLabel}>Vehicles</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('DriverManagement')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#F0F9FF' }]}>
                  <Text style={styles.actionEmoji}>👥</Text>
                </View>
                <Text style={styles.actionLabel}>Drivers</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('TripManagement')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#E0F7FA' }]}>
                  <Text style={styles.actionEmoji}>📊</Text>
                </View>
                <Text style={styles.actionLabel}>Trips</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('RouteManagement')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#F5F5F5' }]}>
                  <Text style={styles.actionEmoji}>🛣️</Text>
                </View>
                <Text style={styles.actionLabel}>Routes</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Live Fleet Tracking */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitleLight}>Live Fleet Tracking</Text>
            <Card style={styles.liveFleetCard}>
              <View style={styles.mapPlaceholderWrapper}>
                <DriverPathMap
                  coordinates={fleetPathCoordinates}
                  followUser={false}
                  initialRegion={{
                    latitude: 20.5937,
                    longitude: 78.9629,
                    latitudeDelta: 8,
                    longitudeDelta: 8,
                  }}
                  style={styles.liveFleetMap}
                />
              </View>
              {activeTripIds.length > 0 && (
                <Text style={styles.liveFleetHint}>
                  {fleetPathCoordinates.length > 0
                    ? 'Driver path updating live'
                    : 'Waiting for driver location…'}
                </Text>
              )}
            </Card>
          </View>

          {/* Recent Trips Section */}
          <Card style={styles.recentTripsCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Trips</Text>
              <TouchableOpacity onPress={() => navigation.navigate('TripManagement')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {trips.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🚚</Text>
                <Text style={styles.emptyText}>No trips recorded yet</Text>
                <Button
                  onPress={() => navigation.navigate('TripManagement')}
                  variant="outline"
                  style={styles.emptyButton}
                >
                  Create Trip
                </Button>
              </View>
            ) : (
              <View style={styles.tripsList}>
                {trips.slice(0, 5).map((trip: any) => (
                  <TouchableOpacity
                    key={trip._id}
                    style={styles.tripItem}
                    onPress={() => navigation.navigate('TripManagement')} // Or specific trip details if exists
                  >
                    <View style={styles.tripIconBox}>
                      <Text style={styles.tripEmoji}>🔄</Text>
                    </View>
                    <View style={styles.tripItemContent}>
                      <Text style={styles.tripItemTitle}>
                        Trip #{trip._id.substring(trip._id.length - 6).toUpperCase()}
                      </Text>
                      <Text style={styles.tripItemRoute}>
                        {trip.from || 'Source'} → {trip.to || 'Destination'}
                      </Text>
                      <Text style={styles.tripItemDate}>
                        {new Date(trip.date || trip.createdAt || '').toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      trip.status === 'completed' ? styles.statusCompleted :
                        trip.status === 'in_transit' ? styles.statusInTransit :
                          styles.statusPending
                    ]}>
                      <Text style={[
                        styles.statusText,
                        trip.status === 'completed' ? styles.statusCompletedText :
                          trip.status === 'in_transit' ? styles.statusInTransitText :
                            styles.statusPendingText
                      ]}>
                        {trip.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>

          <View style={{ height: 40 }} />
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
    height: 350,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: colors.primary[600],
    fontWeight: '500',
  },
  headerSpacer: {
    height: Platform.OS === 'ios' ? 50 : 30,
  },
  sectionContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionTitleLight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: spacing.xl,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  liveFleetCard: {
    marginHorizontal: 0,
    padding: 0,
    borderRadius: borderRadius.xl,
    backgroundColor: '#fff',
    overflow: 'hidden',
    ...shadows.lg,
  },
  mapPlaceholderWrapper: {
    height: 200,
    width: '100%',
  },
  liveFleetMap: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
  },
  liveFleetHint: {
    padding: spacing.sm,
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  recentTripsCard: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: '#fff',
    ...shadows.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  viewAllText: {
    color: colors.primary[600],
    fontWeight: '600',
    fontSize: 14,
  },
  tripsList: {
    gap: 16,
  },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tripIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tripEmoji: {
    fontSize: 20,
  },
  tripItemContent: {
    flex: 1,
  },
  tripItemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  tripItemRoute: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  tripItemDate: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  statusCompleted: {
    backgroundColor: colors.success[50],
  },
  statusInTransit: {
    backgroundColor: colors.primary[50],
  },
  statusPending: {
    backgroundColor: colors.warning[50],
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusCompletedText: {
    color: colors.success[600],
  },
  statusInTransitText: {
    color: colors.primary[600],
  },
  statusPendingText: {
    color: colors.warning[600],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.tertiary,
    marginBottom: 20,
  },
  emptyButton: {
    width: 150,
  },
});

export default CattleFeedTruckOwnerDashboard;
