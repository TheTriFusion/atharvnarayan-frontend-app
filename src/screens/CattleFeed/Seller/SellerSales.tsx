import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { getCattleFeedInventory, addCattleFeedSale, getCattleFeedSales, getCattleFeedInventoryItem } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import Modal from '../../../components/common/Modal';
import Receipt from '../../../components/common/Receipt';
import { useToast } from '../../../contexts/ToastContext';

const SellerSales: React.FC = () => {
  const { success, error: showError } = useToast();
  const [inventory, setInventory] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [saleType, setSaleType] = useState<'wholesale' | 'retail'>('retail');
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
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [inventoryData, salesData] = await Promise.all([
        getCattleFeedInventory(),
        getCattleFeedSales(),
      ]);
      setInventory(Array.isArray(inventoryData) ? inventoryData : []);
      setSales(Array.isArray(salesData) ? salesData : []);
    } catch (err: any) {
      showError(err.message || 'Failed to load data');
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

      const existingIndex = formData.items.findIndex(item => item.inventoryId === selectedItem.inventoryId);
      const unitPrice = saleType === 'wholesale' ? inventoryItem.wholesalePrice : inventoryItem.retailPrice;
      const total = quantity * unitPrice;

      if (existingIndex >= 0) {
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
        setFormData(prev => ({
          ...prev,
          items: [
            ...prev.items,
            {
              inventoryId: inventoryItem._id || inventoryItem.id,
              itemName: inventoryItem.name,
              quantity: quantity,
              unit: inventoryItem.unit,
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
      if (!inventoryItem) return;

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
      const saleData = {
        saleType: saleType,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone || null,
        items: formData.items,
        totalAmount: calculateTotal(),
      };
      
      const newSale = await addCattleFeedSale(saleData);
      setSuccessMessage(`Sale created successfully! Total: ₹${calculateTotal().toFixed(2)}`);
      setSelectedSaleForReceipt(newSale);
      
      setFormData({ customerName: '', customerPhone: '', items: [] });
      setSelectedItem({ inventoryId: '', quantity: '' });
      setErrors({});
      
      await loadData();
      
      setTimeout(() => {
        setShowReceipt(true);
      }, 500);
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 10000);
    } catch (err: any) {
      showError(err.message || 'Failed to create sale');
    }
  };

  const availableItems = inventory.filter(item => item.quantity > 0);
  const sortedSales = [...sales].sort((a, b) => 
    new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sales Management</Text>
      </View>

      {successMessage && (
        <Card style={styles.successCard}>
          <View style={styles.successContent}>
            <Text style={styles.successText}>{successMessage}</Text>
            {selectedSaleForReceipt && (
              <Button
                variant="primary"
                onPress={() => setShowReceipt(true)}
                style={styles.receiptButton}
              >
                View Receipt
              </Button>
            )}
          </View>
        </Card>
      )}

      <Card>
        <View style={styles.saleTypeSection}>
          <Text style={styles.saleTypeLabel}>Sale Type</Text>
          <View style={styles.saleTypeButtons}>
            <TouchableOpacity
              style={[styles.saleTypeButton, saleType === 'wholesale' && styles.activeSaleTypeButton]}
              onPress={async () => {
                setSaleType('wholesale');
                const updatedItems = await Promise.all(
                  formData.items.map(async (item) => {
                    const inventoryItem = await getCattleFeedInventoryItem(item.inventoryId);
                    if (inventoryItem) {
                      const unitPrice = inventoryItem.wholesalePrice;
                      return {
                        ...item,
                        unitPrice: unitPrice,
                        total: item.quantity * unitPrice,
                      };
                    }
                    return item;
                  })
                );
                setFormData(prev => ({ ...prev, items: updatedItems }));
              }}
            >
              <Text style={[styles.saleTypeButtonText, saleType === 'wholesale' && styles.activeSaleTypeButtonText]}>
                Wholesale
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saleTypeButton, saleType === 'retail' && styles.activeSaleTypeButton]}
              onPress={async () => {
                setSaleType('retail');
                const updatedItems = await Promise.all(
                  formData.items.map(async (item) => {
                    const inventoryItem = await getCattleFeedInventoryItem(item.inventoryId);
                    if (inventoryItem) {
                      const unitPrice = inventoryItem.retailPrice;
                      return {
                        ...item,
                        unitPrice: unitPrice,
                        total: item.quantity * unitPrice,
                      };
                    }
                    return item;
                  })
                );
                setFormData(prev => ({ ...prev, items: updatedItems }));
              }}
            >
              <Text style={[styles.saleTypeButtonText, saleType === 'retail' && styles.activeSaleTypeButtonText]}>
                Retail
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.customerSection}>
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
              options={availableItems.map(item => ({
                value: item._id || item.id,
                label: `${item.name} (Stock: ${item.quantity} ${item.unit})`,
              }))}
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

        {formData.items.length > 0 && (
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Items in Sale:</Text>
            {formData.items.map((item, index) => (
              <View key={index} style={styles.saleItemRow}>
                <View style={styles.saleItemInfo}>
                  <Text style={styles.itemName}>{item.itemName}</Text>
                  <Text style={styles.itemDetails}>
                    {item.quantity} {item.unit || ''} × ₹{item.unitPrice?.toFixed(2)} = ₹{item.total?.toFixed(2)}
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
                Total Amount: ₹{calculateTotal().toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        <Button
          variant="primary"
          onPress={handleSubmit}
          disabled={formData.items.length === 0}
          style={styles.submitButton}
        >
          Create Sale
        </Button>
      </Card>

      <Card title={`All Sales History (${sortedSales.length} transactions)`}>
        {sortedSales.length === 0 ? (
          <Text style={styles.emptyText}>No sales found</Text>
        ) : (
          <View style={styles.salesList}>
            {sortedSales.map((sale) => (
              <View key={sale._id || sale.id} style={styles.saleItem}>
                <View style={styles.saleItemContent}>
                  <Text style={styles.saleId}>Sale ID: {sale._id || sale.id}</Text>
                  <Text style={styles.saleDate}>
                    {new Date(sale.date || sale.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={styles.saleCustomer}>{sale.customerName}</Text>
                  {sale.customerPhone && (
                    <Text style={styles.salePhone}>{sale.customerPhone}</Text>
                  )}
                  <View style={[styles.typeBadge, sale.saleType === 'wholesale' ? styles.wholesaleBadge : styles.retailBadge]}>
                    <Text style={styles.typeBadgeText}>
                      {sale.saleType?.charAt(0).toUpperCase() + sale.saleType?.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.saleItems}>
                    {sale.items?.length || 0} items
                  </Text>
                  <Text style={styles.saleAmount}>
                    ₹{sale.totalAmount?.toFixed(2) || '0.00'}
                  </Text>
                </View>
                <Button
                  variant="primary"
                  onPress={() => {
                    setSelectedSaleForReceipt(sale);
                    setShowReceipt(true);
                  }}
                  style={styles.receiptButton}
                >
                  Receipt
                </Button>
              </View>
            ))}
          </View>
        )}

        {sortedSales.length > 0 && (
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Sales</Text>
              <Text style={styles.statValue}>{sortedSales.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Wholesale</Text>
              <Text style={styles.statValue}>
                {sortedSales.filter(s => s.saleType === 'wholesale').length}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Retail</Text>
              <Text style={styles.statValue}>
                {sortedSales.filter(s => s.saleType === 'retail').length}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Revenue</Text>
              <Text style={styles.statValue}>
                ₹{sortedSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      </Card>

      <Modal
        visible={showReceipt}
        onClose={() => {
          setShowReceipt(false);
          setSelectedSaleForReceipt(null);
        }}
        title="Sales Receipt"
      >
        {selectedSaleForReceipt && (
          <Receipt
            sale={selectedSaleForReceipt}
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
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  successCard: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
    marginBottom: 16,
  },
  successContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successText: {
    fontSize: 14,
    color: '#065f46',
    flex: 1,
  },
  receiptButton: {
    marginLeft: 12,
  },
  saleTypeSection: {
    marginBottom: 16,
  },
  saleTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  saleTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saleTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  activeSaleTypeButton: {
    backgroundColor: '#2563eb',
  },
  saleTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  activeSaleTypeButtonText: {
    color: '#ffffff',
  },
  customerSection: {
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
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
  submitButton: {
    marginTop: 16,
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
  saleId: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#6b7280',
    marginBottom: 4,
  },
  saleDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  saleCustomer: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  salePhone: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  wholesaleBadge: {
    backgroundColor: '#e0e7ff',
  },
  retailBadge: {
    backgroundColor: '#ccfbf1',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  saleItems: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  statsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
});

export default SellerSales;
