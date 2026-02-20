import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { getCattleFeedInventory, addCattleFeedSale, getCattleFeedSales, getCattleFeedInventoryItem } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import Modal from '../../../components/common/Modal';
import Receipt from '../../../components/common/Receipt';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { useToast } from '../../../contexts/ToastContext';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

const SellerSales: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [inventory, setInventory] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [inventoryData, salesData] = await Promise.all([
        getCattleFeedInventory(),
        getCattleFeedSales(),
      ]);
      setInventory(Array.isArray(inventoryData) ? inventoryData : []);
      setSales(Array.isArray(salesData) ? salesData : []);
    } catch (err: any) {
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

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectedItemChange = (name: string, value: string | number) => {
    setSelectedItem(prev => ({ ...prev, [name]: value }));
  };

  const addItemToSale = async () => {
    if (!selectedItem.inventoryId || !selectedItem.quantity) {
      toast.error('Select item and quantity');
      return;
    }

    try {
      const inventoryItem = await getCattleFeedInventoryItem(selectedItem.inventoryId);
      if (!inventoryItem) {
        toast.error('Item not found');
        return;
      }

      const quantity = parseFloat(selectedItem.quantity.toString());
      if (quantity <= 0 || isNaN(quantity)) {
        toast.error('Invalid quantity');
        return;
      }

      const existingIndex = formData.items.findIndex(item => item.inventoryId === selectedItem.inventoryId);
      const currentInCart = existingIndex >= 0 ? formData.items[existingIndex].quantity : 0;

      if (quantity + currentInCart > inventoryItem.quantity) {
        toast.error(`Stock limit: ${inventoryItem.quantity} ${inventoryItem.unit}`);
        return;
      }

      const unitPrice = saleType === 'wholesale' ? inventoryItem.wholesalePrice : inventoryItem.retailPrice;
      const total = quantity * unitPrice;

      if (existingIndex >= 0) {
        const updatedItems = [...formData.items];
        const newQuantity = updatedItems[existingIndex].quantity + quantity;
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
      toast.success('Added to list');
    } catch (err: any) {
      toast.error('Failed to add item');
    }
  };

  const removeItemFromSale = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const handleSubmit = async () => {
    if (!formData.customerName.trim()) {
      toast.error('Customer name required');
      return;
    }
    if (formData.items.length === 0) {
      toast.error('Add at least one item');
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
      toast.success('Sale recorded successfully');
      setSelectedSaleForReceipt(newSale);
      setFormData({ customerName: '', customerPhone: '', items: [] });
      await loadData();
      setShowReceipt(true);
    } catch (err: any) {
      toast.error('Failed to record sale');
    }
  };

  const availableItems = inventory.filter(item => item.quantity > 0);
  const sortedSales = [...sales].sort((a, b) =>
    new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
  );

  const stats = {
    revenue: sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
    count: sales.length,
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Sales Management"
        subtitle="Record & track your daily sales"
      />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'create' && styles.activeTab]}
          onPress={() => setActiveTab('create')}
        >
          <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>New Sale</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[500]]} />
        }
      >
        <View style={styles.content}>
          {activeTab === 'create' ? (
            <View>
              <Card style={styles.mainCard}>
                <View style={[styles.badgeContainer, { marginBottom: spacing.lg }]}>
                  <TouchableOpacity
                    style={[styles.typeBtn, saleType === 'wholesale' && styles.activeTypeBtnWholesale]}
                    onPress={() => setSaleType('wholesale')}
                  >
                    <Text style={[styles.typeBtnText, saleType === 'wholesale' && styles.activeTypeBtnText]}>🏢 Wholesale</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, saleType === 'retail' && styles.activeTypeBtnRetail]}
                    onPress={() => setSaleType('retail')}
                  >
                    <Text style={[styles.typeBtnText, saleType === 'retail' && styles.activeTypeBtnText]}>🛍️ Retail</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formSection}>
                  <Input
                    label="Customer Name *"
                    value={formData.customerName}
                    onChangeText={(v) => handleInputChange('customerName', v)}
                    placeholder="Enter customer name"
                  />
                  <Input
                    label="Phone Number"
                    value={formData.customerPhone}
                    onChangeText={(v) => handleInputChange('customerPhone', v)}
                    keyboardType="phone-pad"
                    placeholder="Enter customer mobile"
                  />
                </View>

                <View style={styles.itemPickerCard}>
                  <Text style={styles.sectionTitle}>Add Inventory Item</Text>
                  <Select
                    label="Product Name"
                    value={selectedItem.inventoryId}
                    onChange={(v) => handleSelectedItemChange('inventoryId', v)}
                    options={availableItems.map(item => ({
                      value: item._id || item.id,
                      label: `${item.name} (${item.quantity} ${item.unit})`,
                    }))}
                  />

                  {selectedItem.inventoryId ? (
                    <View style={styles.pricePreview}>
                      {(() => {
                        const itemData = inventory.find(i => (i._id || i.id) === selectedItem.inventoryId);
                        const price = itemData ? (saleType === 'wholesale' ? itemData.wholesalePrice : itemData.retailPrice) : 0;
                        const subtotal = price * (parseFloat(selectedItem.quantity) || 0);
                        return (
                          <>
                            <View style={styles.priceTag}>
                              <Text style={styles.priceTagLabel}>{saleType === 'wholesale' ? 'Wholesale' : 'Retail'} Price:</Text>
                              <Text style={styles.priceTagValue}>₹{price.toFixed(2)}</Text>
                            </View>
                            {parseFloat(selectedItem.quantity) > 0 && (
                              <View style={styles.subtotalTag}>
                                <Text style={styles.subtotalTagLabel}>Item Subtotal:</Text>
                                <Text style={styles.subtotalTagValue}>₹{subtotal.toFixed(2)}</Text>
                              </View>
                            )}
                          </>
                        );
                      })()}
                    </View>
                  ) : null}

                  <View style={styles.qtyRow}>
                    <Input
                      label="Quantity"
                      value={selectedItem.quantity}
                      onChangeText={(v) => handleSelectedItemChange('quantity', v)}
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      containerStyle={{ flex: 1 }}
                    />
                    <TouchableOpacity style={styles.addToListBtn} onPress={addItemToSale}>
                      <Text style={styles.addToListBtnText}>+ Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {formData.items.length > 0 && (
                  <View style={styles.cartSection}>
                    <Text style={styles.sectionTitle}>Summary List</Text>
                    {formData.items.map((item, idx) => (
                      <View key={idx} style={styles.cartItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cartItemName}>{item.itemName}</Text>
                          <Text style={styles.cartItemDetail}>{item.quantity} {item.unit} @ ₹{item.unitPrice}</Text>
                        </View>
                        <View style={styles.cartActions}>
                          <Text style={styles.cartItemTotal}>₹{item.total.toFixed(2)}</Text>
                          <TouchableOpacity onPress={() => removeItemFromSale(idx)}>
                            <Text style={styles.removeIcon}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}

                    <View style={styles.totalBanner}>
                      <Text style={styles.totalLabel}>Total Payable</Text>
                      <Text style={styles.totalValue}>₹{calculateTotal().toFixed(2)}</Text>
                    </View>

                    <Button
                      onPress={handleSubmit}
                      style={{ marginTop: spacing.lg }}
                    >Generate Receipt</Button>
                  </View>
                )}
              </Card>
            </View>
          ) : (
            <View>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Revenue</Text>
                  <Text style={styles.statValue}>₹{stats.revenue.toLocaleString()}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Total Sales</Text>
                  <Text style={styles.statValue}>{stats.count}</Text>
                </View>
              </View>

              {loading && !refreshing ? (
                <ActivityIndicator color={colors.primary[500]} style={{ marginTop: 40 }} />
              ) : sortedSales.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📦</Text>
                  <Text style={styles.emptyText}>No sales recorded yet.</Text>
                </View>
              ) : (
                sortedSales.map((sale) => (
                  <Card key={sale._id || sale.id} style={styles.saleCard}>
                    <TouchableOpacity
                      style={styles.saleHeader}
                      onPress={() => {
                        setSelectedSaleForReceipt(sale);
                        setShowReceipt(true);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.saleName}>{sale.customerName}</Text>
                        <Text style={styles.saleDate}>
                          {new Date(sale.date || sale.createdAt).toLocaleDateString(undefined, {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </Text>
                      </View>
                      <View style={[styles.typeSticker, sale.saleType === 'wholesale' ? styles.stickerWholesale : styles.stickerRetail]}>
                        <Text style={styles.stickerText}>{sale.saleType?.toUpperCase()}</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.saleInfo}>
                      <Text style={styles.infoText}>{sale.items?.length || 0} items sold</Text>
                      <Text style={styles.saleTotal}>₹{sale.totalAmount?.toFixed(2)}</Text>
                    </View>

                    <View style={styles.saleFooter}>
                      <TouchableOpacity
                        style={styles.viewReceiptLink}
                        onPress={() => {
                          setSelectedSaleForReceipt(sale);
                          setShowReceipt(true);
                        }}
                      >
                        <Text style={styles.receiptLinkText}>📄 View Receipt</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary[500],
  },
  tabText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
  },
  activeTabText: {
    color: colors.primary[600],
  },
  content: {
    padding: spacing.lg,
  },
  mainCard: {
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  badgeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeTypeBtnWholesale: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  activeTypeBtnRetail: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.tertiary,
  },
  activeTypeBtnText: {
    color: colors.text.primary,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  itemPickerCard: {
    backgroundColor: '#f8fafc',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  pricePreview: {
    backgroundColor: '#fff',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  priceTag: {
    paddingHorizontal: spacing.sm,
  },
  priceTagLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: typography.fontWeight.bold,
  },
  priceTagValue: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.bold,
  },
  subtotalTag: {
    paddingHorizontal: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: '#f1f5f9',
  },
  subtotalTagLabel: {
    fontSize: 10,
    color: colors.primary[600],
    textTransform: 'uppercase',
    fontWeight: typography.fontWeight.bold,
  },
  subtotalTagValue: {
    fontSize: 16,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.bold,
  },
  addToListBtn: {
    backgroundColor: colors.primary[600],
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToListBtnText: {
    color: 'white',
    fontWeight: typography.fontWeight.bold,
  },
  cartSection: {
    marginTop: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  cartItemDetail: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  cartActions: {
    alignItems: 'flex-end',
    gap: 4,
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  removeIcon: {
    fontSize: 16,
    opacity: 0.5,
  },
  totalBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[700],
  },
  totalValue: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[700],
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'white',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  saleCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  saleName: {
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  saleDate: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  typeSticker: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stickerWholesale: {
    backgroundColor: '#dbeafe',
  },
  stickerRetail: {
    backgroundColor: '#d1fae5',
  },
  stickerText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
  },
  saleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  infoText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  saleTotal: {
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  saleFooter: {
    marginTop: spacing.md,
  },
  viewReceiptLink: {
    paddingVertical: spacing.sm,
  },
  receiptLinkText: {
    fontSize: 13,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.2,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
});

export default SellerSales;
