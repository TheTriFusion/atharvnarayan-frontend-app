import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';

interface DeliveryPoint {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
}

const DeliveryPointManagement: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState<DeliveryPoint | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    fetchDeliveryPoints();
  }, []);

  const fetchDeliveryPoints = async () => {
    try {
      const response = await cattleFeedTruckAPI.getDeliveryPoints(user?.id);
      setDeliveryPoints(Array.isArray(response) ? response : (Array.isArray(response.data) ? response.data : []));
    } catch (error: any) {
      console.error('Error fetching delivery points:', error);
      toast.error('Error loading delivery points');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingPoint) {
        await cattleFeedTruckAPI.updateDeliveryPoint(editingPoint._id, { ...formData, ownerId: user?.id });
        toast.success('Delivery point updated successfully!');
      } else {
        await cattleFeedTruckAPI.createDeliveryPoint({ ...formData, ownerId: user?.id });
        toast.success('Delivery point created successfully!');
      }
      setShowModal(false);
      resetForm();
      fetchDeliveryPoints();
    } catch (error: any) {
      console.error('Error saving delivery point:', error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleEdit = (point: DeliveryPoint) => {
    setEditingPoint(point);
    setFormData({
      name: point.name,
      contactPerson: point.contactPerson || '',
      phone: point.phone || '',
      address: point.address || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Delivery Point', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await cattleFeedTruckAPI.deleteDeliveryPoint(id);
            toast.success('Delivery point deleted successfully!');
            fetchDeliveryPoints();
          } catch (error: any) {
            console.error('Error deleting delivery point:', error);
            toast.error('Error deleting delivery point');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setFormData({ name: '', contactPerson: '', phone: '', address: '' });
    setEditingPoint(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Delivery Points</Text>
        <Button
          onPress={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Add Delivery Point
        </Button>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
      ) : (
        <Card style={styles.listCard}>
          {deliveryPoints.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No delivery points found. Add your first delivery point.
              </Text>
            </View>
          ) : (
            <FlatList
              data={deliveryPoints}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              renderItem={({ item: point }) => (
                <View style={styles.pointItem}>
                  <View style={styles.pointInfo}>
                    <Text style={styles.pointName}>{point.name}</Text>
                    {point.contactPerson && (
                      <Text style={styles.pointDetail}>Contact: {point.contactPerson}</Text>
                    )}
                    {point.phone && (
                      <Text style={styles.pointDetail}>Phone: {point.phone}</Text>
                    )}
                    {point.address && (
                      <Text style={styles.pointDetail}>Address: {point.address}</Text>
                    )}
                  </View>
                  <View style={styles.pointActions}>
                    <Button
                      onPress={() => handleEdit(point)}
                      variant="secondary"
                      style={styles.actionButton}
                    >
                      Edit
                    </Button>
                    <Button
                      onPress={() => handleDelete(point._id)}
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
        title={editingPoint ? 'Edit Delivery Point' : 'Add Delivery Point'}
      >
        <Input
          label="Name *"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          required
        />
        <Input
          label="Contact Person"
          value={formData.contactPerson}
          onChangeText={(text) => setFormData({ ...formData, contactPerson: text })}
          placeholder="Optional"
        />
        <Input
          label="Phone"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          keyboardType="phone-pad"
          placeholder="Optional"
        />
        <Input
          label="Address"
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
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
            {editingPoint ? 'Update' : 'Create'}
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
  pointItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pointInfo: {
    flex: 1,
  },
  pointName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  pointDetail: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  pointActions: {
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

export default DeliveryPointManagement;
