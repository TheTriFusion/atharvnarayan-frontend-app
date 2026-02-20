import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier, getPurchaseOrders, addPurchaseOrder } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import Select from '../../../components/common/Select';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

const SupplierManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchases'>('suppliers');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSupplierSubmit = async () => {
    try {
      if (!supplierData.name || !supplierData.phone) {
        toast.error('Name and phone are required');
        return;
      }

      const payload = {
        ...supplierData,
        productsSupplied: supplierData.productsSupplied.split(',').map(s => s.trim()).filter(Boolean),
      };
      if (editingSupplier) {
        await updateSupplier(editingSupplier._id || editingSupplier.id, payload);
        toast.success('Supplier updated');
      } else {
        await addSupplier(payload);
        toast.success('Supplier added');
      }
      setShowSupplierForm(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    }
  };

  const handlePOSubmit = async () => {
    try {
      if (!poData.supplierId) {
        toast.error('Select a supplier');
        return;
      }
      if (poData.items.length === 0) {
        toast.error('Add items to order');
        return;
      }

      await addPurchaseOrder(poData);
      toast.success('Bill recorded');
      setShowPOForm(false);
      loadData();
    } catch (e: any) {
      toast.error('Failed to record purchase');
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
            toast.success('Supplier deleted');
            loadData();
          } catch (e: any) {
            toast.error('Failed to delete');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Suppliers"
        subtitle="Manage inventory sources"
        showBackButton
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
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
            <Text style={styles.addButtonIcon}>➕</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'suppliers' && styles.activeTab]}
          onPress={() => setActiveTab('suppliers')}
        >
          <Text style={[styles.tabText, activeTab === 'suppliers' && styles.activeTabText]}>Suppliers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'purchases' && styles.activeTab]}
          onPress={() => setActiveTab('purchases')}
        >
          <Text style={[styles.tabText, activeTab === 'purchases' && styles.activeTabText]}>Purchases</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[500]]} />
        }
      >
        <View style={styles.content}>
          {isSuperAdmin && <OwnerSelector systemType="cattleFeed" />}

          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={colors.primary[500]} style={styles.loader} />
          ) : (
            <View style={styles.listContainer}>
              {activeTab === 'suppliers' ? (
                suppliers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🏢</Text>
                    <Text style={styles.emptyText}>No suppliers added yet.</Text>
                  </View>
                ) : (
                  suppliers.map((s) => (
                    <Card key={s._id || s.id} style={styles.supplierCard}>
                      <View style={styles.supplierRow}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{s.name?.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.supplierInfo}>
                          <Text style={styles.supplierName}>{s.name}</Text>
                          <Text style={styles.contactPerson}>👤 {s.contactPerson || 'No contact person'}</Text>
                          <Text style={styles.phone}>📞 {s.phone}</Text>
                        </View>
                        <View style={styles.purchaseStats}>
                          <Text style={styles.statLabel}>Bills</Text>
                          <Text style={styles.statValue}>{s.totalPurchases || 0}</Text>
                        </View>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.tagsRow}>
                        {s.productsSupplied?.map((p: string, idx: number) => (
                          <View key={idx} style={styles.tag}>
                            <Text style={styles.tagText}>{p}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.primary[50] }]}
                          onPress={() => {
                            setEditingSupplier(s);
                            setSupplierData({
                              ...s,
                              productsSupplied: s.productsSupplied?.join(', ') || '',
                              address: s.address || { city: '', state: '' },
                            });
                            setShowSupplierForm(true);
                          }}
                        >
                          <Text style={[styles.actionBtnText, { color: colors.primary[700] }]}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.error[50] }]}
                          onPress={() => handleDeleteSupplier(s._id || s.id)}
                        >
                          <Text style={[styles.actionBtnText, { color: colors.error[700] }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </Card>
                  ))
                )
              ) : (
                purchaseOrders.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🧾</Text>
                    <Text style={styles.emptyText}>No purchase history found.</Text>
                  </View>
                ) : (
                  purchaseOrders.map((po) => (
                    <Card key={po._id || po.id} style={styles.poCard}>
                      <View style={styles.poTop}>
                        <View>
                          <Text style={styles.poNumber}>PO #{po.orderNumber}</Text>
                          <Text style={styles.poDate}>
                            {new Date(po.createdAt).toLocaleDateString(undefined, {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, po.paymentStatus === 'paid' ? { backgroundColor: '#d1fae5' } : { backgroundColor: '#fee2e2' }]}>
                          <Text style={[styles.statusText, po.paymentStatus === 'paid' ? { color: '#065f46' } : { color: '#991b1b' }]}>
                            {po.paymentStatus?.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.poDetails}>
                        <Text style={styles.poSupplier}>🏢 {po.supplierId?.name || 'Unknown Supplier'}</Text>
                        <View style={styles.dotsDivider} />
                        <View style={styles.poAmountRow}>
                          <Text style={styles.totalLabel}>Grand Total</Text>
                          <Text style={styles.totalValue}>₹{po.totalAmount}</Text>
                        </View>
                      </View>

                      <View style={styles.poItemsBox}>
                        {po.items?.map((item: any, idx: number) => (
                          <View key={idx} style={styles.poItemRow}>
                            <Text style={styles.poItemName}>{item.productName} ({item.quantity})</Text>
                            <Text style={styles.poItemPrice}>₹{item.totalPrice}</Text>
                          </View>
                        ))}
                      </View>
                    </Card>
                  ))
                )
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Supplier Modal */}
      <Modal
        visible={showSupplierForm}
        onClose={() => setShowSupplierForm(false)}
        title={editingSupplier ? 'Edit Supplier' : 'New Supplier'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalBody}>
            <Input
              label="Supplier Name *"
              value={supplierData.name}
              onChangeText={(v) => setSupplierData({ ...supplierData, name: v })}
              placeholder="Enter company name"
            />
            <Input
              label="Contact Person"
              value={supplierData.contactPerson}
              onChangeText={(v) => setSupplierData({ ...supplierData, contactPerson: v })}
              placeholder="Full name"
            />
            <Input
              label="Phone Number *"
              value={supplierData.phone}
              onChangeText={(v) => setSupplierData({ ...supplierData, phone: v })}
              keyboardType="phone-pad"
              placeholder="Enter number"
            />
            <Input
              label="Goods Supplied"
              value={supplierData.productsSupplied}
              onChangeText={(v) => setSupplierData({ ...supplierData, productsSupplied: v })}
              placeholder="e.g. Maize, Soybean (comma separated)"
            />

            <View style={styles.modalActions}>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setShowSupplierForm(false)}
              >Cancel</Button>
              <Button
                style={{ flex: 1 }}
                onPress={handleSupplierSubmit}
              >Save</Button>
            </View>
          </View>
          <View style={{ height: 20 }} />
        </ScrollView>
      </Modal>

      {/* Purchase Modal */}
      <Modal
        visible={showPOForm}
        onClose={() => setShowPOForm(false)}
        title="Record Purchase Entry"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalBody}>
            <Select
              label="Select Supplier *"
              value={poData.supplierId}
              onChange={(v) => setPoData({ ...poData, supplierId: v as string })}
              options={[
                { value: '', label: 'Chose a supplier' },
                ...suppliers.map(s => ({ value: s._id || s.id, label: s.name })),
              ]}
            />

            <View style={styles.itemEditor}>
              <Text style={styles.editorTitle}>Add Product Details</Text>
              <Input
                label="Product Name"
                placeholder="Item name"
                value={poItem.productName}
                onChangeText={(v) => setPoItem({ ...poItem, productName: v })}
              />
              <View style={styles.formGrid}>
                <Input
                  label="Quantity"
                  placeholder="0"
                  value={poItem.quantity}
                  onChangeText={(v) => setPoItem({ ...poItem, quantity: v })}
                  keyboardType="decimal-pad"
                  containerStyle={{ flex: 1 }}
                />
                <Input
                  label="Price/Unit"
                  placeholder="0.00"
                  value={poItem.pricePerUnit}
                  onChangeText={(v) => setPoItem({ ...poItem, pricePerUnit: v })}
                  keyboardType="decimal-pad"
                  containerStyle={{ flex: 1 }}
                />
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={addPOItem}>
                <Text style={styles.addBtnText}>+ Add to Bill</Text>
              </TouchableOpacity>
            </View>

            {poData.items.length > 0 && (
              <View style={styles.billItemsList}>
                {poData.items.map((item, idx) => (
                  <View key={idx} style={styles.billItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.billItemName}>{item.productName}</Text>
                      <Text style={styles.billItemQty}>{item.quantity} units @ ₹{item.pricePerUnit}</Text>
                    </View>
                    <Text style={styles.billItemPrice}>₹{item.totalPrice}</Text>
                    <TouchableOpacity onPress={() => removePOItem(idx)}>
                      <Text style={styles.deleteIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.billFooter}>
                  <Text style={styles.totalBillLabel}>Grand Total</Text>
                  <Text style={styles.totalBillValue}>₹{poData.totalAmount}</Text>
                </View>
              </View>
            )}

            <Select
              label="Payment Status"
              value={poData.paymentStatus}
              onChange={(v) => setPoData({ ...poData, paymentStatus: v as string })}
              options={[
                { value: 'pending', label: 'Pending Payment' },
                { value: 'paid', label: 'Fully Paid' },
                { value: 'partial', label: 'Partial Payment' },
              ]}
            />

            <View style={styles.modalActions}>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setShowPOForm(false)}
              >Cancel</Button>
              <Button
                style={{ flex: 1 }}
                onPress={handlePOSubmit}
              >Create PO</Button>
            </View>
          </View>
          <View style={{ height: 20 }} />
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: spacing.lg,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonIcon: {
    fontSize: 20,
    color: colors.primary[600],
  },
  loader: {
    marginVertical: spacing.xxl,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: borderRadius.lg,
    padding: 4,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeTab: {
    backgroundColor: 'white',
    ...shadows.sm,
  },
  tabText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
  },
  activeTabText: {
    color: colors.primary[600],
  },
  listContainer: {
    marginBottom: spacing.xxl,
  },
  supplierCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  contactPerson: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  phone: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  purchaseStats: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: spacing.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.lg,
  },
  tag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
  },
  poCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  poTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  poNumber: {
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  poDate: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
  poDetails: {
    marginBottom: spacing.md,
  },
  poSupplier: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  dotsDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: spacing.sm,
  },
  poAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  poItemsBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  poItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  poItemName: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  poItemPrice: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: 'white',
    borderRadius: borderRadius.xl,
    marginTop: spacing.md,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: spacing.md,
    opacity: 0.2,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  modalBody: {
    paddingVertical: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  itemEditor: {
    backgroundColor: '#f8fafc',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editorTitle: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  formGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  addBtn: {
    backgroundColor: colors.primary[600],
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addBtnText: {
    color: 'white',
    fontWeight: typography.fontWeight.bold,
    fontSize: 13,
  },
  billItemsList: {
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  billItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  billItemName: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  billItemQty: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  billItemPrice: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  deleteIcon: {
    fontSize: 16,
  },
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: '#f8fafc',
  },
  totalBillLabel: {
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
  },
  totalBillValue: {
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
});

export default SupplierManagement;
