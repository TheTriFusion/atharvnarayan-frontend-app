import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { getMilkTruckBMCs, addMilkTruckBMC, updateMilkTruckBMC, deleteMilkTruckBMC, getMilkTruckBMCHistory } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';
import { useToast } from '../../../contexts/ToastContext';

const BMCManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const { success, error: showError } = useToast();
  const [bmcs, setBMCs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBMC, setEditingBMC] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    contact: '',
  });
  const [loading, setLoading] = useState(true);

  // History State
  const [historyModal, setHistoryModal] = useState<{
    visible: boolean;
    bmc: any;
    data: any;
    loading: boolean;
  }>({ visible: false, bmc: null, data: null, loading: false });

  useEffect(() => {
    loadBMCs();
  }, [selectedOwnerId]);

  const loadBMCs = async () => {
    try {
      setLoading(true);
      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      const data = await getMilkTruckBMCs(ownerId);
      setBMCs(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error loading BMCs:', error);
      showError(error.message || 'Failed to load BMCs');
      setBMCs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (editingBMC) {
        await updateMilkTruckBMC(editingBMC._id || editingBMC.id, formData);
        success('BMC updated successfully');
      } else {
        await addMilkTruckBMC(formData);
        success('BMC added successfully');
      }

      resetForm();
      await loadBMCs();
    } catch (error: any) {
      console.error('Error saving BMC:', error);
      showError(error.message || 'Failed to save BMC');
    }
  };

  const handleEdit = (bmc: any) => {
    setEditingBMC(bmc);
    setFormData({
      name: bmc.name || '',
      location: bmc.location || '',
      contact: bmc.contact || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete BMC',
      'Are you sure you want to delete this BMC?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMilkTruckBMC(id);
              success('BMC deleted successfully');
              await loadBMCs();
            } catch (error: any) {
              console.error('Error deleting BMC:', error);
              showError(error.message || 'Failed to delete BMC');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({ name: '', location: '', contact: '' });
    setEditingBMC(null);
    setShowForm(false);
  };

  const viewHistory = async (bmc: any) => {
    setHistoryModal({ visible: true, bmc, data: null, loading: true });
    try {
      const historyData = await getMilkTruckBMCHistory(bmc._id || bmc.id);
      setHistoryModal({ visible: true, bmc, data: historyData, loading: false });
    } catch (error: any) {
      console.error('Error fetching history:', error);
      showError('Failed to load history');
      setHistoryModal({ visible: false, bmc: null, data: null, loading: false });
    }
  };

  const closeHistory = () => {
    setHistoryModal({ visible: false, bmc: null, data: null, loading: false });
  };

  return (
    <ScrollView style={styles.container}>
      {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}

      <View style={styles.header}>
        <Text style={styles.title}>BMC Management</Text>
        <Button
          variant="primary"
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Add New BMC
        </Button>
      </View>

      <Modal
        visible={showForm}
        onClose={resetForm}
        title={editingBMC ? 'Edit BMC' : 'Add New BMC'}
      >
        <View style={styles.form}>
          <Input
            label="BMC Name"
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            required
            placeholder="Enter BMC name"
          />
          <Input
            label="Location"
            value={formData.location}
            onChangeText={(value) => handleInputChange('location', value)}
            required
            placeholder="Enter location"
          />
          <Input
            label="Contact"
            value={formData.contact}
            onChangeText={(value) => handleInputChange('contact', value)}
            required
            placeholder="Enter contact number"
            keyboardType="phone-pad"
          />
          <View style={styles.formButtons}>
            <Button type="submit" variant="primary" onPress={handleSubmit}>
              {editingBMC ? 'Update' : 'Add'} BMC
            </Button>
            <Button variant="secondary" onPress={resetForm}>
              Cancel
            </Button>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={historyModal.visible}
        onClose={closeHistory}
        title={historyModal.bmc ? `History: ${historyModal.bmc.name}` : 'BMC History'}
      >
        <ScrollView style={{ maxHeight: 500 }}>
          {historyModal.loading ? (
            <Text style={styles.loadingText}>Loading history...</Text>
          ) : historyModal.data && historyModal.data.history?.length > 0 ? (
            <View>
              {/* Summary */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={[styles.summaryCard, { backgroundColor: '#eff6ff', marginRight: 4 }]}>
                  <Text style={styles.summaryLabel}>Var Milk</Text>
                  <Text style={[styles.summaryValue, (historyModal.data.totalVariance?.milk || 0) >= 0 ? styles.textGreen : styles.textRed]}>
                    {(historyModal.data.totalVariance?.milk || 0) > 0 ? '+' : ''}{(historyModal.data.totalVariance?.milk || 0).toFixed(1)} L
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#f5f3ff', marginHorizontal: 4 }]}>
                  <Text style={styles.summaryLabel}>Var Fat</Text>
                  <Text style={[styles.summaryValue, (historyModal.data.totalVariance?.fatKg || 0) >= 0 ? styles.textGreen : styles.textRed]}>
                    {(historyModal.data.totalVariance?.fatKg || 0) > 0 ? '+' : ''}{(historyModal.data.totalVariance?.fatKg || 0).toFixed(2)} Kg
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#eef2ff', marginLeft: 4 }]}>
                  <Text style={styles.summaryLabel}>Var SNF</Text>
                  <Text style={[styles.summaryValue, (historyModal.data.totalVariance?.snfKg || 0) >= 0 ? styles.textGreen : styles.textRed]}>
                    {(historyModal.data.totalVariance?.snfKg || 0) > 0 ? '+' : ''}{(historyModal.data.totalVariance?.snfKg || 0).toFixed(2)} Kg
                  </Text>
                </View>
              </View>

              {/* History List */}
              {historyModal.data.history.map((item: any, idx: number) => (
                <View key={idx} style={[styles.historyItem, idx % 2 === 1 && { backgroundColor: '#f9fafb' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View>
                      <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString()}</Text>
                      <Text style={styles.historyTime}>{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.regNum}>{item.vehicleReg}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', marginBottom: 4, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4 }}>
                    <Text style={[styles.colHeader, { flex: 1 }]}>Type</Text>
                    <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>Coll</Text>
                    <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>Ver</Text>
                    <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>Var</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.cellLabel}>Milk L</Text>
                    <Text style={styles.cellValue}>{(item.collection?.milk || 0).toFixed(1)}</Text>
                    <Text style={styles.cellValue}>{(item.verified?.milk || 0).toFixed(1)}</Text>
                    <Text style={[styles.cellValue, { textAlign: 'right' }, (item.variance?.milk || 0) >= 0 ? styles.textGreen : styles.textRed]}>
                      {(item.variance?.milk || 0) > 0 ? '+' : ''}{(item.variance?.milk || 0).toFixed(1)}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.cellLabel}>Fat Kg</Text>
                    <Text style={styles.cellValue}>{(item.collection?.fatKg || 0).toFixed(2)}</Text>
                    <Text style={styles.cellValue}>{(item.verified?.fatKg || 0).toFixed(2)}</Text>
                    <Text style={[styles.cellValue, { textAlign: 'right' }, (item.variance?.fatKg || 0) >= 0 ? styles.textGreen : styles.textRed]}>
                      {(item.variance?.fatKg || 0) > 0 ? '+' : ''}{(item.variance?.fatKg || 0).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.cellLabel}>SNF Kg</Text>
                    <Text style={styles.cellValue}>{(item.collection?.snfKg || 0).toFixed(2)}</Text>
                    <Text style={styles.cellValue}>{(item.verified?.snfKg || 0).toFixed(2)}</Text>
                    <Text style={[styles.cellValue, { textAlign: 'right' }, (item.variance?.snfKg || 0) >= 0 ? styles.textGreen : styles.textRed]}>
                      {(item.variance?.snfKg || 0) > 0 ? '+' : ''}{(item.variance?.snfKg || 0).toFixed(2)}
                    </Text>
                  </View>

                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No history found.</Text>
          )}
        </ScrollView>
        <Button variant="secondary" onPress={closeHistory} style={{ marginTop: 16 }}>Close</Button>
      </Modal>

      <Card title="BMC List">
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : !Array.isArray(bmcs) || bmcs.length === 0 ? (
          <Text style={styles.emptyText}>No BMCs found. Add your first BMC to get started.</Text>
        ) : (
          <View style={styles.list}>
            {bmcs.map((bmc) => (
              <View key={bmc._id || bmc.id} style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemName}>{bmc.name}</Text>
                  <Text style={styles.listItemDetail}>📍 {bmc.location}</Text>
                  <Text style={styles.listItemDetail}>📞 {bmc.contact}</Text>
                </View>
                <View style={styles.listItemActions}>
                  <Button
                    variant="secondary"
                    onPress={() => viewHistory(bmc)}
                    style={[styles.actionButton, styles.historyButton]}
                  >
                    Analysis
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => handleEdit(bmc)}
                    style={styles.actionButton}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onPress={() => handleDelete(bmc._id || bmc.id)}
                    style={styles.actionButton}
                  >
                    Delete
                  </Button>
                </View>
              </View>
            ))}
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
  loadingText: {
    textAlign: 'center',
    padding: 20,
    color: '#6b7280',
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
  historyButton: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  // History Styles
  summaryCard: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4b5563',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  historyItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827'
  },
  historyTime: {
    fontSize: 12,
    color: '#6b7280'
  },
  regNum: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4b5563',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase'
  },
  row: {
    flexDirection: 'row',
    marginBottom: 2
  },
  cellLabel: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500'
  },
  cellValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    color: '#1f2937'
  },
  textGreen: {
    color: '#059669'
  },
  textRed: {
    color: '#dc2626'
  }
});

export default BMCManagement;
