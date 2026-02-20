import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Platform, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { getMilkTruckTrips, getMilkTruckBMCs, getMilkTruckVehicles, getMilkTruckDrivers, getMilkTruckRoutes, getMilkTruckPricing } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Select from '../../../components/common/Select';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';
import { useToast } from '../../../contexts/ToastContext';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import ScreenHeader from '../../../components/common/ScreenHeader';

const Reports: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const navigation = useNavigation<any>();
  const { error: showError } = useToast();
  const [trips, setTrips] = useState<any[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    vehicleId: '',
    driverId: '',
  });
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAllData();
  }, [selectedOwnerId]);

  useEffect(() => {
    applyFilters();
  }, [filters, trips]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      const [tripsData, vehiclesData, driversData, pricingData] = await Promise.all([
        getMilkTruckTrips(ownerId),
        getMilkTruckVehicles(ownerId),
        getMilkTruckDrivers(ownerId),
        getMilkTruckPricing(),
      ]);

      const tripsArray = Array.isArray(tripsData) ? tripsData : [];
      const completedTrips = tripsArray.filter(t => t.status === 'completed');

      setTrips(completedTrips);
      setFilteredTrips(completedTrips);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setDrivers(Array.isArray(driversData) ? driversData : []);
      setPricing(pricingData || { basePricePerLiter: 50, fatPricePerPercent: 2, snfPricePerPercent: 1 });

      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } catch (error: any) {
      console.error('Error loading reports data:', error);
      showError(error.message || 'Failed to load reports');
      setPricing({ basePricePerLiter: 50, fatPricePerPercent: 2, snfPricePerPercent: 1 });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...trips];

    if (filters.startDate) {
      filtered = filtered.filter(t =>
        new Date(t.startTime) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(t =>
        new Date(t.startTime) <= new Date(filters.endDate)
      );
    }

    if (filters.vehicleId) {
      filtered = filtered.filter(t => (t.vehicleId?._id || t.vehicleId?.id || t.vehicleId) === filters.vehicleId);
    }

    if (filters.driverId) {
      filtered = filtered.filter(t => (t.driverId?._id || t.driverId?.id || t.driverId) === filters.driverId);
    }

    setFilteredTrips(filtered);
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const calculateTripPayment = (trip: any) => {
    if (!trip.dairyConfirmation || !pricing) return 0;

    const { totalMilkQuantity, fatContent, snfContent } = trip.dairyConfirmation;
    const baseAmount = pricing.basePricePerLiter * totalMilkQuantity;
    const fatAmount = pricing.fatPricePerPercent * fatContent * totalMilkQuantity;
    const snfAmount = pricing.snfPricePerPercent * snfContent * totalMilkQuantity;

    return baseAmount + fatAmount + snfAmount;
  };

  const totalRevenue = filteredTrips.reduce((acc, t) => acc + calculateTripPayment(t), 0);
  const totalMilk = filteredTrips.reduce((acc, t) => acc + (t.dairyConfirmation?.totalMilkQuantity || 0), 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#0F172A" size="large" />
        <Text style={styles.loadingText}>Compiling reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#F1F5F9', '#FFFFFF']}
        style={styles.backgroundGradient}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}

        <View style={styles.headerSpacer} />
        <ScreenHeader
          title="Analysis & Reports"
          subtitle="Revenue & Performance Audit"
          transparent
        />

        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Summary Hero */}
          <View style={styles.summaryHero}>
            <View style={styles.heroItem}>
              <Text style={styles.heroLabel}>AUDITED MILK</Text>
              <View style={styles.heroRow}>
                <Text style={styles.heroVal}>{totalMilk.toLocaleString()}</Text>
                <Text style={styles.heroUnit}>Ltrs</Text>
              </View>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroItem}>
              <Text style={styles.heroLabel}>TOTAL SETTLEMENT</Text>
              <View style={styles.heroRow}>
                <Text style={[styles.heroVal, { color: colors.success[600] }]}>₹{totalRevenue.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Collapsible Filters? Let's just do a clean card */}
          <Card style={styles.filterCard}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Dynamic Filters</Text>
              <TouchableOpacity onPress={() => setFilters({ startDate: '', endDate: '', vehicleId: '', driverId: '' })}>
                <Text style={styles.resetBtn}>Reset All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterGrid}>
              <View style={styles.filterGroup}>
                <Input label="From Date" value={filters.startDate} onChangeText={(v) => handleFilterChange('startDate', v)} placeholder="YYYY-MM-DD" style={styles.compactInput} />
              </View>
              <View style={styles.filterGroup}>
                <Input label="To Date" value={filters.endDate} onChangeText={(v) => handleFilterChange('endDate', v)} placeholder="YYYY-MM-DD" style={styles.compactInput} />
              </View>
            </View>
            <View style={styles.filterGrid}>
              <View style={styles.filterGroup}>
                <Select label="Vehicle" value={filters.vehicleId} onChange={(v) => handleFilterChange('vehicleId', v as string)} options={[{ value: '', label: 'All Fleet' }, ...vehicles.map(v => ({ value: v._id || v.id, label: v.registrationNumber }))]} />
              </View>
              <View style={styles.filterGroup}>
                <Select label="Driver" value={filters.driverId} onChange={(v) => handleFilterChange('driverId', v as string)} options={[{ value: '', label: 'All Staff' }, ...drivers.map(d => ({ value: d._id || d.id, label: d.name }))]} />
              </View>
            </View>
          </Card>

          {/* List */}
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Mission Log ({filteredTrips.length})</Text>
          </View>

          {filteredTrips.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📉</Text>
              <Text style={styles.emptyText}>No matching logs found</Text>
            </View>
          ) : (
            <View style={styles.tripList}>
              {filteredTrips.map((trip) => {
                const vehicle = vehicles.find(v => (v._id || v.id) === (trip.vehicleId?._id || trip.vehicleId?.id || trip.vehicleId));
                const driver = drivers.find(d => (d._id || d.id) === (trip.driverId?._id || trip.driverId?.id || trip.driverId));
                const payment = calculateTripPayment(trip);
                const tripDate = new Date(trip.endTime || trip.startTime);

                return (
                  <TouchableOpacity
                    key={trip._id || trip.id}
                    style={styles.reportItem}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('MilkTruckOwnerTripDetails', { tripId: trip._id || trip.id })}
                  >
                    <View style={styles.reportLeft}>
                      <View style={styles.miniBadge}>
                        <Text style={styles.miniBadgeText}>{tripDate.getDate()}</Text>
                      </View>
                      <View>
                        <Text style={styles.reportDate}>{tripDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</Text>
                        <Text style={styles.reportSub}>{vehicle?.registrationNumber || 'N/A'} • {driver?.name || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={styles.reportRight}>
                      <Text style={styles.reportMilk}>{trip.dairyConfirmation?.totalMilkQuantity?.toFixed(1) || '0'} L</Text>
                      <Text style={styles.reportRevenue}>₹{payment.toFixed(0)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: '#0F172A',
    fontWeight: '500',
  },
  summaryHero: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.lg,
  },
  heroItem: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  heroVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  heroUnit: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  heroDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: spacing.lg,
  },
  filterCard: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary[900],
  },
  resetBtn: {
    fontSize: 12,
    color: colors.primary[500],
    fontWeight: '600',
  },
  filterGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  filterGroup: {
    flex: 1,
  },
  compactInput: {
    height: 44,
  },
  listHeader: {
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary[900],
  },
  tripList: {
    gap: spacing.sm,
  },
  reportItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  reportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  miniBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary[600],
  },
  reportDate: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary[900],
  },
  reportSub: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  reportRight: {
    alignItems: 'flex-end',
  },
  reportMilk: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary[900],
  },
  reportRevenue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.success[600],
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 40,
    opacity: 0.2,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
});

export default Reports;
