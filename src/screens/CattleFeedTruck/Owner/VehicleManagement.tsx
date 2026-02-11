import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Animated, RefreshControl, StatusBar, Platform, TextInput } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';

interface Vehicle {
  _id: string;
  registrationNumber: string;
  vehicleType?: string;
  capacity?: string;
  assignedDriver?: string;
  status?: string;
}

const VehicleManagement: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Refresh when focused
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
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
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredVehicles(vehicles);
    } else {
      const filtered = vehicles.filter(vehicle =>
        vehicle.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.vehicleType?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredVehicles(filtered);
    }
  }, [searchQuery, vehicles]);

  const fetchData = async () => {
    try {
      const [vehiclesRes, driversRes] = await Promise.all([
        cattleFeedTruckAPI.getVehicles(user?.id),
        cattleFeedTruckAPI.getDrivers(user?.id)
      ]);

      const vehiclesData = Array.isArray(vehiclesRes) ? vehiclesRes : (Array.isArray(vehiclesRes.data) ? vehiclesRes.data : []);
      const driversData = Array.isArray(driversRes) ? driversRes : (Array.isArray(driversRes.data) ? driversRes.data : []);

      setVehicles(vehiclesData);
      setFilteredVehicles(vehiclesData);
      setDrivers(driversData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleAdd = () => {
    navigation.navigate('ManageVehicle');
  };

  const handleEdit = (vehicle: Vehicle) => {
    navigation.navigate('ManageVehicle', { vehicle });
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Vehicle',
      'Are you sure you want to delete this vehicle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await cattleFeedTruckAPI.deleteVehicle(id);
              toast.success('Vehicle deleted successfully!');
              fetchData();
            } catch (error: any) {
              console.error('Error deleting vehicle:', error);
              toast.error('Error deleting vehicle');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing && vehicles.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading Fleet...</Text>
      </View>
    );
  }

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
        title="Vehicle Management"
        subtitle="Manage your transport fleet"
        transparent
        titleStyle={{ color: '#fff' }}
        subtitleStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAdd}
          >
            <Text style={styles.addButtonText}>+ New</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search by registration number..."
            placeholderTextColor={colors.text.tertiary}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {filteredVehicles.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Text style={styles.emptyIcon}>🚚</Text>
              </View>
              <Text style={styles.emptyTitle}>No Vehicles Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? `No results match "${searchQuery}"` : "You haven't registered any vehicles yet."}
              </Text>
              <Button
                onPress={() => searchQuery ? setSearchQuery('') : handleAdd()}
                variant="outline"
                style={styles.emptyButton}
              >
                {searchQuery ? "Clear Search" : "Add Vehicle"}
              </Button>
            </View>
          ) : (
            <View style={styles.list}>
              {filteredVehicles.map((vehicle) => (
                <Card key={vehicle._id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.iconContainer}>
                      <Text style={styles.iconEmoji}>🚛</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.registration}>{vehicle.registrationNumber}</Text>
                      <Text style={styles.type}>{vehicle.vehicleType || 'Commercial Vehicle'}</Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      (vehicle.status === 'Active' || !vehicle.status) ? styles.statusActive : styles.statusInactive
                    ]}>
                      <Text style={[
                        styles.statusText,
                        (vehicle.status === 'Active' || !vehicle.status) ? styles.statusActiveText : styles.statusInactiveText
                      ]}>
                        {(vehicle.status || 'Active').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.details}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Capacity</Text>
                      <Text style={styles.detailValue}>{vehicle.capacity ? `${vehicle.capacity} Tons` : 'N/A'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Driver</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>
                        {drivers.find(d => d._id === vehicle.assignedDriver)?.name || 'Unassigned'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.editBtn]}
                      onPress={() => handleEdit(vehicle)}
                    >
                      <Text style={styles.editBtnText}>Manage</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => handleDelete(vehicle._id)}
                    >
                      <Text style={styles.deleteBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          )}
          <View style={{ height: 100 }} />
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
    height: 300,
  },
  headerSpacer: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
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
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    height: 48,
    ...shadows.md,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
  },
  clearIcon: {
    fontSize: 14,
    color: colors.text.tertiary,
    padding: 4,
  },
  list: {
    gap: 16,
    marginTop: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: '#fff',
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  registration: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  type: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: colors.background.tertiary,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusActiveText: {
    color: '#16a34a',
  },
  statusInactiveText: {
    color: colors.text.tertiary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 12,
  },
  details: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: '#fff',
    borderColor: colors.primary[600],
  },
  editBtnText: {
    color: colors.primary[600],
    fontWeight: '600',
    fontSize: 14,
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  deleteBtnText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyButton: {
    width: 160,
  },
});


export default VehicleManagement;
