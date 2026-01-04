import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { getCattleFeedSales, addCattleFeedSale, updateCattleFeedSale, deleteCattleFeedSale, getCattleFeedInventory, getCattleFeedInventoryItem } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import Modal from '../../../components/common/Modal';
import Receipt from '../../../components/common/Receipt';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';

const SalesManagement: React.FC = () => {
  const { isSuperAdmin, user: currentUser } = useAuth();
  const { selectedOwnerId } = useOwner();
  const { success, error: showError } = useToast();
  const [sales, setSales] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      const errorMessage = err.message || 'Failed to load sales data';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
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
      showError('Please select an item and enter quantity');
      return;
    }

    try {
      const inventoryItem = await getCattleFeedInventoryItem(selectedItem.inventoryId);
      if (!inventoryItem) {
        showError('Item not found');
        return;
      }

      const quantity = parseFloat(selectedItem.quantity.toString());
      if (quantity <= 0) {
        showError('Quantity must be greater than 0');
        return;
      }

      if (quantity > inventoryItem.quantity) {
        showError(`Insufficient stock. Available: ${inventoryItem.quantity} ${inventoryItem.unit}`);
        return;
      }

      // Check if item already in cart
      const existingIndex = formData.items.findIndex(item =>
        item.inventoryId === selectedItem.inventoryId ||
        item.inventoryId === inventoryItem._id ||
        item.inventoryId === inventoryItem.id
      );
      const unitPrice = saleType === 'wholesale' ? inventoryItem.wholesalePrice : inventoryItem.retailPrice;
      const total = quantity * unitPrice;

      if (existingIndex >= 0) {
        // Update existing item
        const updatedItems = [...formData.items];
        const newQuantity = updatedItems[existingIndex].quantity + quantity;
        if (newQuantity > inventoryItem.quantity) {
          showError(`Insufficient stock. Available: ${inventoryItem.quantity} ${inventoryItem.unit}`);
          return;
        }
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: newQuantity,
          total: newQuantity * unitPrice,
        };
        setFormData(prev => ({ ...prev, items: updatedItems }));
      } else {
        // Add new item
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
      showError(err.message || 'Failed to add item to sale');
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
        showError('Item not found');
        return;
      }

      const quantity = parseFloat(newQuantity);
      if (quantity <= 0) {
        showError('Quantity must be greater than 0');
        return;
      }

      if (quantity > inventoryItem.quantity) {
        showError(`Insufficient stock. Available: ${inventoryItem.quantity} ${inventoryItem.unit}`);
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
      showError(err.message || 'Failed to update item quantity');
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }
    if (formData.items.length === 0) {
      newErrors.items = 'Please add at least one item to the sale';
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
      const saleData = {
        saleType: saleType,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone || null,
        items: formData.items,
        totalAmount: calculateTotal(),
      };

      if (editingSale) {
        await updateCattleFeedSale(editingSale._id || editingSale.id, saleData);
        success('Sale updated successfully');
      } else {
        await addCattleFeedSale(saleData);
        success('Sale created successfully');
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save sale';
      showError(errorMessage);
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
      'Are you sure you want to delete this sale? This will restore inventory quantities.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCattleFeedSale(id);
              success('Sale deleted successfully');
              await loadData();
            } catch (err: any) {
              const errorMessage = err.message || 'Failed to delete sale';
              showError(errorMessage);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      items: [],
    });
    setSelectedItem({ inventoryId: '', quantity: '' });
    setEditingSale(null);
    setShowForm(false);
    setErrors({});
  };

  // Filter sales by type
  const filteredSales = sales.filter(sale => sale.saleType === saleType);

  // Get available inventory items (with stock > 0)
  const availableItems = inventory.filter(item => item.quantity > 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading sales data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {isSuperAdmin && <OwnerSelector systemType="cattleFeed" />}

      <View style={styles.header}>
        <Text style={styles.title}>Sales Management</Text>
        <Button
          variant="primary"
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Create New Sale
        </Button>
      </View>

      {/* Sale Type Toggle */}
      <Card style={styles.typeCard}>
        <View style={styles.typeButtons}>
          <Button
            variant={saleType === 'wholesale' ? 'primary' : 'secondary'}
            onPress={() => {
              setSaleType('wholesale');
              resetForm();
            }}
            style={styles.typeButton}
          >
            Wholesale Sales
          </Button>
          <Button
            variant={saleType === 'retail' ? 'primary' : 'secondary'}
            onPress={() => {
              setSaleType('retail');
              resetForm();
            }}
            style={styles.typeButton}
          >
            Retail Sales
          </Button>
        </View>
      </Card>

      {/* Sales List */}
      <Card title="Sales List">
        {filteredSales.length === 0 ? (
          <Text style={styles.emptyText}>No {saleType} sales found</Text>
        ) : (
          <View style={styles.salesList}>
            {filteredSales.map((sale) => (
              <View key={sale._id || sale.id} style={styles.saleItem}>
                <View style={styles.saleItemContent}>
                  <Text style={styles.saleDate}>
                    {new Date(sale.date || sale.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.saleCustomer}>{sale.customerName}</Text>
                  <Text style={styles.saleItems}>{sale.items?.length || 0} items</Text>
                  <Text style={styles.saleTotal}>₹{sale.totalAmount?.toFixed(2) || '0.00'}</Text>
                </View>
                <View style={styles.saleActions}>
                  <Button
                    variant="secondary"
                    onPress={() => {
                      setSelectedSaleForReceipt(sale);
                      setShowReceipt(true);
                    }}
                    style={styles.actionButton}
                  >
                    Receipt
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => handleEdit(sale)}
                    style={styles.actionButton}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onPress={() => handleDelete(sale._id || sale.id)}
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

      {/* Add/Edit Sale Form Modal */}
      <Modal
        visible={showForm}
        onClose={resetForm}
        title={editingSale ? 'Edit Sale' : 'Create New Sale'}
      >
        <ScrollView style={styles.modalContent}>
          <View style={styles.formRow}>
            <Input
              label="Customer Name"
              value={formData.customerName}
              onChangeText={(value) => handleInputChange('customerName', value)}
              required
              placeholder="Enter customer name"
              error={errors.customerName}
            />
            <Input
              label="Customer Phone (Optional)"
              value={formData.customerPhone}
              onChangeText={(value) => handleInputChange('customerPhone', value)}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.addItemsSection}>
            <Text style={styles.sectionTitle}>Add Items</Text>
            <View style={styles.addItemRow}>
              <Select
                label="Select Item"
                value={selectedItem.inventoryId}
                onChange={(value) => handleSelectedItemChange('inventoryId', value)}
                options={[
                  { value: '', label: 'Select an item' },
                  ...availableItems.map(item => ({
                    value: item._id || item.id,
                    label: `${item.name} (Stock: ${item.quantity} ${item.unit})`,
                  })),
                ]}
                containerStyle={styles.selectItem}
              />
              <Input
                label="Quantity"
                value={selectedItem.quantity}
                onChangeText={(value) => handleSelectedItemChange('quantity', value)}
                keyboardType="decimal-pad"
                placeholder="0"
                containerStyle={styles.quantityInput}
              />
              <Button
                variant="primary"
                onPress={addItemToSale}
                style={styles.addButton}
              >
                Add Item
              </Button>
            </View>
          </View>

          {errors.items && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errors.items}</Text>
            </View>
          )}

          {/* Items in Sale */}
          {formData.items.length > 0 && (
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Items in Sale</Text>
              {formData.items.map((item, index) => (
                <View key={index} style={styles.saleItemRow}>
                  <View style={styles.saleItemInfo}>
                    <Text style={styles.itemName}>{item.itemName}</Text>
                    <Text style={styles.itemDetails}>
                      {item.quantity} × ₹{item.unitPrice?.toFixed(2)} = ₹{item.total?.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.itemActions}>
                    <Input
                      value={item.quantity.toString()}
                      onChangeText={(value) => updateItemQuantity(index, value)}
                      keyboardType="decimal-pad"
                      containerStyle={styles.quantityUpdateInput}
                    />
                    <Button
                      variant="danger"
                      onPress={() => removeItemFromSale(index)}
                      style={styles.removeButton}
                    >
                      Remove
                    </Button>
                  </View>
                </View>
              ))}
              <View style={styles.totalBox}>
                <Text style={styles.totalText}>
                  Total: ₹{calculateTotal().toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.formActions}>
            <Button
              variant="secondary"
              onPress={resetForm}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleSubmit}
              disabled={submitting || formData.items.length === 0}
            >
              {submitting ? 'Saving...' : editingSale ? 'Update Sale' : 'Create Sale'}
            </Button>
          </View>
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
                ? (selectedOwnerId ? 'Retail Shop' : 'Retail Shop')
                : (currentUser?.companyDetails?.name || 'My Shop')
            }
            onClose={() => {
              setShowReceipt(false);
              setSelectedSaleForReceipt(null);
            }}
          />
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6b7280',
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
  typeCard: {
    marginBottom: 16,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#6b7280',
  },
  salesList: {
    gap: 12,
  },
  saleItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  saleItemContent: {
    marginBottom: 12,
  },
  saleDate: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
  },
  saleCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  saleItems: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  saleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  modalContent: {
    maxHeight: 600,
  },
  formRow: {
    gap: 16,
    marginBottom: 16,
  },
  addItemsSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  addItemRow: {
    gap: 12,
  },
  selectItem: {
    marginBottom: 0,
  },
  quantityInput: {
    marginBottom: 0,
  },
  addButton: {
    marginTop: 8,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
  },
  itemsSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    marginBottom: 16,
  },
  saleItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  saleItemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityUpdateInput: {
    width: 80,
    marginBottom: 0,
  },
  removeButton: {
    paddingHorizontal: 12,
  },
  totalBox: {
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});

export default SalesManagement;
