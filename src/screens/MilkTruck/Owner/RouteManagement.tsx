import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { getMilkTruckRoutes, getMilkTruckBMCs, addMilkTruckRoute, updateMilkTruckRoute, deleteMilkTruckRoute } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import Modal from '../../../components/common/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';
import { useToast } from '../../../contexts/ToastContext';

const RouteManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const { success, error: showError } = useToast();
  const [routes, setRoutes] = useState<any[]>([]);
  const [bmcs, setBMCs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
  });
  const [selectedBMCs, setSelectedBMCs] = useState<string[]>([]);
  const [bmcToAdd, setBMCToAdd] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [selectedOwnerId]);

  const loadData = async () => {
    try {
      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      const [routesData, bmcsData] = await Promise.all([
        getMilkTruckRoutes(ownerId),
        getMilkTruckBMCs(ownerId),
      ]);
      setRoutes(Array.isArray(routesData) ? routesData : []);
      setBMCs(Array.isArray(bmcsData) ? bmcsData : []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      showError(error.message || 'Failed to load data');
      setRoutes([]);
      setBMCs([]);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddBMC = () => {
    if (bmcToAdd && !selectedBMCs.includes(bmcToAdd)) {
      setSelectedBMCs(prev => [...prev, bmcToAdd]);
      setBMCToAdd('');
    }
  };

  const handleRemoveBMC = (indexToRemove: number) => {
    setSelectedBMCs(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const moveBMC = (index: number, direction: 'up' | 'down') => {
    const newBMCs = [...selectedBMCs];
    if (direction === 'up' && index > 0) {
      [newBMCs[index], newBMCs[index - 1]] = [newBMCs[index - 1], newBMCs[index]];
      setSelectedBMCs(newBMCs);
    } else if (direction === 'down' && index < newBMCs.length - 1) {
      [newBMCs[index], newBMCs[index + 1]] = [newBMCs[index + 1], newBMCs[index]];
      setSelectedBMCs(newBMCs);
    }
  };

  const handleSubmit = async () => {
    if (selectedBMCs.length === 0) {
      showError('Please select at least one BMC for the route');
      return;
    }

    const routeData = {
      ...formData,
      bmcSequence: selectedBMCs,
    };

    try {
      if (editingRoute) {
        await updateMilkTruckRoute(editingRoute._id || editingRoute.id, routeData);
        success('Route updated successfully');
      } else {
        await addMilkTruckRoute(routeData);
        success('Route added successfully');
      }

      resetForm();
      await loadData();
    } catch (error: any) {
      console.error('Error saving route:', error);
      showError(error.message || 'Failed to save route');
    }
  };

  const handleEdit = (route: any) => {
    setEditingRoute(route);
    setFormData({
      name: route.name || '',
    });
    // Handle populated BMCs or ID strings
    const bmcIds = route.bmcSequence?.map((b: any) => (typeof b === 'object' ? b._id || b.id : b)) || [];
    setSelectedBMCs(bmcIds);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Route',
      'Are you sure you want to delete this route?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMilkTruckRoute(id);
              success('Route deleted successfully');
              await loadData();
            } catch (error: any) {
              console.error('Error deleting route:', error);
              showError(error.message || 'Failed to delete route');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setSelectedBMCs([]);
    setBMCToAdd('');
    setEditingRoute(null);
    setShowForm(false);
  };

  // Filter available BMCs
  const getAvailableBMCs = () => {
    // Get all BMCs currently assigned to other routes
    const assignedBMCs = new Set();
    routes.forEach(route => {
      // If we are editing, we ignore the current route's existing BMCs in the "assigned check"
      if (editingRoute && (route._id || route.id) === (editingRoute._id || editingRoute.id)) {
        return; // Skip current route
      }
      if (Array.isArray(route.bmcSequence)) {
        route.bmcSequence.forEach((bmc: any) => {
          const bmcId = typeof bmc === 'object' ? (bmc._id || bmc.id) : bmc;
          assignedBMCs.add(bmcId);
        });
      }
    });

    // Return BMCs that are NOT assigned to other routes AND not already selected in current form
    return bmcs.filter(bmc => {
      const bmcId = bmc._id || bmc.id;
      return !assignedBMCs.has(bmcId) && !selectedBMCs.includes(bmcId);
    });
  };

  const availableBMCs = getAvailableBMCs();

  const bmcOptions = availableBMCs.map(b => ({
    value: b._id || b.id,
    label: `${b.name} (${b.location})`,
  }));

  return (
    <ScrollView style={styles.container}>
      {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}

      <View style={styles.header}>
        <Text style={styles.title}>Route Management</Text>
        <Button
          variant="primary"
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Add New Route
        </Button>
      </View>

      <Modal
        visible={showForm}
        onClose={resetForm}
        title={editingRoute ? 'Edit Route' : 'Add New Route'}
      >
        <ScrollView style={styles.modalContent}>
          <View style={styles.form}>
            <Input
              label="Route Name"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              required
              placeholder="e.g., Route 1"
            />

            <View style={styles.bmcSection}>
              <Text style={styles.bmcLabel}>Add BMCs to Route</Text>

              <View style={styles.addBmcContainer}>
                <View style={styles.selectContainer}>
                  <Select
                    label="Select BMC"
                    value={bmcToAdd}
                    onChange={(value) => setBMCToAdd(value as string)}
                    options={[
                      { value: '', label: 'Select a BMC' },
                      ...bmcOptions,
                    ]}
                  />
                </View>
                <Button
                  variant="primary"
                  onPress={handleAddBMC}
                  disabled={!bmcToAdd}
                  style={styles.addButton}
                >
                  Add
                </Button>
              </View>

              {selectedBMCs.length > 0 && (
                <View style={styles.sequenceSection}>
                  <Text style={styles.sequenceLabel}>Route Sequence (Order matters):</Text>
                  {selectedBMCs.map((bmcId, index) => {
                    const bmc = bmcs.find(b => (b._id || b.id) === bmcId);
                    return (
                      <View key={bmcId} style={styles.sequenceItem}>
                        <View style={styles.sequenceInfo}>
                          <Text style={styles.sequenceText}>
                            {index + 1}. {bmc?.name || 'Unknown'}
                          </Text>
                          <Text style={styles.sequenceSubText}>
                            {bmc?.location}
                          </Text>
                        </View>

                        <View style={styles.sequenceActions}>
                          <Button
                            variant="secondary"
                            onPress={() => moveBMC(index, 'up')}
                            disabled={index === 0}
                            style={styles.moveButton}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="secondary"
                            onPress={() => moveBMC(index, 'down')}
                            disabled={index === selectedBMCs.length - 1}
                            style={styles.moveButton}
                          >
                            ↓
                          </Button>
                          <Button
                            variant="danger"
                            onPress={() => handleRemoveBMC(index)}
                            style={styles.removeButton}
                          >
                            ✕
                          </Button>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
              {selectedBMCs.length === 0 && (
                <Text style={styles.emptyBmcText}>No BMCs added yet. Select and add BMCs above.</Text>
              )}
            </View>

            <View style={styles.formButtons}>
              <Button variant="primary" onPress={handleSubmit}>
                {editingRoute ? 'Update' : 'Add'} Route
              </Button>
              <Button variant="secondary" onPress={resetForm}>
                Cancel
              </Button>
            </View>
          </View>
        </ScrollView>
      </Modal>

      <Card title="Route List">
        {!Array.isArray(routes) || routes.length === 0 ? (
          <Text style={styles.emptyText}>No routes found. Add your first route to get started.</Text>
        ) : (
          <View style={styles.list}>
            {routes.map((route) => {
              const routeBMCs = Array.isArray(route.bmcSequence) ? route.bmcSequence.map((id: any) => {
                const bmcId = typeof id === 'object' ? (id._id || id.id) : id;
                const bmcObj = typeof id === 'object' ? id : (Array.isArray(bmcs) ? bmcs.find(b => (b._id || b.id) === bmcId) : null);
                return bmcObj?.name || 'Unknown';
              }).join(' → ') : '';

              return (
                <View key={route._id || route.id} style={styles.listItem}>
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemName}>{route.name}</Text>
                    <Text style={styles.listItemDetail}>📍 Sequence: {routeBMCs || 'None'}</Text>
                  </View>
                  <View style={styles.listItemActions}>
                    <Button
                      variant="secondary"
                      onPress={() => handleEdit(route)}
                      style={styles.actionButton}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onPress={() => handleDelete(route._id || route.id)}
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
  bmcSection: {
    marginBottom: 16,
  },
  bmcLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  addBmcContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8
  },
  selectContainer: {
    flex: 1,
  },
  addButton: {
    height: 48,
    justifyContent: 'center',
    marginBottom: 16 // align with input
  },
  sequenceSection: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    gap: 8
  },
  sequenceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  sequenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sequenceInfo: {
    flex: 1,
  },
  sequenceText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  sequenceSubText: {
    fontSize: 12,
    color: '#6b7280',
  },
  sequenceActions: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8
  },
  moveButton: {
    paddingHorizontal: 8,
    minWidth: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center'
  },
  removeButton: {
    paddingHorizontal: 8,
    minWidth: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center'
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
  emptyBmcText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 8,
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

export default RouteManagement;
