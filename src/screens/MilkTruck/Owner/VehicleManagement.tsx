import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
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

  useEffect(() => {
    loadData();
  }, [selectedOwnerId]);

  const loadData = async () => {
    try {
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
    <ScrollView style={styles.container}>
      {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}
      
      <View style={styles.header}>
        <Text style={styles.title}>Vehicle Management</Text>
        <Button
          variant="primary"
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Add New Vehicle
        </Button>
      </View>

      <Modal
        visible={showForm}
        onClose={resetForm}
        title={editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
      >
        <View style={styles.form}>
          <Input
            label="Registration Number"
            value={formData.registrationNumber}
            onChangeText={(value) => handleInputChange('registrationNumber', value)}
            required
            placeholder="e.g., MH-12-ABCD"
          />
          <Input
            label="Capacity (Liters)"
            value={formData.capacity}
            onChangeText={(value) => handleInputChange('capacity', value)}
            required
            keyboardType="decimal-pad"
            placeholder="Enter capacity"
          />
          <Select
            label="Assigned Driver"
            value={formData.assignedDriver}
            onChange={(value) => handleInputChange('assignedDriver', value as string)}
            options={[
              { value: '', label: 'Select a driver (optional)' },
              ...driverOptions,
            ]}
          />
          <View style={styles.formButtons}>
            <Button variant="primary" onPress={handleSubmit}>
              {editingVehicle ? 'Update' : 'Add'} Vehicle
            </Button>
            <Button variant="secondary" onPress={resetForm}>
              Cancel
            </Button>
          </View>
        </View>
      </Modal>

      <Card title="Vehicle List">
        {!Array.isArray(vehicles) || vehicles.length === 0 ? (
          <Text style={styles.emptyText}>No vehicles found. Add your first vehicle to get started.</Text>
        ) : (
          <View style={styles.list}>
            {vehicles.map((vehicle) => {
              const driver = Array.isArray(drivers) ? drivers.find(d => (d._id || d.id) === vehicle.assignedDriver) : null;
              return (
                <View key={vehicle._id || vehicle.id} style={styles.listItem}>
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemName}>{vehicle.registrationNumber}</Text>
                    <Text style={styles.listItemDetail}>Capacity: {vehicle.capacity}L</Text>
                    <Text style={styles.listItemDetail}>
                      Driver: {driver?.name || 'Unassigned'}
                    </Text>
                  </View>
                  <View style={styles.listItemActions}>
                    <Button
                      variant="secondary"
                      onPress={() => handleEdit(vehicle)}
                      style={styles.actionButton}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onPress={() => handleDelete(vehicle._id || vehicle.id)}
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
  form: {
    gap: 16,
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

export default VehicleManagement;
