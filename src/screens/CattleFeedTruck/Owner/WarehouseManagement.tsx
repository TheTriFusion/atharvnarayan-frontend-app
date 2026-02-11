import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';

interface Warehouse {
  _id: string;
  name: string;
  location: string;
  capacity?: string;
  contact?: string;
}

const WarehouseManagement: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: '',
    contact: '',
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const response = await cattleFeedTruckAPI.getWarehouses(user?.id);
      setWarehouses(Array.isArray(response) ? response : (Array.isArray(response.data) ? response.data : []));
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
      toast.error('Error loading warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingWarehouse) {
        await cattleFeedTruckAPI.updateWarehouse(editingWarehouse._id, { ...formData, ownerId: user?.id });
        toast.success('Warehouse updated successfully!');
      } else {
        await cattleFeedTruckAPI.createWarehouse({ ...formData, ownerId: user?.id });
        toast.success('Warehouse created successfully!');
      }
      setShowModal(false);
      resetForm();
      fetchWarehouses();
    } catch (error: any) {
      console.error('Error saving warehouse:', error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      location: warehouse.location,
      capacity: warehouse.capacity || '',
      contact: warehouse.contact || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Warehouse', 'Are you sure you want to delete this warehouse?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await cattleFeedTruckAPI.deleteWarehouse(id);
            toast.success('Warehouse deleted successfully!');
            fetchWarehouses();
          } catch (error: any) {
            console.error('Error deleting warehouse:', error);
            toast.error('Error deleting warehouse');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setFormData({ name: '', location: '', capacity: '', contact: '' });
    setEditingWarehouse(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Warehouse Management</Text>
        <Button
          onPress={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Add Warehouse
        </Button>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
      ) : (
        <Card style={styles.listCard}>
          {warehouses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No warehouses found. Add your first warehouse.
              </Text>
            </View>
          ) : (
            <FlatList
              data={warehouses}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              renderItem={({ item: warehouse }) => (
                <View style={styles.warehouseItem}>
                  <View style={styles.warehouseInfo}>
                    <Text style={styles.warehouseName}>{warehouse.name}</Text>
                    <Text style={styles.warehouseLocation}>{warehouse.location}</Text>
                    {warehouse.capacity && (
                      <Text style={styles.warehouseDetail}>Capacity: {warehouse.capacity}</Text>
                    )}
                    {warehouse.contact && (
                      <Text style={styles.warehouseDetail}>Contact: {warehouse.contact}</Text>
                    )}
                  </View>
                  <View style={styles.warehouseActions}>
                    <Button
                      onPress={() => handleEdit(warehouse)}
                      variant="secondary"
                      style={styles.actionButton}
                    >
                      Edit
                    </Button>
                    <Button
                      onPress={() => handleDelete(warehouse._id)}
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
        title={editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
      >
        <Input
          label="Name *"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          required
        />
        <Input
          label="Location *"
          value={formData.location}
          onChangeText={(text) => setFormData({ ...formData, location: text })}
          required
        />
        <Input
          label="Capacity"
          value={formData.capacity}
          onChangeText={(text) => setFormData({ ...formData, capacity: text })}
          placeholder="Optional"
        />
        <Input
          label="Contact"
          value={formData.contact}
          onChangeText={(text) => setFormData({ ...formData, contact: text })}
          keyboardType="phone-pad"
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
            {editingWarehouse ? 'Update' : 'Create'}
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
  warehouseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  warehouseInfo: {
    flex: 1,
  },
  warehouseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  warehouseLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  warehouseDetail: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  warehouseActions: {
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

export default WarehouseManagement;
