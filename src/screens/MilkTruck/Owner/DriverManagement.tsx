import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Animated, Platform, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getMilkTruckDrivers, getMilkTruckVehicles, getMilkTruckTrips, addMilkTruckDriver, updateMilkTruckDriver, deleteMilkTruckDriver } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';
import { useToast } from '../../../contexts/ToastContext';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import ScreenHeader from '../../../components/common/ScreenHeader';
import LinearGradient from 'react-native-linear-gradient';

const DriverManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const navigation = useNavigation<any>();
  const { success, error: showError } = useToast();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    licenseNumber: '',
    phoneNumber: '',
    password: '',
  });
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadData();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [selectedOwnerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      const [driversData, vehiclesData, tripsData] = await Promise.all([
        getMilkTruckDrivers(ownerId),
        getMilkTruckVehicles(ownerId),
        getMilkTruckTrips(ownerId),
      ]);
      setDrivers(Array.isArray(driversData) ? driversData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setTrips(Array.isArray(tripsData) ? tripsData : []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      showError(error.message || 'Failed to load data');
      setDrivers([]);
      setVehicles([]);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const getDriverTripStats = (driverId: string) => {
    const driverTrips = trips.filter(t => {
      const tripDriverId = t.driverId?._id || t.driverId?.id || t.driverId;
      return tripDriverId === driverId;
    });
    return {
      total: driverTrips.length,
      completed: driverTrips.filter(t => t.status === 'completed').length,
      active: driverTrips.filter(t => t.status === 'in_progress').length,
    };
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVehicleToggle = (vehicleId: string) => {
    setSelectedVehicles(prev => {
      if (prev.includes(vehicleId)) {
        return prev.filter(id => id !== vehicleId);
      } else {
        return [...prev, vehicleId];
      }
    });
  };

  const handleSubmit = async () => {
    const driverData = {
      ...formData,
      assignedVehicles: selectedVehicles,
    };

    try {
      if (editingDriver) {
        await updateMilkTruckDriver(editingDriver._id || editingDriver.id, driverData);
        success('Driver updated successfully');
      } else {
        await addMilkTruckDriver(driverData);
        success('Driver added successfully');
      }

      resetForm();
      await loadData();
    } catch (error: any) {
      console.error('Error saving driver:', error);
      showError(error.message || 'Failed to save driver');
    }
  };

  const handleEdit = (driver: any) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name || '',
      licenseNumber: driver.licenseNumber || '',
      phoneNumber: driver.phoneNumber || '',
      password: driver.password || '',
    });
    setSelectedVehicles(driver.assignedVehicles || []);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Driver',
      'Are you sure you want to delete this driver?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMilkTruckDriver(id);
              success('Driver deleted successfully');
              await loadData();
            } catch (error: any) {
              console.error('Error deleting driver:', error);
              showError(error.message || 'Failed to delete driver');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({ name: '', licenseNumber: '', phoneNumber: '', password: '' });
    setSelectedVehicles([]);
    setEditingDriver(null);
    setShowForm(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED', colors.background.primary]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.8 }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}

        <View style={styles.headerSpacer} />
        <ScreenHeader
          title="Team Management"
          subtitle="Manage Drivers & Missions"
          transparent
          rightAction={
            <TouchableOpacity
              onPress={() => {
                resetForm();
                setShowForm(true);
              }}
              style={styles.addButtonCircle}
            >
              <Text style={styles.addButtonIcon}>+</Text>
            </TouchableOpacity>
          }
        />

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {loading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator color="#8B5CF6" size="large" />
              <Text style={styles.loadingText}>Syncing team data...</Text>
            </View>
          ) : !Array.isArray(drivers) || drivers.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>No drivers registered</Text>
              <Button
                variant="primary"
                onPress={() => setShowForm(true)}
                style={[styles.emptyButton, { backgroundColor: '#8B5CF6' }]}
              >
                Hire First Driver
              </Button>
            </Card>
          ) : (
            <View style={styles.list}>
              {drivers.map((driver) => {
                const assignedVehicles = Array.isArray(vehicles) ? vehicles.filter(v =>
                  driver.assignedVehicles?.includes(v._id || v.id)
                ) : [];
                const tripStats = getDriverTripStats(driver._id || driver.id);
                return (
                  <View key={driver._id || driver.id} style={styles.listItem}>
                    <View style={styles.listItemHeader}>
                      <View style={styles.avatarContainer}>
                        <LinearGradient
                          colors={['#A78BFA', '#8B5CF6']}
                          style={styles.avatarGradient}
                        >
                          <Text style={styles.avatarText}>
                            {driver.name ? driver.name.charAt(0).toUpperCase() : 'D'}
                          </Text>
                        </LinearGradient>
                      </View>
                      <View style={styles.driverMainInfo}>
                        <Text style={styles.listItemName}>{driver.name}</Text>
                        <View style={styles.licenseBadge}>
                          <Text style={styles.licenseText}>🪪 {driver.licenseNumber}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.phoneCircle}
                        onPress={() => Alert.alert('Call Driver', `Calling ${driver.phoneNumber}`)}
                      >
                        <Text style={styles.phoneEmoji}>📞</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}>
                        <Text style={styles.statVal}>{tripStats.total}</Text>
                        <Text style={styles.statLab}>Trips</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={[styles.statVal, { color: colors.success[600] }]}>{tripStats.completed}</Text>
                        <Text style={styles.statLab}>Done</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={[styles.statVal, { color: colors.warning[600] }]}>{tripStats.active}</Text>
                        <Text style={styles.statLab}>Live</Text>
                      </View>
                    </View>

                    <View style={styles.vehicleChipSection}>
                      <Text style={styles.chipLabel}>AUTHORIZED FLEET</Text>
                      <View style={styles.chipContainer}>
                        {assignedVehicles.length > 0 ? (
                          assignedVehicles.map(v => (
                            <View key={v._id || v.id} style={styles.vehicleChip}>
                              <Text style={styles.chipText}>🚛 {v.registrationNumber}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.noVehiclesText}>No vehicles assigned</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.listItemActions}>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('MilkTruckOwnerDriverTrips', { driverId: driver._id || driver.id })}
                        style={[styles.premiumActionBtn, styles.historyBtn]}
                      >
                        <Text style={styles.historyBtnText}>📅 Trip Log</Text>
                      </TouchableOpacity>

                      <View style={styles.actionGroupRight}>
                        <TouchableOpacity
                          onPress={() => handleEdit(driver)}
                          style={styles.iconActionBtn}
                        >
                          <Text style={styles.iconEmoji}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(driver._id || driver.id)}
                          style={[styles.iconActionBtn, styles.dangerIconBtn]}
                        >
                          <Text style={styles.iconEmoji}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showForm}
        onClose={resetForm}
        title={editingDriver ? 'Update Driver' : 'Add New Driver'}
      >
        <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <Input
              label="Full Name"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="e.g. John Doe"
            />
            <Input
              label="License Number"
              value={formData.licenseNumber}
              onChangeText={(value) => handleInputChange('licenseNumber', value)}
              placeholder="e.g. DL-14-1234567"
            />
            <Input
              label="Phone Number"
              value={formData.phoneNumber}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
              placeholder="10-digit number"
              keyboardType="phone-pad"
            />
            <Input
              label="Dashboard Password"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              placeholder="Set driver login password"
              secureTextEntry
            />

            <View style={styles.vehicleSelectionSection}>
              <Text style={styles.selectionLabel}>Assign to Vehicles</Text>
              <View style={styles.selectionGrid}>
                {vehicles.map((vehicle) => {
                  const vehicleId = vehicle._id || vehicle.id;
                  const isSelected = selectedVehicles.includes(vehicleId);
                  return (
                    <TouchableOpacity
                      key={vehicleId}
                      style={[styles.selectionChip, isSelected && styles.selectionChipSelected]}
                      onPress={() => handleVehicleToggle(vehicleId)}
                    >
                      <Text style={[styles.selectionText, isSelected && styles.selectionTextSelected]}>
                        {vehicle.registrationNumber}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Button
                variant="primary"
                onPress={handleSubmit}
                style={[styles.modalSubmitBtn, { backgroundColor: '#8B5CF6' }]}
              >
                {editingDriver ? 'Save Changes' : 'Hire Driver'}
              </Button>
              <TouchableOpacity onPress={resetForm} style={styles.cancelLink}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Modal>
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
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  headerSpacer: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
  addButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  addButtonIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingWrapper: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: '#7C3AED',
    fontWeight: '500',
  },
  list: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    ...shadows.sm,
  },
  avatarGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  driverMainInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  listItemName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    marginBottom: 4,
  },
  licenseBadge: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  licenseText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: 'bold',
  },
  phoneCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.success[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneEmoji: {
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[800],
  },
  statLab: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  vehicleChipSection: {
    marginBottom: spacing.md,
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  vehicleChip: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
  },
  noVehiclesText: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: spacing.sm,
  },
  listItemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  premiumActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  historyBtn: {
    backgroundColor: '#fff',
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  historyBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  actionGroupRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerIconBtn: {
    backgroundColor: colors.error[50],
  },
  iconEmoji: {
    fontSize: 16,
  },
  formScroll: {
    maxHeight: 550,
  },
  formContainer: {
    padding: spacing.md,
  },
  vehicleSelectionSection: {
    marginTop: spacing.md,
  },
  selectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  selectionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  selectionChipSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: '#8B5CF6',
  },
  selectionText: {
    fontSize: 13,
    color: colors.text.primary,
  },
  selectionTextSelected: {
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  modalFooter: {
    marginTop: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  modalSubmitBtn: {
    width: '100%',
  },
  cancelLink: {
    padding: spacing.sm,
  },
  cancelText: {
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: borderRadius.xl,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.tertiary,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    width: '100%',
  },
});

export default DriverManagement;
