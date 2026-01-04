import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, FlatList, TouchableOpacity } from 'react-native';
import { useToast } from '../../../contexts/ToastContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';

interface Route {
  _id: string;
  name: string;
  startPoint?: string;
  deliveryPoints?: any[];
  estimatedDistance?: string;
}

const RouteManagement: React.FC = () => {
  const toast = useToast();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [deliveryPoints, setDeliveryPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startPoint: '',
    deliveryPoints: [] as string[],
    estimatedDistance: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [routesRes, pointsRes] = await Promise.all([
        cattleFeedTruckAPI.getRoutes(),
        cattleFeedTruckAPI.getDeliveryPoints(),
      ]);
      setRoutes(Array.isArray(routesRes) ? routesRes : (Array.isArray(routesRes.data) ? routesRes.data : []));
      setDeliveryPoints(Array.isArray(pointsRes) ? pointsRes : (Array.isArray(pointsRes.data) ? pointsRes.data : []));
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingRoute) {
        await cattleFeedTruckAPI.updateRoute(editingRoute._id, formData);
        toast.success('Route updated successfully!');
      } else {
        await cattleFeedTruckAPI.createRoute(formData);
        toast.success('Route created successfully!');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving route:', error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      name: route.name,
      startPoint: route.startPoint || '',
      deliveryPoints: route.deliveryPoints?.map((p: any) => p._id || p) || [],
      estimatedDistance: route.estimatedDistance || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Route', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await cattleFeedTruckAPI.deleteRoute(id);
            toast.success('Route deleted successfully!');
            fetchData();
          } catch (error: any) {
            console.error('Error deleting route:', error);
            toast.error('Error deleting route');
          }
        },
      },
    ]);
  };

  const toggleDeliveryPoint = (pointId: string) => {
    setFormData(prev => ({
      ...prev,
      deliveryPoints: prev.deliveryPoints.includes(pointId)
        ? prev.deliveryPoints.filter(p => p !== pointId)
        : [...prev.deliveryPoints, pointId]
    }));
  };

  const resetForm = () => {
    setFormData({ name: '', startPoint: '', deliveryPoints: [], estimatedDistance: '' });
    setEditingRoute(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Route Management</Text>
        <Button
          onPress={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Add Route
        </Button>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
      ) : (
        <View style={styles.routesGrid}>
          {routes.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No routes found. Create your first route.</Text>
            </Card>
          ) : (
            routes.map((route) => (
              <Card key={route._id} style={styles.routeCard}>
                <Text style={styles.routeName}>{route.name}</Text>
                <Text style={styles.routeDetail}>
                  <Text style={styles.routeLabel}>Start:</Text> {route.startPoint || 'N/A'}
                </Text>
                <Text style={styles.routeDetail}>
                  <Text style={styles.routeLabel}>Stops:</Text> {route.deliveryPoints?.length || 0} delivery points
                </Text>
                <Text style={styles.routeDetail}>
                  <Text style={styles.routeLabel}>Distance:</Text> {route.estimatedDistance || 'N/A'} km
                </Text>
                <View style={styles.routeActions}>
                  <Button
                    onPress={() => handleEdit(route)}
                    variant="secondary"
                    style={styles.actionButton}
                  >
                    Edit
                  </Button>
                  <Button
                    onPress={() => handleDelete(route._id)}
                    variant="danger"
                    style={styles.actionButton}
                  >
                    Delete
                  </Button>
                </View>
              </Card>
            ))
          )}
        </View>
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingRoute ? 'Edit Route' : 'Add Route'}
      >
        <ScrollView>
          <Input
            label="Route Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            required
          />
          <Input
            label="Start Point"
            value={formData.startPoint}
            onChangeText={(text) => setFormData({ ...formData, startPoint: text })}
          />
          <Input
            label="Estimated Distance (km)"
            value={formData.estimatedDistance}
            onChangeText={(text) => setFormData({ ...formData, estimatedDistance: text })}
            keyboardType="numeric"
          />
          <View style={styles.deliveryPointsSection}>
            <Text style={styles.deliveryPointsLabel}>Delivery Points</Text>
            <View style={styles.deliveryPointsList}>
              {deliveryPoints.length === 0 ? (
                <Text style={styles.noPointsText}>No delivery points available</Text>
              ) : (
                deliveryPoints.map(point => (
                  <TouchableOpacity
                    key={point._id}
                    onPress={() => toggleDeliveryPoint(point._id)}
                    style={[
                      styles.deliveryPointItem,
                      formData.deliveryPoints.includes(point._id) && styles.deliveryPointSelected,
                    ]}
                  >
                    <Text style={styles.checkbox}>
                      {formData.deliveryPoints.includes(point._id) ? '✓' : '○'}
                    </Text>
                    <Text style={styles.deliveryPointName}>{point.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
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
              {editingRoute ? 'Update' : 'Create'}
            </Button>
          </View>
        </ScrollView>
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
  routesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  routeCard: {
    flex: 1,
    minWidth: '45%',
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  routeDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  routeLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  routeActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 6,
  },
  emptyCard: {
    width: '100%',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 32,
  },
  deliveryPointsSection: {
    marginTop: 16,
  },
  deliveryPointsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  deliveryPointsList: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 8,
    maxHeight: 200,
  },
  deliveryPointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  deliveryPointSelected: {
    backgroundColor: '#dbeafe',
  },
  checkbox: {
    fontSize: 16,
    marginRight: 8,
    color: '#2563eb',
  },
  deliveryPointName: {
    fontSize: 14,
    color: '#111827',
  },
  noPointsText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    padding: 16,
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
});

export default RouteManagement;
