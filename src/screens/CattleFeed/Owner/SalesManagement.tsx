import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import {
  getCattleFeedSales,
  addCattleFeedSale,
  updateCattleFeedSale,
  deleteCattleFeedSale,
  getCattleFeedInventory,
  getCattleFeedInventoryItem
} from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import Modal from '../../../components/common/Modal';
import Receipt from '../../../components/common/Receipt';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

const SalesManagement: React.FC = () => {
  const { isSuperAdmin, user: currentUser } = useAuth();
  const { selectedOwnerId } = useOwner();
  const toast = useToast();
  const [sales, setSales] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saleType, setSaleType] = useState<'wholesale' | 'retail'>('wholesale');
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    items: [] as any[],
  });
  const [selectedItem, setSelectedItem] = useState({
    inventoryId: '',
    quantity: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedOwnerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      const [salesData, inventoryData] = await Promise.all([
        getCattleFeedSales(ownerId),
        getCattleFeedInventory(ownerId),
      ]);
      setSales(Array.isArray(salesData) ? salesData : []);
      setInventory(Array.isArray(inventoryData) ? inventoryData : []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load sales data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectedItemChange = (name: string, value: string | number) => {
    setSelectedItem(prev => ({ ...prev, [name]: value }));
  };

  const addItemToSale = async () => {
    if (!selectedItem.inventoryId || !selectedItem.quantity) {
      toast.error('Please select an item and enter quantity');
      return;
    }

    try {
      const inventoryItem = await getCattleFeedInventoryItem(selectedItem.inventoryId);
      if (!inventoryItem) {
        toast.error('Item not found');
        return;
      }

      const quantity = parseFloat(selectedItem.quantity.toString());
      if (quantity <= 0) {
        toast.error('Quantity must be greater than 0');
        return;
      }

      if (quantity > inventoryItem.quantity) {
        toast.error(`Insufficient stock. Available: ${inventoryItem.quantity} ${inventoryItem.unit}`);
        return;
      }

      const existingIndex = formData.items.findIndex(item =>
        item.inventoryId === selectedItem.inventoryId
      );
      const unitPrice = saleType === 'wholesale' ? inventoryItem.wholesalePrice : inventoryItem.retailPrice;
      const total = quantity * unitPrice;

      if (existingIndex >= 0) {
        const updatedItems = [...formData.items];
        const newQuantity = updatedItems[existingIndex].quantity + quantity;
        if (newQuantity > inventoryItem.quantity) {
          toast.error(`Insufficient stock. Available: ${inventoryItem.quantity} ${inventoryItem.unit}`);
          return;
        }
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: newQuantity,
          total: newQuantity * unitPrice,
        };
        setFormData(prev => ({ ...prev, items: updatedItems }));
      } else {
        setFormData(prev => ({
          ...prev,
          items: [
            ...prev.items,
            {
              inventoryId: inventoryItem._id || inventoryItem.id,
              itemName: inventoryItem.name,
              quantity: quantity,
              unitPrice: unitPrice,
              total: total,
            },
          ],
        }));
      }

      setSelectedItem({ inventoryId: '', quantity: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to add item to sale');
    }
  };

  const removeItemFromSale = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const updateItemQuantity = async (index: number, newQuantity: string) => {
    const item = formData.items[index];
    try {
      const inventoryItem = await getCattleFeedInventoryItem(item.inventoryId);
      if (!inventoryItem) {
        toast.error('Item not found');
        return;
      }

      const quantity = parseFloat(newQuantity);
      if (isNaN(quantity) || quantity <= 0) return;

      if (quantity > inventoryItem.quantity) {
        toast.error(`Insufficient stock. Available: ${inventoryItem.quantity} ${inventoryItem.unit}`);
        return;
      }

      const unitPrice = saleType === 'wholesale' ? inventoryItem.wholesalePrice : inventoryItem.retailPrice;
      const updatedItems = [...formData.items];
      updatedItems[index] = {
        ...updatedItems[index],
        quantity: quantity,
        total: quantity * unitPrice,
      };
      setFormData(prev => ({ ...prev, items: updatedItems }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update item quantity');
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.customerName.trim()) newErrors.customerName = 'Customer name is required';
    if (formData.items.length === 0) newErrors.items = 'Add at least one item';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const saleData = {
        saleType: saleType,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone || null,
        items: formData.items,
        totalAmount: calculateTotal(),
      };

      if (editingSale) {
        await updateCattleFeedSale(editingSale._id || editingSale.id, saleData);
        toast.success('Sale updated successfully');
      } else {
        await addCattleFeedSale(saleData);
        toast.success('Sale created successfully');
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (sale: any) => {
    setEditingSale(sale);
    setSaleType(sale.saleType);
    setFormData({
      customerName: sale.customerName || '',
      customerPhone: sale.customerPhone || '',
      items: sale.items || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Sale',
      'Are you sure you want to delete this sale? Inventory will be restored.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCattleFeedSale(id);
              toast.success('Sale deleted successfully');
              await loadData();
            } catch (err: any) {
              toast.error(err.message || 'Failed to delete sale');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({ customerName: '', customerPhone: '', items: [] });
    setSelectedItem({ inventoryId: '', quantity: '' });
    setEditingSale(null);
    setShowForm(false);
    setErrors({});
  };

  const filteredSales = sales.filter(sale => sale.saleType === saleType);
  const availableItems = inventory.filter(item => item.quantity > 0);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Sales"
        subtitle={`Manage ${saleType} records`}
        showBackButton
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Text style={styles.addButtonIcon}>➕</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[500]]} />
        }
      >
        <View style={styles.content}>
          {isSuperAdmin && <OwnerSelector systemType="cattleFeed" />}

          {/* Sale Type Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, saleType === 'wholesale' && styles.activeTab]}
              onPress={() => setSaleType('wholesale')}
            >
              <Text style={[styles.tabText, saleType === 'wholesale' && styles.activeTabText]}>Wholesale</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, saleType === 'retail' && styles.activeTab]}
              onPress={() => setSaleType('retail')}
            >
              <Text style={[styles.tabText, saleType === 'retail' && styles.activeTabText]}>Retail</Text>
            </TouchableOpacity>
          </View>

          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={colors.primary[500]} style={styles.loader} />
          ) : (
            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>{saleType.charAt(0).toUpperCase() + saleType.slice(1)} Sales</Text>
                <Text style={styles.listCount}>{filteredSales.length} Total</Text>
              </View>

              {filteredSales.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>💰</Text>
                  <Text style={styles.emptyText}>No {saleType} sales records yet.</Text>
                </View>
              ) : (
                filteredSales.map((sale) => (
                  <Card key={sale._id || sale.id} style={styles.saleCard}>
                    <View style={styles.saleTop}>
                      <View>
                        <Text style={styles.customerName}>{sale.customerName}</Text>
                        <Text style={styles.saleDate}>
                          {new Date(sale.date || sale.createdAt).toLocaleDateString(undefined, {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </Text>
                      </View>
                      <Text style={styles.saleTotal}>₹{sale.totalAmount?.toFixed(2)}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.itemsSummary}>
                      <Text style={styles.itemsText}>
                        📦 {sale.items?.length || 0} product{(sale.items?.length || 0) !== 1 ? 's' : ''} sold
                      </Text>
                      {sale.customerPhone && (
                        <Text style={styles.phoneText}>📞 {sale.customerPhone}</Text>
                      )}
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.receiptBtn]}
                        onPress={() => {
                          setSelectedSaleForReceipt(sale);
                          setShowReceipt(true);
                        }}
                      >
                        <Text style={styles.receiptBtnText}>Receipt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.editBtn]}
                        onPress={() => handleEdit(sale)}
                      >
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => handleDelete(sale._id || sale.id)}
                      >
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sale Form Modal */}
      <Modal
        visible={showForm}
        onClose={resetForm}
        title={editingSale ? 'Edit Sale' : 'New Sale'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalContent}>
            <Input
              label="Customer Name *"
              value={formData.customerName}
              onChangeText={(v) => handleInputChange('customerName', v)}
              error={errors.customerName}
              placeholder="Full Name"
            />
            <Input
              label="Phone Number"
              value={formData.customerPhone}
              onChangeText={(v) => handleInputChange('customerPhone', v)}
              placeholder="Optional"
              keyboardType="phone-pad"
            />

            <View style={styles.formDivider} />
            <Text style={styles.formSectionTitle}>Add Products</Text>

            <View style={styles.addItemForm}>
              <Select
                label="Product"
                value={selectedItem.inventoryId}
                onChange={(v) => handleSelectedItemChange('inventoryId', v)}
                options={[
                  { value: '', label: 'Select' },
                  ...availableItems.map(i => ({
                    value: i._id || i.id,
                    label: `${i.name} (Stock: ${i.quantity})`,
                  })),
                ]}
                containerStyle={{ flex: 1 }}
              />
              <View style={{ width: 100 }}>
                <Input
                  label="Qty"
                  value={selectedItem.quantity}
                  onChangeText={(v) => handleSelectedItemChange('quantity', v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
              <TouchableOpacity
                style={styles.addIconBtn}
                onPress={addItemToSale}
              >
                <Text style={styles.addIcon}>＋</Text>
              </TouchableOpacity>
            </View>

            {errors.items && <Text style={styles.formError}>{errors.items}</Text>}

            {formData.items.length > 0 && (
              <View style={styles.cartContainer}>
                {formData.items.map((item, index) => (
                  <View key={index} style={styles.cartItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartItemName}>{item.itemName}</Text>
                      <Text style={styles.cartItemPrice}>
                        {item.quantity} × ₹{item.unitPrice?.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.cartItemRight}>
                      <Text style={styles.cartItemTotal}>₹{item.total?.toFixed(2)}</Text>
                      <TouchableOpacity onPress={() => removeItemFromSale(index)}>
                        <Text style={styles.removeItem}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <View style={styles.grandTotalContainer}>
                  <Text style={styles.grandTotalLabel}>Grand Total</Text>
                  <Text style={styles.grandTotalValue}>₹{calculateTotal().toFixed(2)}</Text>
                </View>
              </View>
            )}

            <View style={styles.modalFooter}>
              <Button variant="outline" onPress={resetForm} style={styles.modalFootBtn}>Cancel</Button>
              <Button
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting || formData.items.length === 0}
                style={styles.modalFootBtn}
              >
                {editingSale ? 'Update' : 'Confirm'}
              </Button>
            </View>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        visible={showReceipt}
        onClose={() => {
          setShowReceipt(false);
          setSelectedSaleForReceipt(null);
        }}
        title="Sale Receipt"
      >
        {selectedSaleForReceipt && (
          <Receipt
            sale={selectedSaleForReceipt}
            companyName={
              isSuperAdmin
                ? (selectedOwnerId ? 'Cattle Feed Store' : 'Cattle Feed Store')
                : (currentUser?.companyDetails?.name || 'Cattle Feed Store')
            }
            onClose={() => {
              setShowReceipt(false);
              setSelectedSaleForReceipt(null);
            }}
          />
        )}
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
    padding: spacing.sm,
  },
  addButtonIcon: {
    fontSize: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.lg,
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
  loader: {
    marginVertical: spacing.xxl,
  },
  listContainer: {
    marginBottom: spacing.xxl,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  listTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  listCount: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  saleCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  saleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  saleDate: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  saleTotal: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: spacing.md,
  },
  itemsSummary: {
    marginBottom: spacing.md,
  },
  itemsText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  phoneText: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptBtn: {
    backgroundColor: colors.primary[50],
  },
  receiptBtnText: {
    color: colors.primary[700],
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
  },
  editBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editBtnText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
  },
  deleteBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.error[100],
  },
  deleteBtnText: {
    color: colors.error[600],
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
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
  modalContent: {
    paddingVertical: spacing.sm,
  },
  formDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: spacing.lg,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  addItemForm: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addIconBtn: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addIcon: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  formError: {
    color: colors.error[600],
    fontSize: 12,
    marginBottom: spacing.md,
  },
  cartContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  cartItemPrice: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  cartItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  removeItem: {
    color: colors.error[500],
    fontSize: 16,
    padding: 4,
  },
  grandTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalFootBtn: {
    flex: 1,
  },
});

export default SalesManagement;
