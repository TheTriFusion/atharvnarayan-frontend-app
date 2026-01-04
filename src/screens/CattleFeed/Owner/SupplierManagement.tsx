import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier, getPurchaseOrders, addPurchaseOrder } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import Select from '../../../components/common/Select';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';

const SupplierManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchases'>('suppliers');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [supplierData, setSupplierData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstNumber: '',
    productsSupplied: '',
    address: { city: '', state: '' },
  });

  const [showPOForm, setShowPOForm] = useState(false);
  const [poData, setPoData] = useState({
    supplierId: '',
    items: [] as any[],
    totalAmount: 0,
    status: 'received',
    paymentStatus: 'pending',
  });
  const [poItem, setPoItem] = useState({ productName: '', quantity: '', pricePerUnit: '' });

  useEffect(() => {
    loadData();
  }, [selectedOwnerId, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      if (activeTab === 'suppliers') {
        const data = await getSuppliers(ownerId);
        setSuppliers(Array.isArray(data) ? data : []);
      } else {
        const [supData, poData] = await Promise.all([
          getSuppliers(ownerId),
          getPurchaseOrders(ownerId),
        ]);
        setSuppliers(Array.isArray(supData) ? supData : []);
        setPurchaseOrders(Array.isArray(poData) ? poData : []);
      }
    } catch (e: any) {
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierSubmit = async () => {
    try {
      const payload = {
        ...supplierData,
        productsSupplied: supplierData.productsSupplied.split(',').map(s => s.trim()).filter(Boolean),
      };
      if (editingSupplier) {
        await updateSupplier(editingSupplier._id || editingSupplier.id, payload);
        success('Supplier updated');
      } else {
        await addSupplier(payload);
        success('Supplier added');
      }
      setShowSupplierForm(false);
      loadData();
    } catch (e: any) {
      showError(e.message || 'Failed to save supplier');
    }
  };

  const handlePOSubmit = async () => {
    try {
      if (poData.items.length === 0) {
        showError('Add at least one item');
        return;
      }

      await addPurchaseOrder(poData);
      success('Purchase Order Created');
      setShowPOForm(false);
      loadData();
    } catch (e: any) {
      showError(e.message || 'Failed to create purchase order');
    }
  };

  const addPOItem = () => {
    if (!poItem.productName || !poItem.quantity || !poItem.pricePerUnit) return;
    const newItem = {
      ...poItem,
      quantity: Number(poItem.quantity),
      pricePerUnit: Number(poItem.pricePerUnit),
      totalPrice: Number(poItem.quantity) * Number(poItem.pricePerUnit),
    };

    setPoData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      totalAmount: prev.totalAmount + newItem.totalPrice,
    }));
    setPoItem({ productName: '', quantity: '', pricePerUnit: '' });
  };

  const removePOItem = (index: number) => {
    const item = poData.items[index];
    setPoData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
      totalAmount: prev.totalAmount - item.totalPrice,
    }));
  };

  const handleDeleteSupplier = async (id: string) => {
    Alert.alert('Delete Supplier', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSupplier(id);
            success('Supplier deleted');
            loadData();
          } catch (e: any) {
            showError(e.message || 'Failed to delete supplier');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {isSuperAdmin && <OwnerSelector systemType="cattleFeed" />}

      <View style={styles.header}>
        <Text style={styles.title}>Supplier Management</Text>
        <Button
          variant="primary"
          onPress={() => {
            if (activeTab === 'suppliers') {
              setEditingSupplier(null);
              setSupplierData({ name: '', contactPerson: '', phone: '', email: '', gstNumber: '', productsSupplied: '', address: { city: '', state: '' } });
              setShowSupplierForm(true);
            } else {
              setPoData({ supplierId: '', items: [], totalAmount: 0, status: 'received', paymentStatus: 'pending' });
              setShowPOForm(true);
            }
          }}
        >
          {activeTab === 'suppliers' ? 'Add Supplier' : 'New Purchase'}
        </Button>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'suppliers' && styles.activeTab]}
          onPress={() => setActiveTab('suppliers')}
        >
          <Text style={[styles.tabText, activeTab === 'suppliers' && styles.activeTabText]}>
            Suppliers List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'purchases' && styles.activeTab]}
          onPress={() => setActiveTab('purchases')}
        >
          <Text style={[styles.tabText, activeTab === 'purchases' && styles.activeTabText]}>
            Purchase History
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'suppliers' && (
        <Card title="Suppliers">
          {suppliers.length === 0 ? (
            <Text style={styles.emptyText}>No suppliers found</Text>
          ) : (
            <View style={styles.list}>
              {suppliers.map((s) => (
                <View key={s._id || s.id} style={styles.listItem}>
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemName}>{s.name}</Text>
                    <Text style={styles.listItemDetail}>👤 {s.contactPerson}</Text>
                    <Text style={styles.listItemDetail}>📞 {s.phone}</Text>
                    <Text style={styles.listItemDetail}>📦 Total Purchases: {s.totalPurchases || 0}</Text>
                  </View>
                  <View style={styles.listItemActions}>
                    <Button
                      variant="secondary"
                      onPress={() => {
                        setEditingSupplier(s);
                        setSupplierData({
                          ...s,
                          productsSupplied: s.productsSupplied?.join(', ') || '',
                          address: s.address || { city: '', state: '' },
                        });
                        setShowSupplierForm(true);
                      }}
                      style={styles.actionButton}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onPress={() => handleDeleteSupplier(s._id || s.id)}
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
      )}

      {activeTab === 'purchases' && (
        <Card title="Purchase History">
          {purchaseOrders.length === 0 ? (
            <Text style={styles.emptyText}>No purchase history</Text>
          ) : (
            <View style={styles.list}>
              {purchaseOrders.map((po) => (
                <View key={po._id || po.id} style={styles.listItem}>
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemName}>PO #{po.orderNumber}</Text>
                    <Text style={styles.listItemDetail}>
                      📅 {new Date(po.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={styles.listItemDetail}>
                      🏢 {po.supplierId?.name || 'Unknown'}
                    </Text>
                    <Text style={styles.listItemDetail}>
                      💰 ₹{po.totalAmount}
                    </Text>
                    <Text style={styles.listItemDetail}>
                      📦 {po.items.map((i: any) => `${i.productName} (${i.quantity})`).join(', ')}
                    </Text>
                    <View style={styles.statusBadge}>
                      <Text style={[styles.statusText, po.paymentStatus === 'paid' && styles.statusPaid]}>
                        {po.paymentStatus}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}

      <Modal
        visible={showSupplierForm}
        onClose={() => setShowSupplierForm(false)}
        title="Supplier Details"
      >
        <ScrollView style={styles.modalContent}>
          <View style={styles.form}>
            <Input
              label="Supplier Name"
              value={supplierData.name}
              onChangeText={(value) => setSupplierData({ ...supplierData, name: value })}
              required
            />
            <Input
              label="Contact Person"
              value={supplierData.contactPerson}
              onChangeText={(value) => setSupplierData({ ...supplierData, contactPerson: value })}
            />
            <Input
              label="Phone"
              value={supplierData.phone}
              onChangeText={(value) => setSupplierData({ ...supplierData, phone: value })}
              required
              keyboardType="phone-pad"
            />
            <Input
              label="Email"
              value={supplierData.email}
              onChangeText={(value) => setSupplierData({ ...supplierData, email: value })}
              keyboardType="email-address"
            />
            <Input
              label="Goods Supplied (comma separated)"
              value={supplierData.productsSupplied}
              onChangeText={(value) => setSupplierData({ ...supplierData, productsSupplied: value })}
            />
            <View style={styles.formButtons}>
              <Button variant="secondary" onPress={() => setShowSupplierForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" onPress={handleSupplierSubmit}>
                Save
              </Button>
            </View>
          </View>
        </ScrollView>
      </Modal>

      <Modal
        visible={showPOForm}
        onClose={() => setShowPOForm(false)}
        title="New Purchase Entry"
      >
        <ScrollView style={styles.modalContent}>
          <View style={styles.form}>
            <Select
              label="Select Supplier"
              value={poData.supplierId}
              onChange={(value) => setPoData({ ...poData, supplierId: value as string })}
              options={[
                { value: '', label: 'Select Supplier' },
                ...suppliers.map(s => ({ value: s._id || s.id, label: s.name })),
              ]}
            />

            <View style={styles.poItemSection}>
              <Text style={styles.sectionTitle}>Add Item to Bill</Text>
              <View style={styles.poItemRow}>
                <Input
                  placeholder="Item Name"
                  value={poItem.productName}
                  onChangeText={(value) => setPoItem({ ...poItem, productName: value })}
                  containerStyle={styles.poItemInput}
                />
                <Input
                  placeholder="Qty"
                  value={poItem.quantity}
                  onChangeText={(value) => setPoItem({ ...poItem, quantity: value })}
                  keyboardType="decimal-pad"
                  containerStyle={styles.poItemInput}
                />
                <Input
                  placeholder="Price/Unit"
                  value={poItem.pricePerUnit}
                  onChangeText={(value) => setPoItem({ ...poItem, pricePerUnit: value })}
                  keyboardType="decimal-pad"
                  containerStyle={styles.poItemInput}
                />
              </View>
              <Button variant="primary" onPress={addPOItem} style={styles.addItemButton}>
                Add Item
              </Button>
            </View>

            {poData.items.length > 0 && (
              <View style={styles.poItemsList}>
                {poData.items.map((item, idx) => (
                  <View key={idx} style={styles.poItemRow}>
                    <Text style={styles.poItemText}>
                      {item.productName} ({item.quantity} x {item.pricePerUnit})
                    </Text>
                    <View style={styles.poItemActions}>
                      <Text style={styles.poItemTotal}>₹{item.totalPrice}</Text>
                      <Button
                        variant="danger"
                        onPress={() => removePOItem(idx)}
                        style={styles.removeItemButton}
                      >
                        Remove
                      </Button>
                    </View>
                  </View>
                ))}
                <View style={styles.poTotal}>
                  <Text style={styles.poTotalText}>Total: ₹{poData.totalAmount}</Text>
                </View>
              </View>
            )}

            <Select
              label="Payment Status"
              value={poData.paymentStatus}
              onChange={(value) => setPoData({ ...poData, paymentStatus: value as string })}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'paid', label: 'Paid' },
                { value: 'partial', label: 'Partial' },
              ]}
            />

            <View style={styles.formButtons}>
              <Button variant="secondary" onPress={() => setShowPOForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" onPress={handlePOSubmit}>
                Record Purchase
              </Button>
            </View>
          </View>
        </ScrollView>
      </Modal>
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
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
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400e',
  },
  statusPaid: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  modalContent: {
    maxHeight: 600,
  },
  form: {
    gap: 16,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  poItemSection: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  poItemRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  poItemInput: {
    flex: 1,
    marginBottom: 0,
  },
  addItemButton: {
    marginTop: 8,
  },
  poItemsList: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    maxHeight: 160,
    marginBottom: 16,
  },
  poItemText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  poItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  poItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  removeItemButton: {
    paddingHorizontal: 12,
  },
  poTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  poTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
});

export default SupplierManagement;
