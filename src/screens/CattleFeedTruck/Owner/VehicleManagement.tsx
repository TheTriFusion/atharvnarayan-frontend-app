import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';

interface Vehicle {
  _id: string;
  registrationNumber: string;
  vehicleType?: string;
  capacity?: string;
  driverAssigned?: string;
  status?: string;
}

const VehicleManagement: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    registrationNumber: '',
    vehicleType: '',
    capacity: '',
    driverAssigned: '',
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await cattleFeedTruckAPI.getVehicles();
      setVehicles(Array.isArray(response) ? response : (Array.isArray(response.data) ? response.data : []));
    } catch (error: any) {
      console.error('Error fetching vehicles:', error);
      toast.error('Error loading vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const vehicleData = {
        ...formData,
        ownerId: user?._id || user?.id,
      };

      if (editingVehicle) {
        await cattleFeedTruckAPI.updateVehicle(editingVehicle._id, vehicleData);
        toast.success('Vehicle updated successfully!');
      } else {
        await cattleFeedTruckAPI.createVehicle(vehicleData);
        toast.success('Vehicle created successfully!');
      }
      setShowModal(false);
      resetForm();
      fetchVehicles();
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      registrationNumber: vehicle.registrationNumber,
      vehicleType: vehicle.vehicleType || '',
      capacity: vehicle.capacity || '',
      driverAssigned: vehicle.driverAssigned || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Vehicle', 'Are you sure you want to delete this vehicle?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await cattleFeedTruckAPI.deleteVehicle(id);
            toast.success('Vehicle deleted successfully!');
            fetchVehicles();
          } catch (error: any) {
            console.error('Error deleting vehicle:', error);
            toast.error('Error deleting vehicle');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setFormData({ registrationNumber: '', vehicleType: '', capacity: '', driverAssigned: '' });
    setEditingVehicle(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vehicle Management</Text>
        <Button
          onPress={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Add Vehicle
        </Button>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
      ) : (
        <Card style={styles.listCard}>
          {vehicles.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No vehicles found. Add your first vehicle to get started.
              </Text>
            </View>
          ) : (
            <FlatList
              data={vehicles}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              renderItem={({ item: vehicle }) => (
                <View style={styles.vehicleItem}>
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleRegistration}>{vehicle.registrationNumber}</Text>
                    <Text style={styles.vehicleType}>{vehicle.vehicleType || 'N/A'}</Text>
                    <Text style={styles.vehicleCapacity}>
                      Capacity: {vehicle.capacity || 'N/A'} tons
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      (vehicle.status === 'Active' || !vehicle.status) ? styles.statusActive : styles.statusInactive
                    ]}>
                      <Text style={[
                        styles.statusText,
                        (vehicle.status === 'Active' || !vehicle.status) ? styles.statusActiveText : styles.statusInactiveText
                      ]}>
                        {vehicle.status || 'Active'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.vehicleActions}>
                    <Button
                      onPress={() => handleEdit(vehicle)}
                      variant="secondary"
                      style={styles.actionButton}
                    >
                      Edit
                    </Button>
                    <Button
                      onPress={() => handleDelete(vehicle._id)}
                      variant="danger"
                      style={styles.actionButton}
                    >
                      Delete
                    </Button>
                  </View>
                </View>
              )}
            />
          )}
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
      >
        <Input
          label="Registration Number *"
          value={formData.registrationNumber}
          onChangeText={(text) => setFormData({ ...formData, registrationNumber: text })}
          placeholder="e.g., MH-12-AB-1234"
          required
        />
        <Input
          label="Vehicle Type"
          value={formData.vehicleType}
          onChangeText={(text) => setFormData({ ...formData, vehicleType: text })}
          placeholder="e.g., Truck, Lorry"
        />
        <Input
          label="Capacity (tons)"
          value={formData.capacity}
          onChangeText={(text) => setFormData({ ...formData, capacity: text })}
          keyboardType="numeric"
          placeholder="e.g., 10"
        />
        <Input
          label="Driver Assigned"
          value={formData.driverAssigned}
          onChangeText={(text) => setFormData({ ...formData, driverAssigned: text })}
          placeholder="Optional"
        />
        <View style={styles.modalActions}>
          <Button
            onPress={() => {
              setShowModal(false);
              resetForm();
            }}
            variant="secondary"
            style={styles.modalButton}
          >
            Cancel
          </Button>
          <Button onPress={handleSubmit} style={styles.modalButton}>
            {editingVehicle ? 'Update' : 'Create'}
          </Button>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  loader: {
    marginVertical: 32,
  },
  listCard: {
    margin: 16,
    marginTop: 0,
  },
  vehicleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleRegistration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  vehicleType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  vehicleCapacity: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#f3f4f6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusActiveText: {
    color: '#16a34a',
  },
  statusInactiveText: {
    color: '#374151',
  },
  vehicleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default VehicleManagement;
