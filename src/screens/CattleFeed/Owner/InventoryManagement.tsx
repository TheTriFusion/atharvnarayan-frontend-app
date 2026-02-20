import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import {
  getCattleFeedInventory,
  addCattleFeedInventory,
  updateCattleFeedInventory,
  deleteCattleFeedInventory,
} from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import Select from '../../../components/common/Select';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

interface InventoryItem {
  _id: string;
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  wholesalePrice?: number;
  retailPrice?: number;
  supplier?: string;
  purchaseCost?: number;
  amountPaid?: number;
  paymentStatus?: string;
  paymentDueDate?: string;
  expiryDate?: string;
  description?: string;
}

const CattleFeedOwnerInventoryManagement: React.FC = () => {
  const { isSuperAdmin, user } = useAuth();
  const { selectedOwnerId } = useOwner();
  const toast = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: 'kg',
    wholesalePrice: '',
    retailPrice: '',
    supplier: '',
    purchaseCost: '',
    amountPaid: '',
    paymentStatus: 'pending',
    paymentDueDate: '',
    expiryDate: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const businessCategory = (user as any)?.companyDetails?.businessCategory || 'agro_cattle_feed';

  const CATEGORY_PRESETS: Record<string, string[]> = {
    'agro_cattle_feed': ['Cattle Feed', 'Poultry Feed', 'Goat Feed', 'Sheep Feed', 'Supplements', 'Medicines'],
    'grocery': ['Grains', 'Spices', 'Oil', 'Snacks', 'Beverages', 'Cleaning', 'Personal Care'],
    'medical': ['Tablets', 'Syrups', 'Injections', 'Surgicals', 'Wellness', 'Baby Care'],
    'hardware': ['Tools', 'Paints', 'Plumbing', 'Electrical', 'Cement', 'Fittings'],
    'clothing': ['Men', 'Women', 'Kids', 'Accessories', 'Fabrics'],
    'other': ['General'],
  };

  const UNIT_PRESETS: Record<string, string[]> = {
    'agro_cattle_feed': ['kg', 'bag', 'ton', 'liter', 'bottle'],
    'grocery': ['kg', 'gram', 'liter', 'packet', 'box', 'pcs', 'dozen'],
    'medical': ['strip', 'bottle', 'box', 'tube', 'vial', 'pcs'],
    'hardware': ['pcs', 'kg', 'meter', 'box', 'set', 'liter'],
    'clothing': ['pcs', 'meter', 'set', 'pair'],
    'other': ['pcs', 'kg', 'liter', 'box'],
  };

  const categories = CATEGORY_PRESETS[businessCategory] || CATEGORY_PRESETS['other'];
  const units = UNIT_PRESETS[businessCategory] || UNIT_PRESETS['other'];
  const availableCategories = [...new Set([...categories, ...inventory.map(i => i.category).filter(Boolean)])].sort();

  useEffect(() => {
    loadData();
  }, [selectedOwnerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      const data = await getCattleFeedInventory(ownerId);
      setInventory(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.quantity || parseFloat(formData.quantity) < 0) {
      newErrors.quantity = 'Valid quantity is required';
    }
    if (!formData.wholesalePrice || parseFloat(formData.wholesalePrice) < 0) {
      newErrors.wholesalePrice = 'Valid wholesale price is required';
    }
    if (!formData.retailPrice || parseFloat(formData.retailPrice) < 0) {
      newErrors.retailPrice = 'Valid retail price is required';
    }
    if (parseFloat(formData.wholesalePrice) >= parseFloat(formData.retailPrice)) {
      newErrors.retailPrice = 'Retail price must be higher than wholesale price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const itemData = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        wholesalePrice: parseFloat(formData.wholesalePrice),
        retailPrice: parseFloat(formData.retailPrice),
        purchaseCost: parseFloat(formData.purchaseCost) || 0,
        amountPaid: parseFloat(formData.amountPaid) || 0,
        paymentStatus: formData.paymentStatus,
        paymentDueDate: formData.paymentDueDate || null,
        expiryDate: formData.expiryDate || null,
        description: formData.description || '',
      };

      if (editingItem) {
        await updateCattleFeedInventory(editingItem._id || editingItem._id, itemData);
        toast.success('Inventory item updated successfully');
      } else {
        await addCattleFeedInventory(itemData);
        toast.success('Inventory item added successfully');
      }

      resetForm();
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save inventory item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      category: item.category || '',
      quantity: item.quantity?.toString() || '',
      unit: item.unit || 'kg',
      wholesalePrice: item.wholesalePrice?.toString() || '',
      retailPrice: item.retailPrice?.toString() || '',
      supplier: item.supplier || '',
      purchaseCost: item.purchaseCost?.toString() || '',
      amountPaid: item.amountPaid?.toString() || '',
      paymentStatus: item.paymentStatus || 'pending',
      paymentDueDate: item.paymentDueDate ? new Date(item.paymentDueDate).toISOString().split('T')[0] : '',
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
      description: item.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCattleFeedInventory(id);
            toast.success('Inventory item deleted successfully');
            await loadData();
          } catch (err: any) {
            toast.error(err.message || 'Failed to delete inventory item');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      quantity: '',
      unit: 'kg',
      wholesalePrice: '',
      retailPrice: '',
      supplier: '',
      purchaseCost: '',
      amountPaid: '',
      paymentStatus: 'pending',
      paymentDueDate: '',
      expiryDate: '',
      description: '',
    });
    setEditingItem(null);
    setErrors({});
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Inventory"
        subtitle="Manage stock and pricing"
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
          {/* Search and Filter */}
          <Card style={styles.filterCard}>
            <Input
              label="Search Inventory"
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search by product name..."
              containerStyle={{ marginBottom: spacing.md }}
            />
            <Select
              label="Category Filter"
              value={filterCategory}
              onChange={(value) => setFilterCategory(value as string)}
              options={[
                { label: 'All Categories', value: '' },
                ...availableCategories.filter((cat): cat is string => !!cat).map(cat => ({ label: cat, value: cat })),
              ]}
            />
          </Card>

          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={colors.primary[500]} style={styles.loader} />
          ) : (
            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>
                  Items ({filteredInventory.length})
                </Text>
              </View>

              {filteredInventory.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📦</Text>
                  <Text style={styles.emptyText}>
                    No inventory items found. Add your first item.
                  </Text>
                </View>
              ) : (
                filteredInventory.map((item) => (
                  <Card key={item._id} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View style={styles.nameSection}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemCategory}>{item.category || 'N/A'}</Text>
                      </View>
                      <View style={[styles.badge, item.quantity && item.quantity < 50 ? styles.badgeError : styles.badgeSuccess]}>
                        <Text style={[styles.badgeText, item.quantity && item.quantity < 50 ? styles.badgeTextError : styles.badgeTextSuccess]}>
                          {item.quantity} {item.unit}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.pricingRow}>
                      <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>Wholesale</Text>
                        <Text style={styles.priceValue}>₹{item.wholesalePrice || 0}</Text>
                      </View>
                      <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>Retail</Text>
                        <Text style={styles.priceValue}>₹{item.retailPrice || 0}</Text>
                      </View>
                      <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>Margin</Text>
                        <Text style={[styles.priceValue, { color: colors.success[600] }]}>
                          ₹{((item.retailPrice || 0) - (item.wholesalePrice || 0)).toFixed(1)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.editBtn]}
                        onPress={() => handleEdit(item)}
                      >
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => handleDelete(item._id)}
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

      {/* Create/Edit Modal */}
      <Modal
        visible={showForm}
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        title={editingItem ? 'Edit Item' : 'Add New Item'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Input
            label="Product Name *"
            value={formData.name}
            onChangeText={(text) => {
              setFormData({ ...formData, name: text });
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
            error={errors.name}
            placeholder="e.g. Premium Cattle Feed"
          />
          <Select
            label="Category *"
            value={formData.category}
            onChange={(value) => {
              setFormData({ ...formData, category: value as string });
              if (errors.category) setErrors({ ...errors, category: '' });
            }}
            options={[
              { label: 'Select Category', value: '' },
              ...availableCategories.filter((cat): cat is string => !!cat).map(cat => ({ label: cat, value: cat })),
            ]}
          />
          <View style={styles.formRow}>
            <Input
              label="Quantity *"
              value={formData.quantity}
              onChangeText={(text) => {
                setFormData({ ...formData, quantity: text });
                if (errors.quantity) setErrors({ ...errors, quantity: '' });
              }}
              keyboardType="numeric"
              error={errors.quantity}
              containerStyle={styles.halfInput}
              placeholder="0"
            />
            <Select
              label="Unit *"
              value={formData.unit}
              onChange={(value) => setFormData({ ...formData, unit: value as string })}
              options={units.map(u => ({ label: u, value: u }))}
              containerStyle={styles.halfInput}
            />
          </View>
          <View style={styles.formRow}>
            <Input
              label="Wholesale Price *"
              value={formData.wholesalePrice}
              onChangeText={(text) => {
                setFormData({ ...formData, wholesalePrice: text });
                if (errors.wholesalePrice) setErrors({ ...errors, wholesalePrice: '' });
              }}
              keyboardType="numeric"
              error={errors.wholesalePrice}
              containerStyle={styles.halfInput}
              placeholder="0.00"
            />
            <Input
              label="Retail Price *"
              value={formData.retailPrice}
              onChangeText={(text) => {
                setFormData({ ...formData, retailPrice: text });
                if (errors.retailPrice) setErrors({ ...errors, retailPrice: '' });
              }}
              keyboardType="numeric"
              error={errors.retailPrice}
              containerStyle={styles.halfInput}
              placeholder="0.00"
            />
          </View>
          <Input
            label="Supplier"
            value={formData.supplier}
            onChangeText={(text) => setFormData({ ...formData, supplier: text })}
            placeholder="Optional"
          />
          <Input
            label="Description"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Optional notes about the product"
            multiline
            numberOfLines={3}
          />
          <View style={styles.modalActions}>
            <Button
              onPress={() => {
                setShowForm(false);
                resetForm();
              }}
              variant="outline"
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              onPress={handleSubmit}
              style={styles.modalButton}
              loading={submitting}
              disabled={submitting}
            >
              {editingItem ? 'Update' : 'Save Item'}
            </Button>
          </View>
          <View style={{ height: spacing.xl }} />
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
    padding: spacing.sm,
  },
  addButtonIcon: {
    fontSize: 20,
  },
  filterCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
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
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  itemCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameSection: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  itemCategory: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  badgeSuccess: {
    backgroundColor: colors.success[50],
  },
  badgeError: {
    backgroundColor: colors.error[50],
  },
  badgeText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  badgeTextSuccess: {
    color: colors.success[600],
  },
  badgeTextError: {
    color: colors.error[600],
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: spacing.md,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  priceItem: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: typography.fontWeight.bold,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  editBtnText: {
    color: colors.primary[700],
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
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  modalButton: {
    flex: 1,
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
    textAlign: 'center',
  },
});

export default CattleFeedOwnerInventoryManagement;
