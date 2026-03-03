import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, RefreshControl, TouchableOpacity, Animated, Dimensions, Platform, PermissionsAndroid } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Geolocation from '@react-native-community/geolocation';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import { useTripSocket } from '../../../hooks/useTripSocket';
import DriverPathMap, { Coord } from '../../../components/DriverPathMap';
import { checkGeofenceAndNotify, clearNotifyOwnerThrottle, CollectionPoint } from '../../../utils/notifyOwner';
import { startTripLocationService, stopTripLocationService } from '../../../utils/tripLocationService';
import { smartSendLocation, startOfflineSyncLoop, stopOfflineSyncLoop } from '../../../utils/offlineLocationCache';
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
  summary?: any;
  startTime?: string;
}

const CattleFeedTruckDriverActiveTrip: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReceiverModal, setShowReceiverModal] = useState(false);
  const [currentDeliveryIndex, setCurrentDeliveryIndex] = useState<number>(-1);
  const [receiverName, setReceiverName] = useState('');
  const [actualQuantity, setActualQuantity] = useState('');
  const [markingLoading, setMarkingLoading] = useState(false);
  const [pathCoordinates, setPathCoordinates] = useState<Coord[]>([]);
  const watchIdRef = useRef<number | null>(null);

  const isOnTrip = !!trip && (trip.status === 'loading' || trip.status === 'in_transit');
  const { emitLocation } = useTripSocket(trip?._id ?? null, isOnTrip);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Build collection points from delivery entries (for geofence). Use lat/lng when backend provides them.
  const collectionPoints = (trip?.deliveryEntries ?? [])
    .filter((e: any) => !e.actualDelivery?.deliveredAt)
    .map((e: any, i: number) => {
      const lat = e.latitude ?? e.deliveryPointId?.latitude ?? 0;
      const lng = e.longitude ?? e.deliveryPointId?.longitude ?? 0;
      return { id: e._id || `entry-${i}`, latitude: lat, longitude: lng, radiusMeters: 150 } as CollectionPoint;
    })
    .filter((p: CollectionPoint) => p.latitude !== 0 || p.longitude !== 0);

  const collectionPointsRef = useRef<CollectionPoint[]>([]);
  collectionPointsRef.current = collectionPoints;

  // Location tracking only when driver is on trip
  useEffect(() => {
    if (!isOnTrip || !trip) {
      if (watchIdRef.current != null) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (trip?._id) clearNotifyOwnerThrottle(trip._id);
      return;
    }

    const tripId = trip._id;
    const watchId = Geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setPathCoordinates((prev) => [...prev, { latitude, longitude }]);
        emitLocation(latitude, longitude);
        const tok = await AsyncStorage.getItem('token');
        if (tok) smartSendLocation(tripId, latitude, longitude, tok, 'cattle_feed_truck').catch(() => { });
        const driverName = trip.driverId?.name || user?.name || 'Driver';
        checkGeofenceAndNotify(tripId, driverName, latitude, longitude, collectionPointsRef.current);
      },
      (err) => console.warn('Trip location watch error:', err),
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 2000,
      }
    );
    watchIdRef.current = watchId;
    return () => {
      if (watchIdRef.current != null) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      clearNotifyOwnerThrottle(tripId);
    };
  }, [isOnTrip, trip?._id]);

  // Native Android Foreground Service – keeps sending location to backend even when app is closed/killed
  useEffect(() => {
    if (!isOnTrip || !trip?._id) {
      stopTripLocationService();
      return;
    }

    const tripId = trip._id;
    let mounted = true;

    const startNativeService = async () => {
      // Request background location permission (Android 10+)
      if (Platform.OS === 'android') {
        try {
          if (Number(Platform.Version) >= 33) {
            await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
          }
          const fineGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'Allow location so your trip route can be tracked.',
              buttonNeutral: 'Later',
              buttonPositive: 'OK',
            }
          );
          if (fineGranted !== PermissionsAndroid.RESULTS.GRANTED) return;
          // ACCESS_BACKGROUND_LOCATION is required for location when app is closed (Android 10+)
          if (Number(Platform.Version) >= 29) {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
              {
                title: 'Background Location',
                message: 'Allow background location so the trip route is recorded even when the app is closed.',
                buttonNeutral: 'Later',
                buttonPositive: 'OK',
              }
            );
          }
        } catch (_) { }
      }

      if (!mounted) return;
      try {
        const token = await AsyncStorage.getItem('token');
        if (token && mounted) {
          startTripLocationService(tripId, token, 'cattle_feed_truck');
          startOfflineSyncLoop(tripId, token, 'cattle_feed_truck');
        }
      } catch (e) {
        console.warn('[CattleFeed] Failed to start native location service:', e);
      }
    };

    startNativeService();

    return () => {
      mounted = false;
      stopTripLocationService();
      stopOfflineSyncLoop();
    };
  }, [isOnTrip, trip?._id]);

  useEffect(() => {
    fetchActiveTrip();

    const interval = setInterval(() => {
      fetchActiveTrip(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchActiveTrip = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await cattleFeedTruckAPI.getTrips();
      let trips = [];
      if (Array.isArray(response)) {
        trips = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        trips = response.data;
      }

      const userId = user?._id || user?.id;
      const activeTrips = trips.filter((trip: Trip) => {
        const driverId = trip.driverId?._id || trip.driverId;
        return driverId && userId && driverId.toString() === userId.toString() &&
          (trip.status === 'loading' || trip.status === 'in_transit');
      });

      if (activeTrips.length > 0) {
        const activeTrip = activeTrips.sort((a: Trip, b: Trip) => {
          const dateA = new Date(b.createdAt || b.startTime || '').getTime();
          const dateB = new Date(a.createdAt || a.startTime || '').getTime();
          return dateA - dateB;
        })[0];
        setTrip(activeTrip);

        // Start fade animation when trip is loaded
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();

        // Animate progress bar
        const totalBags = activeTrip.summary?.totalQuantityLoaded || activeTrip.tripDetails?.totalBags || 0;
        const deliveredBags = activeTrip.deliveryEntries?.reduce((sum: number, entry: any) => {
          const actualDelivery = entry.actualDelivery;
          if (actualDelivery && actualDelivery.feedItems) {
            return sum + actualDelivery.feedItems.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
          }
          return sum;
        }, 0) || 0;

        const progress = totalBags > 0 ? deliveredBags / totalBags : 0;
        Animated.spring(progressAnim, {
          toValue: progress,
          useNativeDriver: false,
          tension: 20,
          friction: 7,
        }).start();

      } else {
        navigation.navigate('CattleFeedTruckDriverDashboard');
      }
    } catch (error: any) {
      console.error('Error fetching active trip:', error);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!trip || currentDeliveryIndex === -1) return;

    const entry = trip.deliveryEntries![currentDeliveryIndex];
    const location = entry.notes || entry.location || `Location ${currentDeliveryIndex + 1}`;
    const plannedItems = entry.plannedDelivery?.feedItems || [];
    const bags = plannedItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

    const quantity = parseInt(actualQuantity);
    if (isNaN(quantity) || quantity < 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setMarkingLoading(true);
    try {
      // Calculate total planned bags for proportioning if multiple items
      const totalPlanned = plannedItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

      const actualDelivery = {
        feedItems: plannedItems.map((item: any) => {
          // Proportionally distribute the actual quantity based on planned amount
          // If totalPlanned is 0, just give all to the first item (unlikely case)
          let itemQuantity = quantity;
          if (plannedItems.length > 1 && totalPlanned > 0) {
            itemQuantity = Math.round((quantity * (item.quantity || 0)) / totalPlanned);
          } else if (plannedItems.indexOf(item) > 0) {
            itemQuantity = 0; // If not the first and no proportioning possible, default to 0
          }

          return {
            feedType: item.feedType || 'Cattle Feed',
            quantity: itemQuantity,
            unit: item.unit || 'bags',
            pricePerUnit: item.pricePerUnit || 0,
          };
        }),
        totalAmount: (entry.plannedDelivery?.totalAmount || 0) * (quantity / (totalPlanned || 1)),
        deliveredAt: new Date(),
        receivedBy: receiverName || undefined,
      };

      const response = await cattleFeedTruckAPI.updateDelivery(
        trip._id,
        currentDeliveryIndex.toString(),
        { actualDelivery }
      );

      sendNotificationToOwner(trip, location, quantity, receiverName);

      const updatedTrip = response.data || response;
      setTrip(updatedTrip);

      const allDelivered = updatedTrip.deliveryEntries?.every((e: any) => e.actualDelivery?.deliveredAt);

      if (allDelivered && updatedTrip.deliveryEntries.length > 0) {
        toast.info('All locations delivered! You can now finish the trip.');
      }

      setShowReceiverModal(false);
      toast.success(`${quantity} bags delivered at ${location}!`);
    } catch (error: any) {
      console.error('Error marking delivery:', error);
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setMarkingLoading(false);
    }
  };

  const sendNotificationToOwner = async (trip: Trip, location: string, bags: number, receiverName: string = '', type: string = 'delivery') => {
    try {
      const notificationsJson = await AsyncStorage.getItem('cattleFeedTruckOwnerNotifications');
      const notifications = notificationsJson ? JSON.parse(notificationsJson) : [];

      let message;
      if (type === 'trip_completed') {
        message = `Trip #${trip._id.substring(trip._id.length - 6)} completed! All deliveries finished.`;
      } else {
        message = `Delivery completed at ${location}: ${bags} bags${receiverName ? ` (Received by: ${receiverName})` : ''}`;
      }

      notifications.unshift({
        id: `notif-${Date.now()}-${Math.random()}`,
        type: type,
        tripId: trip._id,
        tripNumber: trip._id.substring(trip._id.length - 6),
        location: location,
        bags: bags,
        receiverName: receiverName,
        message: message,
        timestamp: new Date().toISOString(),
        driverName: trip.driverId?.name || 'Driver',
      });

      await AsyncStorage.setItem('cattleFeedTruckOwnerNotifications', JSON.stringify(notifications.slice(0, 100)));
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  };

  const handleCompleteTrip = async () => {
    if (!trip) return;

    const deliveredBags = trip.deliveryEntries?.reduce((sum, entry) => {
      const actualDelivery = entry.actualDelivery;
      if (actualDelivery && actualDelivery.feedItems) {
        return sum + actualDelivery.feedItems.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
      }
      return sum;
    }, 0) || 0;
    const totalBags = trip.summary?.totalQuantityLoaded || trip.tripDetails?.totalBags || 0;

    Alert.alert(
      'Complete Trip',
      deliveredBags < totalBags
        ? `You've delivered ${deliveredBags}/${totalBags} bags. Complete trip anyway?`
        : 'Are you sure you want to complete this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await cattleFeedTruckAPI.updateTrip(trip._id, { status: 'completed', endTime: new Date() });
              sendNotificationToOwner(trip, 'All Locations', 0, '', 'trip_completed');
              toast.success('Trip completed!');
              navigation.navigate('CattleFeedTruckDriverDashboard');
            } catch (error: any) {
              console.error('Error completing trip:', error);
              toast.error('Error completing trip');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Loading trip data...</Text>
      </View>
    );
  }

  if (!trip) return null;

  const deliveredBags = trip.deliveryEntries?.reduce((sum, entry) => {
    const actualDelivery = entry.actualDelivery;
    if (actualDelivery && actualDelivery.feedItems) {
      return sum + actualDelivery.feedItems.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
    }
    return sum;
  }, 0) || 0;
  const totalBags = trip.summary?.totalQuantityLoaded || trip.tripDetails?.totalBags || 0;
  const deliveryEntries = trip.deliveryEntries || [];
  const allDelivered = deliveryEntries.length > 0 && deliveryEntries.every(entry => entry.actualDelivery?.deliveredAt);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary[700], colors.primary[900]]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerLabel}>ACTIVE TRIP</Text>
            <Text style={styles.headerTitle}>#{trip._id.substring(trip._id.length - 6)}</Text>
          </View>
          <TouchableOpacity onPress={() => fetchActiveTrip(true)} style={styles.refreshButton}>
            <Text style={styles.refreshIcon}>🔄</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressPercentageText}>
              {Math.round((deliveredBags / totalBags) * 100 || 0)}% Completed
            </Text>
            <Text style={styles.progressBagsText}>
              {deliveredBags} / {totalBags} Bags
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]}
            />
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={[styles.content, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchActiveTrip(false)} tintColor={colors.primary[600]} />
        }
      >
        {allDelivered && (
          <Card style={styles.readyBanner}>
            <Text style={styles.readyTitle}>🎊 DELIVERIES FINISHED!</Text>
            <Text style={styles.readySubtitle}>Please click the button below to finalize and close this trip.</Text>
          </Card>
        )}
        {/* Info Card */}
        <Card variant="elevated" style={styles.infoCard}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ROUTE</Text>
              <Text style={styles.infoValue}>{trip.from} → {trip.to}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>VEHICLE</Text>
              <Text style={styles.infoValue}>{trip.vehicleId?.registrationNumber || 'N/A'}</Text>
            </View>
          </View>
        </Card>

        {/* Driver path map - only when on trip */}
        {isOnTrip && (
          <View style={styles.mapCard}>
            <Text style={styles.mapTitle}>YOUR ROUTE</Text>
            <View style={styles.mapWrapper}>
              <DriverPathMap coordinates={pathCoordinates} followUser />
            </View>
          </View>
        )}

        {/* Deliveries Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIndicator} />
          <Text style={styles.sectionTitle}>DELIVERY LOCATIONS</Text>
        </View>

        {deliveryEntries.map((entry, index) => {
          const isDelivered = !!entry.actualDelivery?.deliveredAt;
          const location = entry.deliveryPointId?.name
            ? `${entry.deliveryPointId.name} ${entry.location ? `(${entry.location})` : ''}`
            : (entry.notes || entry.location || `Location ${index + 1}`);
          const bags = entry.plannedDelivery?.feedItems?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0;

          return (
            <Card key={entry._id || index} variant="elevated" style={[styles.deliveryCard, isDelivered ? styles.deliveredCard : null] as any}>
              <View style={styles.deliveryContent}>
                <View style={styles.deliveryHeader}>
                  <View style={[styles.deliveryNumberCircle, isDelivered && styles.deliveredCircle]}>
                    <Text style={styles.deliveryNumberText}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={styles.deliveryLocationName}>{location}</Text>
                    <Text style={styles.deliveryBagsCount}>{bags} Bags Planned</Text>
                  </View>
                  {isDelivered && (
                    <View style={styles.deliveredBadge}>
                      <Text style={styles.deliveredBadgeText}>✓</Text>
                    </View>
                  )}
                </View>

                {isDelivered ? (
                  <View style={styles.deliveredInfo}>
                    <Text style={styles.deliveredTime}>
                      Delivered at {new Date(entry.actualDelivery.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {entry.actualDelivery.receivedBy && (
                      <Text style={styles.receivedByText}>Received by: {entry.actualDelivery.receivedBy}</Text>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.markDeliveredButton}
                    onPress={() => {
                      setCurrentDeliveryIndex(index);
                      setReceiverName('');
                      const entryBags = entry.plannedDelivery?.feedItems?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0;
                      setActualQuantity(entryBags.toString());
                      setShowReceiverModal(true);
                    }}
                  >
                    <LinearGradient
                      colors={[colors.success[500], colors.success[600]]}
                      style={styles.buttonGradient}
                    >
                      <Text style={styles.buttonText}>MARK AS DELIVERED</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          );
        })}

        <TouchableOpacity
          style={styles.completeTripButton}
          onPress={handleCompleteTrip}
        >
          <LinearGradient
            colors={allDelivered ? [colors.secondary[500], colors.secondary[700]] : [colors.primary[400], colors.primary[600]]}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>{allDelivered ? 'COMPLETE TRIP' : 'END TRIP (INCOMPLETE)'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.footerPadding} />
      </Animated.ScrollView>

      {/* Receiver Modal */}
      <Modal
        visible={showReceiverModal}
        onClose={() => setShowReceiverModal(false)}
        title="Confirm Delivery"
        subtitle="Verify bags and receiver information"
        icon="✅"
        footer={
          <View style={styles.modalFooterActions}>
            <Button
              onPress={() => setShowReceiverModal(false)}
              variant="secondary"
              style={styles.modalBtn}
            >
              Cancel
            </Button>
            <Button
              onPress={handleMarkDelivered}
              style={styles.modalBtn}
              loading={markingLoading}
            >
              Confirm
            </Button>
          </View>
        }
      >
        <View style={styles.modalContentWrapper}>
          <View style={styles.modalInfoSection}>
            <View style={styles.modalInfoRow}>
              <Text style={styles.modalInfoLabel}>POINT:</Text>
              <Text style={styles.modalInfoValue} numberOfLines={1}>
                {currentDeliveryIndex !== -1 && trip?.deliveryEntries?.[currentDeliveryIndex] && (
                  trip.deliveryEntries[currentDeliveryIndex].notes ||
                  trip.deliveryEntries[currentDeliveryIndex].location ||
                  `Location ${currentDeliveryIndex + 1}`
                )}
              </Text>
            </View>
            <View style={styles.modalInfoRow}>
              <Text style={styles.modalInfoLabel}>PLANNED:</Text>
              <Text style={styles.modalInfoValue}>
                {currentDeliveryIndex !== -1 && trip?.deliveryEntries?.[currentDeliveryIndex]?.plannedDelivery?.feedItems?.reduce((s: number, i: any) => s + (i.quantity || 0), 0)} Bags
              </Text>
            </View>
          </View>

          <Input
            label="Actual Bags Delivered"
            value={actualQuantity}
            onChangeText={setActualQuantity}
            placeholder="Number of bags"
            keyboardType="numeric"
          />
          <Input
            label="Receiver Name (optional)"
            value={receiverName}
            onChangeText={setReceiverName}
            placeholder="Who is receiving the bags?"
          />
        </View>
      </Modal>
    </View>
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
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.tertiary,
    fontSize: typography.fontSize.sm,
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    ...shadows.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 18,
  },
  progressSection: {
    marginTop: spacing.md,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressPercentageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBagsText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success[400],
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  infoCard: {
    marginTop: -spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  mapCard: {
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
  },
  mapTitle: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  mapWrapper: {
    height: 200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  infoGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.tertiary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  infoDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.light,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionIndicator: {
    width: 4,
    height: 16,
    backgroundColor: colors.primary[600],
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
  },
  deliveryCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.border.light,
  },
  deliveredCard: {
    borderLeftColor: colors.success[500],
    backgroundColor: colors.success[50],
  },
  deliveryContent: {
    flex: 1,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveredCircle: {
    backgroundColor: colors.success[500],
  },
  deliveryNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  deliveryLocationName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  deliveryBagsCount: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  deliveredBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveredBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deliveredInfo: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  deliveredTime: {
    fontSize: 11,
    color: colors.success[700],
    fontWeight: '600',
  },
  receivedByText: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  markDeliveredButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1,
    fontSize: 12,
  },
  completeTripButton: {
    marginTop: spacing.xl,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  footerPadding: {
    height: 100,
  },
  modalFooterActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalBtn: {
    flex: 1,
  },
  modalContentWrapper: {
    paddingVertical: spacing.sm,
  },
  modalInfoSection: {
    backgroundColor: colors.background.tertiary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[500],
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalInfoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  modalInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  readyBanner: {
    backgroundColor: colors.success[50],
    borderColor: colors.success[200],
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  readyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success[700],
    marginBottom: 4,
  },
  readySubtitle: {
    fontSize: 12,
    color: colors.success[600],
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default CattleFeedTruckDriverActiveTrip;
