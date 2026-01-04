import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useToast } from '../../../contexts/ToastContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';

interface Driver {
  _id: string;
  name: string;
  phoneNumber: string;
  licenseNumber?: string;
  address?: string;
}

const DriverManagement: React.FC = () => {
  const toast = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    licenseNumber: '',
    address: '',
    password: '',
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await cattleFeedTruckAPI.getDrivers();
      setDrivers(Array.isArray(response) ? response : (Array.isArray(response.data) ? response.data : []));
    } catch (error: any) {
      console.error('Error fetching drivers:', error);
      toast.error('Error loading drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingDriver) {
        const updateData: any = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await cattleFeedTruckAPI.updateDriver(editingDriver._id, updateData);
        toast.success('Driver updated successfully!');
      } else {
        const data = {
          ...formData,
          role: 'cattleFeedTruckDriver',
          systemType: 'cattleFeedTruck',
          password: formData.password || formData.phoneNumber,
        };
        await cattleFeedTruckAPI.createDriver(data);
        toast.success('Driver created successfully!');
      }
      setShowModal(false);
      resetForm();
      fetchDrivers();
    } catch (error: any) {
      console.error('Error saving driver:', error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phoneNumber: driver.phoneNumber,
      licenseNumber: driver.licenseNumber || '',
      address: driver.address || '',
      password: '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Driver', 'Are you sure you want to delete this driver?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await cattleFeedTruckAPI.deleteDriver(id);
            toast.success('Driver deleted successfully!');
            fetchDrivers();
          } catch (error: any) {
            console.error('Error deleting driver:', error);
            toast.error('Error deleting driver');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setFormData({ name: '', phoneNumber: '', licenseNumber: '', address: '', password: '' });
    setEditingDriver(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Driver Management</Text>
        <Button
          onPress={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Add Driver
        </Button>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
      ) : (
        <Card style={styles.listCard}>
          {drivers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No drivers found. Add your first driver to get started.
              </Text>
            </View>
          ) : (
            <FlatList
              data={drivers}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              renderItem={({ item: driver }) => (
                <View style={styles.driverItem}>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driver.name}</Text>
                    <Text style={styles.driverPhone}>{driver.phoneNumber}</Text>
                    {driver.licenseNumber && (
                      <Text style={styles.driverLicense}>License: {driver.licenseNumber}</Text>
                    )}
                    {driver.address && (
                      <Text style={styles.driverAddress}>{driver.address}</Text>
                    )}
                  </View>
                  <View style={styles.driverActions}>
                    <Button
                      onPress={() => handleEdit(driver)}
                      variant="secondary"
                      style={styles.actionButton}
                    >
                      Edit
                    </Button>
                    <Button
                      onPress={() => handleDelete(driver._id)}
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
        title={editingDriver ? 'Edit Driver' : 'Add Driver'}
      >
        <Input
          label="Name *"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          required
        />
        <Input
          label="Phone Number *"
          value={formData.phoneNumber}
          onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
          keyboardType="phone-pad"
          required
        />
        <Input
          label="License Number"
          value={formData.licenseNumber}
          onChangeText={(text) => setFormData({ ...formData, licenseNumber: text })}
          placeholder="Optional"
        />
        <Input
          label="Address"
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
          placeholder="Optional"
        />
        <Input
          label={editingDriver ? 'New Password (leave empty to keep current)' : 'Password *'}
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          secureTextEntry
          placeholder={editingDriver ? 'Optional' : 'Default: phone number'}
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
            {editingDriver ? 'Update' : 'Create'}
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
  driverItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  driverPhone: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  driverLicense: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  driverAddress: {
    fontSize: 12,
    color: '#9ca3af',
  },
  driverActions: {
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

export default DriverManagement;
