import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
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

  useEffect(() => {
    loadData();
  }, [selectedOwnerId]);

  const loadData = async () => {
    try {
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
    }
  };

  const handleViewTrips = (driverId: string) => {
    navigation.navigate('MilkTruckOwnerDriverTrips', { driverId });
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
    <ScrollView style={styles.container}>
      {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}
      
      <View style={styles.header}>
        <Text style={styles.title}>Driver Management</Text>
        <Button
          variant="primary"
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Add New Driver
        </Button>
      </View>

      <Modal
        visible={showForm}
        onClose={resetForm}
        title={editingDriver ? 'Edit Driver' : 'Add New Driver'}
      >
        <ScrollView style={styles.modalContent}>
          <View style={styles.form}>
            <Input
              label="Driver Name"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              required
              placeholder="Enter driver name"
            />
            <Input
              label="License Number"
              value={formData.licenseNumber}
              onChangeText={(value) => handleInputChange('licenseNumber', value)}
              required
              placeholder="Enter license number"
            />
            <Input
              label="Phone Number"
              value={formData.phoneNumber}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
              required
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
            <Input
              label="Password"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              required
              placeholder="Enter password"
              secureTextEntry
            />
            
            <View style={styles.vehiclesSection}>
              <Text style={styles.vehiclesLabel}>Assigned Vehicles</Text>
              <View style={styles.vehiclesList}>
                {vehicles.map((vehicle) => {
                  const vehicleId = vehicle._id || vehicle.id;
                  const isSelected = selectedVehicles.includes(vehicleId);
                  return (
                    <TouchableOpacity
                      key={vehicleId}
                      style={[styles.vehicleItem, isSelected && styles.vehicleItemSelected]}
                      onPress={() => handleVehicleToggle(vehicleId)}
                    >
                      <Text style={[styles.vehicleText, isSelected && styles.vehicleTextSelected]}>
                        {vehicle.registrationNumber} ({vehicle.capacity}L)
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.formButtons}>
              <Button variant="primary" onPress={handleSubmit}>
                {editingDriver ? 'Update' : 'Add'} Driver
              </Button>
              <Button variant="secondary" onPress={resetForm}>
                Cancel
              </Button>
            </View>
          </View>
        </ScrollView>
      </Modal>

      <Card title="Driver List">
        {!Array.isArray(drivers) || drivers.length === 0 ? (
          <Text style={styles.emptyText}>No drivers found. Add your first driver to get started.</Text>
        ) : (
          <View style={styles.list}>
            {drivers.map((driver) => {
              const assignedVehicles = Array.isArray(vehicles) ? vehicles.filter(v => 
                driver.assignedVehicles?.includes(v._id || v.id)
              ) : [];
              const tripStats = getDriverTripStats(driver._id || driver.id);
              return (
                <View key={driver._id || driver.id} style={styles.listItem}>
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemName}>{driver.name}</Text>
                    <Text style={styles.listItemDetail}>📞 {driver.phoneNumber || 'N/A'}</Text>
                    <Text style={styles.listItemDetail}>🪪 License: {driver.licenseNumber}</Text>
                    <Text style={styles.listItemDetail}>
                      🚛 Trips: {tripStats.total} ({tripStats.completed} completed, {tripStats.active} active)
                    </Text>
                    <Text style={styles.listItemDetail}>
                      🚚 Vehicles: {assignedVehicles.length > 0
                        ? assignedVehicles.map(v => v.registrationNumber).join(', ')
                        : 'None'}
                    </Text>
                  </View>
                  <View style={styles.listItemActions}>
                    <Button
                      variant="primary"
                      onPress={() => handleViewTrips(driver._id || driver.id)}
                      style={styles.actionButton}
                    >
                      View Trips
                    </Button>
                    <Button
                      variant="secondary"
                      onPress={() => handleEdit(driver)}
                      style={styles.actionButton}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onPress={() => handleDelete(driver._id || driver.id)}
                      style={styles.actionButton}
                    >
                      Delete
                    </Button>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalContent: {
    maxHeight: 600,
  },
  form: {
    gap: 16,
  },
  vehiclesSection: {
    marginBottom: 8,
  },
  vehiclesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  vehiclesList: {
    maxHeight: 160,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
  },
  vehicleItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 4,
    backgroundColor: '#f9fafb',
  },
  vehicleItemSelected: {
    backgroundColor: '#dbeafe',
  },
  vehicleText: {
    fontSize: 14,
    color: '#374151',
  },
  vehicleTextSelected: {
    color: '#1e40af',
    fontWeight: '500',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#6b7280',
  },
  list: {
    gap: 12,
  },
  listItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  listItemContent: {
    marginBottom: 12,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  listItemDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  listItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
});

export default DriverManagement;
