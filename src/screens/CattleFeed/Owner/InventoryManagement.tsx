import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, FlatList, TouchableOpacity } from 'react-native';
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
    }
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory Management</Text>
        <Button
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Add Item
        </Button>
      </View>

      {/* Search and Filter */}
      <Card style={styles.filterCard}>
        <Input
          label="Search"
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search by name..."
        />
        <Select
          label="Filter by Category"
          value={filterCategory}
          onChange={(value) => setFilterCategory(value as string)}
          options={[
            { label: 'All Categories', value: '' },
            ...availableCategories.filter((cat): cat is string => !!cat).map(cat => ({ label: cat, value: cat })),
          ]}
        />
      </Card>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
      ) : (
        <Card style={styles.listCard}>
          {filteredInventory.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No inventory items found. Add your first item.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredInventory}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.itemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCategory}>{item.category || 'N/A'}</Text>
                    <Text style={styles.itemQuantity}>
                      {item.quantity || 0} {item.unit || 'units'}
                    </Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Wholesale:</Text>
                      <Text style={styles.priceValue}>₹{item.wholesalePrice || 0}</Text>
                      <Text style={styles.priceLabel}>Retail:</Text>
                      <Text style={styles.priceValue}>₹{item.retailPrice || 0}</Text>
                    </View>
                    {item.quantity && item.quantity < 50 && (
                      <Text style={styles.lowStock}>⚠️ Low Stock</Text>
                    )}
                  </View>
                  <View style={styles.itemActions}>
                    <Button
                      onPress={() => handleEdit(item)}
                      variant="secondary"
                      style={styles.actionButton}
                    >
                      Edit
                    </Button>
                    <Button
                      onPress={() => handleDelete(item._id)}
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
        visible={showForm}
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        title={editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
      >
        <ScrollView>
          <Input
            label="Product Name *"
            value={formData.name}
            onChangeText={(text) => {
              setFormData({ ...formData, name: text });
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
            error={errors.name}
            required
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
            required
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
              required
            />
            <Select
              label="Unit *"
              value={formData.unit}
              onChange={(value) => setFormData({ ...formData, unit: value as string })}
              options={units.map(u => ({ label: u, value: u }))}
              containerStyle={styles.halfInput}
              required
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
              required
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
              required
            />
          </View>
          <Input
            label="Supplier"
            value={formData.supplier}
            onChangeText={(text) => setFormData({ ...formData, supplier: text })}
            placeholder="Optional"
          />
          <View style={styles.formRow}>
            <Input
              label="Purchase Cost"
              value={formData.purchaseCost}
              onChangeText={(text) => setFormData({ ...formData, purchaseCost: text })}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
            <Input
              label="Amount Paid"
              value={formData.amountPaid}
              onChangeText={(text) => setFormData({ ...formData, amountPaid: text })}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
          </View>
          <Select
            label="Payment Status"
            value={formData.paymentStatus}
            onChange={(value) => setFormData({ ...formData, paymentStatus: value as string })}
            options={[
              { label: 'Pending', value: 'pending' },
              { label: 'Partial', value: 'partial' },
              { label: 'Paid', value: 'paid' },
            ]}
          />
          <View style={styles.formRow}>
            <Input
              label="Payment Due Date"
              value={formData.paymentDueDate}
              onChangeText={(text) => setFormData({ ...formData, paymentDueDate: text })}
              placeholder="YYYY-MM-DD"
              containerStyle={styles.halfInput}
            />
            <Input
              label="Expiry Date"
              value={formData.expiryDate}
              onChangeText={(text) => setFormData({ ...formData, expiryDate: text })}
              placeholder="YYYY-MM-DD"
              containerStyle={styles.halfInput}
            />
          </View>
          <Input
            label="Description"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Optional"
            multiline
            numberOfLines={3}
          />
          <View style={styles.modalActions}>
            <Button
              onPress={() => {
                setShowForm(false);
                resetForm();
              }}
              variant="secondary"
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
              {editingItem ? 'Update' : 'Create'}
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
  filterCard: {
    margin: 16,
    marginTop: 0,
  },
  loader: {
    marginVertical: 32,
  },
  listCard: {
    margin: 16,
    marginTop: 0,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  lowStock: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    marginTop: 4,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
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

export default CattleFeedOwnerInventoryManagement;
