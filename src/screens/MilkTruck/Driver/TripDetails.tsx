import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { getMilkTruckTrips, getMilkTruckBMCs, getMilkTruckVehicles, getMilkTruckDrivers, getMilkTruckRoutes } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

const { width } = Dimensions.get('window');

const TripDetails: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const tripId = route.params?.tripId;
  const [trip, setTrip] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [bmcs, setBMCs] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (tripId) {
      loadTripDetails();
    } else {
      navigation.goBack();
    }
  }, [tripId]);

  const loadTripDetails = async () => {
    try {
      setLoading(true);
      const [allTrips, vehiclesData, routesData, bmcsData, driversData] = await Promise.all([
        getMilkTruckTrips(),
        getMilkTruckVehicles(),
        getMilkTruckRoutes(),
        getMilkTruckBMCs(),
        getMilkTruckDrivers(),
      ]);

      const tripsArray = Array.isArray(allTrips) ? allTrips : [];
      const foundTrip = tripsArray.find(t => (t._id || t.id) === tripId);

      if (!foundTrip) {
        navigation.goBack();
        return;
      }

      setTrip(foundTrip);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setRoutes(Array.isArray(routesData) ? routesData : []);
      setBMCs(Array.isArray(bmcsData) ? bmcsData : []);
      setDrivers(Array.isArray(driversData) ? driversData : []);

      // Start animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    } catch (error: any) {
      console.error('Error loading trip details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  if (!trip) return null;

  const vehicle = vehicles.find(v => (v._id || v.id) === (trip.vehicleId?._id || trip.vehicleId?.id || trip.vehicleId));
  const tripRoute = routes.find(r => (r._id || r.id) === (trip.routeId?._id || trip.routeId?.id || trip.routeId));
  const driver = drivers.find(d => (d._id || d.id) === (trip.driverId?._id || trip.driverId?.id || trip.driverId));
  const bmcEntries = trip.bmcEntries || [];
  const collected = trip.dairyConfirmation?.collectionTotals?.milk || trip.summary?.totalMilk || 0;
  const dairy = trip.dairyConfirmation?.totalMilkQuantity || trip.summary?.totalMilk || 0;
  const variance = trip.dairyConfirmation?.variance?.milk || (dairy - collected);

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
            <Text style={styles.headerLabel}>TRIP DETAILS</Text>
            <Text style={styles.headerTitle}>#{((trip._id || trip.id || '').toString().substring((trip._id || trip.id || '').toString().length - 6))}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: trip.status === 'completed' ? colors.success[400] : colors.warning[400] }]}>
            <Text style={styles.statusBadgeText}>{trip.status?.toUpperCase()?.replace('_', ' ')}</Text>
          </View>
          <Text style={styles.tripDateText}>
            📅 {new Date(trip.date || trip.createdAt || '').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={[styles.content, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Stats Card */}
        <Card variant="elevated" style={styles.statsCard}>
          <View style={styles.statGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>COLLECTED</Text>
              <Text style={styles.statValue}>{collected.toFixed(1)}L</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>DAIRY RCVD</Text>
              <Text style={styles.statValue}>{dairy.toFixed(1)}L</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>VARIANCE</Text>
              <Text style={[styles.statValue, { color: variance < 0 ? colors.error[600] : variance > 0 ? colors.success[600] : colors.text.primary }]}>
                {variance > 0 ? '+' : ''}{variance.toFixed(1)}L
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>DISTANCE</Text>
              <Text style={styles.statValue}>{(trip.summary?.totalDistance || 0).toFixed(1)}km</Text>
            </View>
          </View>
        </Card>

        {/* Route & Vehicle */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIndicator} />
          <Text style={styles.sectionTitle}>ROUTE & SHIPMENT</Text>
        </View>

        <Card variant="elevated" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Text style={styles.infoIcon}>🗺️</Text>
            </View>
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabelText}>Assigned Route</Text>
              <Text style={styles.infoValueText}>{tripRoute?.name || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: colors.secondary[100] }]}>
              <Text style={styles.infoIcon}>🚛</Text>
            </View>
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabelText}>Vehicle Registration</Text>
              <Text style={styles.infoValueText}>{vehicle?.registrationNumber || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: colors.warning[100] }]}>
              <Text style={styles.infoIcon}>👤</Text>
            </View>
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabelText}>Trip Driver</Text>
              <Text style={styles.infoValueText}>{driver?.name || 'N/A'}</Text>
            </View>
          </View>
        </Card>

        {/* BMC Collections */}
        {bmcEntries.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIndicator, { backgroundColor: colors.secondary[500] }]} />
              <Text style={styles.sectionTitle}>BMC COLLECTION LOGS ({bmcEntries.length})</Text>
            </View>

            {bmcEntries.map((entry: any, index: number) => {
              const bmc = bmcs.find(b => (b._id || b.id) === (entry.bmcId?._id || entry.bmcId?.id || entry.bmcId));
              const entryQty = entry.collectionData?.milkQuantity || 0;
              const entryDairyQty = entry.dairyVerifiedData?.milkQuantity || 0;
              const entryVariance = entryDairyQty - entryQty;

              return (
                <Card key={index} variant="elevated" style={styles.bmcCard}>
                  <View style={styles.bmcHeader}>
                    <Text style={styles.bmcName}>{bmc?.name || 'Unknown BMC'}</Text>
                    <Text style={styles.bmcTime}>
                      {entry.collectionData?.collectedAt ? new Date(entry.collectionData.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.bmcDivider} />
                  <View style={styles.bmcStatsGrid}>
                    <View style={styles.bmcInfoBox}>
                      <Text style={styles.bmcStatLabel}>Collected</Text>
                      <Text style={styles.bmcStatValue}>{entryQty.toFixed(1)} L</Text>
                    </View>
                    <View style={styles.bmcInfoBox}>
                      <Text style={styles.bmcStatLabel}>Dairy</Text>
                      <Text style={styles.bmcStatValue}>{entryDairyQty.toFixed(1)} L</Text>
                    </View>
                    <View style={styles.bmcInfoBox}>
                      <Text style={styles.bmcStatLabel}>Diff</Text>
                      <Text style={[styles.bmcStatValue, { color: entryVariance < 0 ? colors.error[600] : entryVariance > 0 ? colors.success[600] : colors.text.primary }]}>
                        {entryVariance > 0 ? '+' : ''}{entryVariance.toFixed(1)} L
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        <View style={styles.footerPadding} />
      </Animated.ScrollView>
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
    backgroundColor: colors.background.secondary,
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
    borderBottomLeftRadius: borderRadius['3xl'],
    borderBottomRightRadius: borderRadius['3xl'],
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
    fontWeight: 'black',
  },
  placeholder: {
    width: 40,
  },
  statusSection: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  tripDateText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  statsCard: {
    marginTop: -spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  statGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: typography.fontWeight.black,
    color: colors.text.tertiary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.light,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
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
    fontWeight: typography.fontWeight.black,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
  },
  infoCard: {
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 20,
  },
  infoTexts: {
    marginLeft: spacing.md,
  },
  infoLabelText: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  infoValueText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  bmcCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  bmcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bmcName: {
    fontSize: typography.fontSize.base,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  bmcTime: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  bmcDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: spacing.sm,
  },
  bmcStatsGrid: {
    flexDirection: 'row',
  },
  bmcInfoBox: {
    flex: 1,
    alignItems: 'center',
  },
  bmcStatLabel: {
    fontSize: 9,
    color: colors.text.tertiary,
    fontWeight: '700',
    marginBottom: 2,
  },
  bmcStatValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  footerPadding: {
    height: 100,
  },
});

export default TripDetails;
