import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getMilkTruckTrips, getMilkTruckBMCs, getMilkTruckVehicles, getMilkTruckDrivers, getMilkTruckRoutes } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

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

  if (!trip) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Trip Details" showBackButton />
        <View style={styles.content}>
          <Card variant="elevated">
            <Text style={styles.errorText}>Trip not found</Text>
          </Card>
        </View>
      </View>
    );
  }

  const vehicle = vehicles.find(v => (v._id || v.id) === (trip.vehicleId?._id || trip.vehicleId?.id || trip.vehicleId));
  const tripRoute = routes.find(r => (r._id || r.id) === (trip.routeId?._id || trip.routeId?.id || trip.routeId));
  const driver = drivers.find(d => (d._id || d.id) === (trip.driverId?._id || trip.driverId?.id || trip.driverId));
  const bmcEntries = trip.bmcEntries || [];
  const collected = trip.dairyConfirmation?.collectionTotals?.milk || trip.summary?.totalMilk || 0;
  const dairy = trip.dairyConfirmation?.totalMilkQuantity || trip.summary?.totalMilk || 0;
  const variance = trip.dairyConfirmation?.variance?.milk || (dairy - collected);

  // Calculate Kg Variances (Using data from backend if available, or manual calc)
  // Backend provides `variance` object in `dairyConfirmation`
  const fatKgDiff = trip.dairyConfirmation?.variance?.fat || 0;
  const snfKgDiff = trip.dairyConfirmation?.variance?.snf || 0;

  return (
    <ScrollView style={styles.container}>
      <ScreenHeader
        title="Trip Details"
        subtitle={`Trip #${((trip._id || trip.id || '').toString().substring((trip._id || trip.id || '').toString().length - 6))}`}
        showBackButton
      />
      <View style={styles.content}>
        {/* Basic Information */}
        <Card variant="elevated" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trip ID</Text>
            <Text style={styles.detailValue}>#{((trip._id || trip.id || '').toString().substring((trip._id || trip.id || '').toString().length - 6))}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: trip.status === 'completed' ? colors.success[100] : trip.status === 'in_progress' ? colors.warning[100] : colors.secondary[200] }]}>
              <Text style={[styles.statusText, { color: trip.status === 'completed' ? colors.success[700] : trip.status === 'in_progress' ? colors.warning[700] : colors.secondary[700] }]}>
                {trip.status?.replace('_', ' ').toUpperCase() || 'N/A'}
              </Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>
              {new Date(trip.date || trip.createdAt || '').toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Start Time</Text>
            <Text style={styles.detailValue}>
              {trip.startTime ? new Date(trip.startTime).toLocaleString() : 'N/A'}
            </Text>
          </View>
          {trip.endTime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>End Time</Text>
              <Text style={styles.detailValue}>
                {new Date(trip.endTime).toLocaleString()}
              </Text>
            </View>
          )}
        </Card>

        {/* Route & Vehicle Information */}
        <Card variant="elevated" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Route & Vehicle</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Route</Text>
            <Text style={styles.detailValue}>{tripRoute?.name || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vehicle</Text>
            <Text style={styles.detailValue}>{vehicle?.registrationNumber || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Driver</Text>
            <Text style={styles.detailValue}>{driver?.name || 'N/A'}</Text>
          </View>
        </Card>

        {/* Milk Collection Summary */}
        <Card variant="elevated" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Milk Collection Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Collected</Text>
              <Text style={styles.summaryValue}>{collected.toFixed(2)} L</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Dairy Received</Text>
              <Text style={styles.summaryValue}>{dairy.toFixed(2)} L</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Variance</Text>
              <Text style={[styles.summaryValue, variance < 0 ? styles.varianceNegative : variance > 0 ? styles.variancePositive : styles.varianceNeutral]}>
                {variance > 0 ? '+' : ''}{variance !== 0 ? variance.toFixed(2) : '0.00'} L
              </Text>
            </View>
          </View>
          {trip.dairyConfirmation && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Avg Fat Content</Text>
                <Text style={styles.detailValue}>
                  {trip.dairyConfirmation.averageFatContent?.toFixed(2) || '0.00'}%
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Avg SNF Content</Text>
                <Text style={styles.detailValue}>
                  {trip.dairyConfirmation.averageSnfContent?.toFixed(2) || '0.00'}%
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fat Diff (Kg)</Text>
                <Text style={[styles.detailValue, { fontWeight: 'bold' }, fatKgDiff < 0 ? styles.varianceNegative : fatKgDiff > 0 ? styles.variancePositive : styles.varianceNeutral]}>
                  {fatKgDiff > 0 ? '+' : ''}{fatKgDiff.toFixed(2)} kg
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>SNF Diff (Kg)</Text>
                <Text style={[styles.detailValue, { fontWeight: 'bold' }, snfKgDiff < 0 ? styles.varianceNegative : snfKgDiff > 0 ? styles.variancePositive : styles.varianceNeutral]}>
                  {snfKgDiff > 0 ? '+' : ''}{snfKgDiff.toFixed(2)} kg
                </Text>
              </View>
            </>
          )}
        </Card>

        {/* BMC Entries */}
        {bmcEntries.length > 0 && (
          <Card variant="elevated" style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>BMC Collections ({bmcEntries.length})</Text>
            {bmcEntries.map((entry: any, index: number) => {
              const bmc = bmcs.find(b => (b._id || b.id) === (entry.bmcId?._id || entry.bmcId?.id || entry.bmcId));
              return (
                <View key={index} style={styles.bmcEntry}>
                  <View style={styles.bmcEntryHeader}>
                    <Text style={styles.bmcName}>{bmc?.name || 'Unknown BMC'}</Text>
                    {entry.collectionData?.collectedAt && (
                      <Text style={styles.bmcTime}>
                        {new Date(entry.collectionData.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>

                  <View style={styles.bmcStatsRow}>
                    <View style={styles.bmcStatItem}>
                      <Text style={styles.bmcStatLabel}>Collected</Text>
                      <Text style={styles.bmcStatValue}>{entry.collectionData?.milkQuantity?.toFixed(2) || '0.00'} L</Text>
                    </View>

                    <View style={[styles.vertDivider]} />

                    <View style={styles.bmcStatItem}>
                      <Text style={styles.bmcStatLabel}>Dairy</Text>
                      <Text style={styles.bmcStatValue}>{entry.dairyVerifiedData?.milkQuantity?.toFixed(2) || '0.00'} L</Text>
                    </View>

                    <View style={[styles.vertDivider]} />

                    <View style={styles.bmcStatItem}>
                      <Text style={styles.bmcStatLabel}>Diff</Text>
                      {(() => {
                        const collected = entry.collectionData?.milkQuantity || 0;
                        const received = entry.dairyVerifiedData?.milkQuantity || 0;
                        const diff = received - collected;
                        return (
                          <Text style={[styles.bmcStatValue, diff < 0 ? styles.varianceNegative : diff > 0 ? styles.variancePositive : styles.varianceNeutral]}>
                            {diff > 0 ? '+' : ''}{diff !== 0 ? diff.toFixed(2) : '0.00'} L
                          </Text>
                        );
                      })()}
                    </View>
                  </View>

                  {/* Fat Kg Diff Row */}
                  <View style={styles.bmcStatsRow}>
                    <View style={styles.bmcStatItem}>
                      <Text style={styles.bmcStatLabel}>Collected Fat</Text>
                      {(() => {
                        const qty = entry.collectionData?.milkQuantity || 0;
                        const fat = entry.collectionData?.fatContent || 0;
                        const fatKg = (qty * fat) / 100;
                        return <Text style={styles.bmcStatValue}>{fatKg.toFixed(2)} kg</Text>;
                      })()}
                    </View>

                    <View style={[styles.vertDivider]} />

                    <View style={styles.bmcStatItem}>
                      <Text style={styles.bmcStatLabel}>Dairy Fat</Text>
                      {(() => {
                        const qty = entry.dairyVerifiedData?.milkQuantity || 0;
                        const fat = entry.dairyVerifiedData?.fatContent || 0;
                        const fatKg = (qty * fat) / 100;
                        return <Text style={styles.bmcStatValue}>{fatKg.toFixed(2)} kg</Text>;
                      })()}
                    </View>

                    <View style={[styles.vertDivider]} />

                    <View style={styles.bmcStatItem}>
                      <Text style={styles.bmcStatLabel}>Fat Diff</Text>
                      {(() => {
                        const cQty = entry.collectionData?.milkQuantity || 0;
                        const cFat = entry.collectionData?.fatContent || 0;
                        const cFatKg = (cQty * cFat) / 100;

                        const dQty = entry.dairyVerifiedData?.milkQuantity || 0;
                        const dFat = entry.dairyVerifiedData?.fatContent || 0;
                        const dFatKg = (dQty * dFat) / 100;

                        const diff = dFatKg - cFatKg;
                        return (
                          <Text style={[styles.bmcStatValue, diff < 0 ? styles.varianceNegative : diff > 0 ? styles.variancePositive : styles.varianceNeutral]}>
                            {diff > 0 ? '+' : ''}{diff !== 0 ? diff.toFixed(2) : '0.00'} kg
                          </Text>
                        );
                      })()}
                    </View>
                  </View>

                  {/* SNF Kg Diff Row */}
                  <View style={styles.bmcStatsRow}>
                    <View style={styles.bmcStatItem}>
                      <Text style={styles.bmcStatLabel}>Collected SNF</Text>
                      {(() => {
                        const qty = entry.collectionData?.milkQuantity || 0;
                        const snf = entry.collectionData?.snfContent || 0;
                        const snfKg = (qty * snf) / 100;
                        return <Text style={styles.bmcStatValue}>{snfKg.toFixed(2)} kg</Text>;
                      })()}
                    </View>

                    <View style={[styles.vertDivider]} />

                    <View style={styles.bmcStatItem}>
                      <Text style={styles.bmcStatLabel}>Dairy SNF</Text>
                      {(() => {
                        const qty = entry.dairyVerifiedData?.milkQuantity || 0;
                        const snf = entry.dairyVerifiedData?.snfContent || 0;
                        const snfKg = (qty * snf) / 100;
                        return <Text style={styles.bmcStatValue}>{snfKg.toFixed(2)} kg</Text>;
                      })()}
                    </View>

                    <View style={[styles.vertDivider]} />

                    <View style={styles.bmcStatItem}>
                      <Text style={styles.bmcStatLabel}>SNF Diff</Text>
                      {(() => {
                        const cQty = entry.collectionData?.milkQuantity || 0;
                        const cSnf = entry.collectionData?.snfContent || 0;
                        const cSnfKg = (cQty * cSnf) / 100;

                        const dQty = entry.dairyVerifiedData?.milkQuantity || 0;
                        const dSnf = entry.dairyVerifiedData?.snfContent || 0;
                        const dSnfKg = (dQty * dSnf) / 100;

                        const diff = dSnfKg - cSnfKg;
                        return (
                          <Text style={[styles.bmcStatValue, diff < 0 ? styles.varianceNegative : diff > 0 ? styles.variancePositive : styles.varianceNeutral]}>
                            {diff > 0 ? '+' : ''}{diff !== 0 ? diff.toFixed(2) : '0.00'} kg
                          </Text>
                        );
                      })()}
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </View>
    </ScrollView>
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
  sectionCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
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
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  summaryValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  variancePositive: {
    color: colors.success[600],
  },
  varianceNegative: {
    color: colors.error[600],
  },
  varianceNeutral: {
    color: colors.text.tertiary,
  },
  bmcEntry: {
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  bmcEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  bmcName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  bmcQuantity: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  bmcTime: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.error[600],
    textAlign: 'center',
    padding: spacing.lg,
  },
  bmcStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    marginTop: spacing.xs,
  },
  bmcStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  bmcStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: 2,
    fontWeight: typography.fontWeight.medium,
  },
  bmcStatValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  vertDivider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.border.light,
  },
});

export default TripDetails;

