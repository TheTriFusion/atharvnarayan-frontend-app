import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Animated, Platform, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getMilkTruckVehicles, getMilkTruckDrivers, addMilkTruckVehicle, updateMilkTruckVehicle, deleteMilkTruckVehicle } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
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

const VehicleManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const { success, error: showError } = useToast();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [formData, setFormData] = useState({
    registrationNumber: '',
    capacity: '',
    assignedDriver: '',
  });
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
      const [vehiclesData, driversData] = await Promise.all([
        getMilkTruckVehicles(ownerId),
        getMilkTruckDrivers(ownerId),
      ]);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setDrivers(Array.isArray(driversData) ? driversData : []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      showError(error.message || 'Failed to load data');
      setVehicles([]);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const vehicleData = {
      ...formData,
      capacity: parseFloat(formData.capacity),
      assignedDriver: formData.assignedDriver || null,
    };

    try {
      if (editingVehicle) {
        await updateMilkTruckVehicle(editingVehicle._id || editingVehicle.id, vehicleData);
        success('Vehicle updated successfully');
      } else {
        await addMilkTruckVehicle(vehicleData);
        success('Vehicle added successfully');
      }

      resetForm();
      await loadData();
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      showError(error.message || 'Failed to save vehicle');
    }
  };

  const handleEdit = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setFormData({
      registrationNumber: vehicle.registrationNumber || '',
      capacity: vehicle.capacity?.toString() || '',
      assignedDriver: vehicle.assignedDriver || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
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
              await deleteMilkTruckVehicle(id);
              success('Vehicle deleted successfully');
              await loadData();
            } catch (error: any) {
              console.error('Error deleting vehicle:', error);
              showError(error.message || 'Failed to delete vehicle');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({ registrationNumber: '', capacity: '', assignedDriver: '' });
    setEditingVehicle(null);
    setShowForm(false);
  };

  const driverOptions = drivers.map(d => ({
    value: d._id || d.id,
    label: d.name || 'Unknown Driver',
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[colors.secondary[600], colors.secondary[400], colors.background.primary]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.8 }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}

        <View style={styles.headerSpacer} />
        <ScreenHeader
          title="Fleet Management"
          subtitle="Manage Vehicles & Assignments"
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
              <ActivityIndicator color={colors.secondary[500]} size="large" />
              <Text style={styles.loadingText}>Loading fleet data...</Text>
            </View>
          ) : !Array.isArray(vehicles) || vehicles.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🚚</Text>
              <Text style={styles.emptyText}>No vehicles in fleet</Text>
              <Button
                variant="primary"
                onPress={() => setShowForm(true)}
                style={styles.emptyButton}
              >
                Add First Vehicle
              </Button>
            </Card>
          ) : (
            <View style={styles.list}>
              {vehicles.map((vehicle) => {
                const driver = Array.isArray(drivers) ? drivers.find(d => (d._id || d.id) === vehicle.assignedDriver) : null;
                return (
                  <View key={vehicle._id || vehicle.id} style={styles.listItem}>
                    <View style={styles.listItemHeader}>
                      <View style={[styles.vehicleIconContainer, { backgroundColor: colors.secondary[50] }]}>
                        <Text style={styles.vehicleIcon}>🚚</Text>
                      </View>
                      <View style={styles.vehicleMainInfo}>
                        <Text style={styles.listItemName}>{vehicle.registrationNumber}</Text>
                        <View style={styles.capacityContainer}>
                          <Text style={styles.capacityLabel}>Capacity:</Text>
                          <Text style={styles.capacityValue}>{vehicle.capacity} Liters</Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: driver ? colors.success[50] : colors.warning[50] }]}>
                        <Text style={[styles.statusText, { color: driver ? colors.success[700] : colors.warning[700] }]}>
                          {driver ? 'Active' : 'Unassigned'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.driverSection}>
                      <Text style={styles.driverLabel}>ASSIGNED DRIVER</Text>
                      <View style={styles.driverInfoRow}>
                        <View style={styles.miniAvatar}>
                          <Text style={styles.miniAvatarText}>
                            {driver?.name ? driver.name.charAt(0).toUpperCase() : '?'}
                          </Text>
                        </View>
                        <Text style={styles.driverName}>
                          {driver?.name || 'No driver assigned'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.listItemActions}>
                      <TouchableOpacity
                        onPress={() => handleEdit(vehicle)}
                        style={[styles.premiumActionBtn, styles.editBtn]}
                      >
                        <Text style={styles.editBtnText}>✏️ Edit Vehicle</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDelete(vehicle._id || vehicle.id)}
                        style={styles.iconActionBtn}
                      >
                        <Text style={styles.iconEmoji}>🗑️</Text>
                      </TouchableOpacity>
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
        title={editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
      >
        <View style={styles.formContainer}>
          <Input
            label="Registration Number"
            value={formData.registrationNumber}
            onChangeText={(value) => handleInputChange('registrationNumber', value)}
            placeholder="e.g. MH-12-ABCD"
          />
          <Input
            label="Capacity (Liters)"
            value={formData.capacity}
            onChangeText={(value) => handleInputChange('capacity', value)}
            keyboardType="decimal-pad"
            placeholder="e.g. 500.5"
          />
          <Select
            label="Assign Driver"
            value={formData.assignedDriver}
            onChange={(value) => handleInputChange('assignedDriver', value as string)}
            options={[
              { value: '', label: 'Keep Unassigned' },
              ...driverOptions,
            ]}
          />
          <View style={styles.modalFooter}>
            <Button
              variant="primary"
              onPress={handleSubmit}
              style={styles.modalSubmitBtn}
            >
              {editingVehicle ? 'Save Changes' : 'Register Vehicle'}
            </Button>
            <TouchableOpacity onPress={resetForm} style={styles.cancelLink}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    color: colors.secondary[600],
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
    borderColor: colors.secondary[50],
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  vehicleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleIcon: {
    fontSize: 26,
  },
  vehicleMainInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  listItemName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    marginBottom: 4,
  },
  capacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  capacityLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  capacityValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.secondary[600],
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  driverSection: {
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  driverLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.secondary[700],
  },
  driverName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[800],
  },
  divider: {
    height: 1,
    backgroundColor: colors.secondary[50],
    marginVertical: spacing.sm,
  },
  listItemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  premiumActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: '#fff',
    borderColor: colors.secondary[200],
    flex: 1,
    marginRight: spacing.md,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.secondary[600],
    textAlign: 'center',
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.error[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 16,
  },
  formContainer: {
    padding: spacing.md,
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

export default VehicleManagement;
