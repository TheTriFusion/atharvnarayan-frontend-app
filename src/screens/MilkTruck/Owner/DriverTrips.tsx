import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getMilkTruckTrips, getMilkTruckBMCs, getMilkTruckVehicles, getMilkTruckDrivers, getMilkTruckRoutes } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
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
  const [bmcs, setBMCs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (driverId) {
      loadData();
    } else {
      navigation.goBack();
    }
  }, [driverId, selectedOwnerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const ownerId = isSuperAdmin ? selectedOwnerId : null;

      const [allTrips, allDrivers, vehiclesData, routesData, bmcsData] = await Promise.all([
        getMilkTruckTrips(ownerId),
        getMilkTruckDrivers(ownerId),
        getMilkTruckVehicles(ownerId),
        getMilkTruckRoutes(ownerId),
        getMilkTruckBMCs(ownerId),
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
      setBMCs(Array.isArray(bmcsData) ? bmcsData : []);
    } catch (error: any) {
      console.error('Error loading driver trips:', error);
      showError(error.message || 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const completedTrips = trips.filter(t => t.status === 'completed');
  const activeTrips = trips.filter(t => t.status === 'in_progress');

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#4A90E2', '#FFFFFF']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <StatusBar barStyle="light-content" backgroundColor="#4A90E2" />
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading trips...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const driverInitials = driver?.name
    ? driver.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4A90E2', '#FFFFFF']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <StatusBar barStyle="light-content" backgroundColor="#4A90E2" />
        {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}

        <ScreenHeader
          title="Driver Trips"
          subtitle={driver ? `${driver.name} • ${driver.phoneNumber || 'N/A'}` : ''}
          showBackButton
          transparent
        />

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>

          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{trips.length}</Text>
              <Text style={styles.statLabel}>Total Trips</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, styles.completedStat]}>
                {completedTrips.length}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, styles.activeStat]}>
                {activeTrips.length}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </Card>
          </View>

          {trips.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>No trips found for this driver.</Text>
              <Text style={styles.emptySubtext}>Trips will appear here once the driver starts a trip.</Text>
            </Card>
          ) : (
            <Card title="All Trips">
              <View style={styles.tripsList}>
                {trips.map((trip) => {
                  const vehicleReg = trip.vehicleId?.registrationNumber || vehicles.find(v => (v._id || v.id) === (trip.vehicleId?._id || trip.vehicleId?.id || trip.vehicleId))?.registrationNumber || 'N/A';
                  const routeName = trip.routeId?.name || routes.find(r => (r._id || r.id) === (trip.routeId?._id || trip.routeId?.id || trip.routeId))?.name || 'N/A';
                  const collected = trip.dairyConfirmation?.collectionTotals?.milk || trip.summary?.totalMilk || 0;
                  const dairy = trip.dairyConfirmation?.totalMilkQuantity || trip.summary?.totalMilk || 0;
                  const diff = trip.dairyConfirmation?.variance?.milk || (dairy - collected);
                  const tripId = (trip._id || trip.id).toString();
                  const shortId = tripId.substring(tripId.length - 6);

                  return (
                    <TouchableOpacity
                      key={trip._id || trip.id}
                      style={styles.tripItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        navigation.navigate('MilkTruckDriverTripDetails', { tripId: trip._id || trip.id });
                      }}
                    >
                      <View style={styles.tripItemContent}>
                        <View style={styles.tripHeader}>
                          <Text style={styles.tripDate}>
                            {new Date(trip.endTime || trip.startTime || trip.createdAt).toLocaleDateString()}
                          </Text>
                          <Text style={styles.tripTime}>
                            {new Date(trip.endTime || trip.startTime || trip.createdAt).toLocaleTimeString()}
                          </Text>
                        </View>
                        <Text style={styles.tripId}>Trip #{shortId}</Text>
                        <Text style={styles.tripRoute}>{routeName}</Text>
                        <Text style={styles.tripVehicle}>{vehicleReg}</Text>
                        <View style={styles.tripStats}>
                          <Text style={styles.tripStatLabel}>Collected:</Text>
                          <Text style={styles.tripStatValue}>{collected.toFixed(2)} L</Text>
                        </View>
                        <View style={styles.tripStats}>
                          <Text style={styles.tripStatLabel}>Dairy Rec.:</Text>
                          <Text style={styles.tripStatValue}>{dairy.toFixed(2)} L</Text>
                        </View>
                        <View style={styles.tripStats}>
                          <Text style={styles.tripStatLabel}>Variance:</Text>
                          <Text style={[styles.tripStatValue, diff < 0 ? styles.negativeVariance : diff > 0 ? styles.positiveVariance : styles.neutralVariance]}>
                            {diff > 0 ? '+' : ''}{diff !== 0 ? diff.toFixed(2) : '-'} L
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, trip.status === 'completed' ? styles.completedBadge :
                          trip.status === 'in_progress' ? styles.activeBadge : styles.pendingBadge]}>
                          <Text style={styles.statusText}>
                            {trip.status === 'completed' ? 'Completed' : trip.status === 'in_progress' ? 'In Progress' : trip.status}
                          </Text>
                        </View>
                      </View>
                      <Button
                        variant="primary"
                        onPress={() => {
                          navigation.navigate('MilkTruckOwnerTripDetails', { tripId: trip._id || trip.id });
                        }}
                        style={styles.viewButton}
                      >
                        View Details
                      </Button>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.lg,
    color: colors.background.primary,
    fontWeight: typography.fontWeight.medium,
  },
  header: {
    marginBottom: 16,
  },
  backButton: {
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  driverInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  statValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
    marginBottom: spacing.xs,
  },
  completedStat: {
    color: colors.success[600],
  },
  activeStat: {
    color: colors.warning[600],
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  emptyText: {
    textAlign: 'center',
    padding: spacing.xl,
    color: colors.text.secondary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
  },
  emptySubtext: {
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    color: colors.text.tertiary,
    fontSize: typography.fontSize.base,
  },
  tripsList: {
    gap: 12,
  },
  tripItem: {
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    ...shadows.md,
  },
  tripItemContent: {
    marginBottom: 12,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  tripDate: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  tripTime: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  tripId: {
    fontSize: typography.fontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  tripRoute: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  tripVehicle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  tripStatLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  tripStatValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  negativeVariance: {
    color: colors.error[600],
  },
  positiveVariance: {
    color: colors.success[600],
  },
  neutralVariance: {
    color: colors.text.tertiary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  completedBadge: {
    backgroundColor: colors.success[100],
  },
  activeBadge: {
    backgroundColor: colors.warning[100],
  },
  pendingBadge: {
    backgroundColor: colors.background.secondary,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  viewButton: {
    marginTop: spacing.sm,
  },
  modalContent: {
    maxHeight: 500,
  },
  tripDetails: {
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
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

export default MilkTruckOwnerDriverTrips;
