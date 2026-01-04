import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { getCattleFeedOrders, getCattleFeedInventory, updateCattleFeedOrderPayment, updateCattleFeedInventory } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import Select from '../../../components/common/Select';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';

const FinanceManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
  const [loading, setLoading] = useState(true);
  const [customerDues, setCustomerDues] = useState<any[]>([]);
  const [supplierDues, setSupplierDues] = useState<any[]>([]);
  const [modal, setModal] = useState({ show: false, type: '', item: null as any, amount: '', status: 'partial' });

  useEffect(() => {
    loadData();
  }, [selectedOwnerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const ownerId = isSuperAdmin ? selectedOwnerId : null;

      const allOrders = await getCattleFeedOrders(ownerId ? { ownerId } : {});
      const dueOrders = (Array.isArray(allOrders) ? allOrders : []).filter((o: any) => {
        const total = o.totalAmount || 0;
        const paid = o.amountPaid || 0;
        return paid < total && o.status !== 'cancelled';
      });
      setCustomerDues(dueOrders);

      const allInventory = await getCattleFeedInventory(ownerId);
      const dueInventory = (Array.isArray(allInventory) ? allInventory : []).filter((i: any) => {
        const cost = Number(i.purchaseCost) || 0;
        const paid = Number(i.amountPaid) || 0;
        return cost > 0 && paid < cost;
      });
      setSupplierDues(dueInventory);
    } catch (err: any) {
      console.error(err);
      showError('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = (type: string, item: any) => {
    setModal({
      show: true,
      type,
      item,
      amount: '',
      status: item.paymentStatus || 'partial',
    });
  };

  const handlePaymentSubmit = async () => {
    try {
      const amount = parseFloat(modal.amount);
      if (isNaN(amount) || amount <= 0) {
        showError('Please enter a valid amount');
        return;
      }

      const { type, item, status } = modal;

      if (type === 'customer') {
        const currentPaid = item.amountPaid || 0;
        const newPaid = currentPaid + amount;

        await updateCattleFeedOrderPayment(item._id, {
          amountPaid: newPaid,
          paymentStatus: status,
        });
        success('Payment recorded for Customer');
      } else {
        const currentPaid = item.amountPaid || 0;
        const newPaid = currentPaid + amount;

        await updateCattleFeedInventory(item._id || item.id, {
          amountPaid: newPaid,
          paymentStatus: status,
        });
        success('Payment recorded for Supplier');
      }

      setModal({ show: false, type: '', item: null, amount: '', status: 'partial' });
      loadData();
    } catch (err: any) {
      console.error(err);
      showError('Failed to record payment');
    }
  };

  const calculateTotalStats = () => {
    const totalCustomerReceivable = customerDues.reduce((sum, o) => sum + (o.totalAmount - (o.amountPaid || 0)), 0);
    const totalSupplierPayable = supplierDues.reduce((sum, i) => sum + ((i.purchaseCost || 0) - (i.amountPaid || 0)), 0);
    return { totalCustomerReceivable, totalSupplierPayable };
  };

  const stats = calculateTotalStats();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading finance data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {isSuperAdmin && <OwnerSelector systemType="cattleFeed" />}

      <Text style={styles.title}>Finance Management</Text>

      <View style={styles.statsRow}>
        <Card style={styles.receivableCard}>
          <Text style={styles.statsTitle}>Total Receivable (From Customers)</Text>
          <Text style={styles.statsAmount}>₹{stats.totalCustomerReceivable.toFixed(2)}</Text>
          <Text style={styles.statsCount}>{customerDues.length} pending orders</Text>
        </Card>
        <Card style={styles.payableCard}>
          <Text style={styles.statsTitle}>Total Payable (To Suppliers)</Text>
          <Text style={styles.statsAmount}>₹{stats.totalSupplierPayable.toFixed(2)}</Text>
          <Text style={styles.statsCount}>{supplierDues.length} pending bills</Text>
        </Card>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'customer' && styles.activeTab]}
          onPress={() => setActiveTab('customer')}
        >
          <Text style={[styles.tabText, activeTab === 'customer' && styles.activeTabText]}>
            Customer Dues (Receivables)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'supplier' && styles.activeTab]}
          onPress={() => setActiveTab('supplier')}
        >
          <Text style={[styles.tabText, activeTab === 'supplier' && styles.activeTabText]}>
            Supplier Dues (Payables)
          </Text>
        </TouchableOpacity>
      </View>

      <Card>
        {activeTab === 'customer' ? (
          customerDues.length === 0 ? (
            <Text style={styles.emptyText}>No outstanding customer dues.</Text>
          ) : (
            <View style={styles.list}>
              {customerDues.map((order) => {
                const due = order.totalAmount - (order.amountPaid || 0);
                return (
                  <View key={order._id} style={styles.listItem}>
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemName}>
                        {order.customerId?.name || 'Unknown'}
                      </Text>
                      <Text style={styles.listItemDetail}>{order.customerId?.phone}</Text>
                      <Text style={styles.listItemDetail}>Order #{order.orderNumber}</Text>
                      <Text style={styles.listItemDetail}>
                        Date: {new Date(order.createdAt).toLocaleDateString()}
                      </Text>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Total: </Text>
                        <Text style={styles.amountValue}>₹{order.totalAmount}</Text>
                      </View>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Paid: </Text>
                        <Text style={styles.paidAmount}>₹{order.amountPaid || 0}</Text>
                      </View>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Due: </Text>
                        <Text style={styles.dueAmount}>₹{due}</Text>
                      </View>
                      <View style={[styles.statusBadge, order.paymentStatus === 'paid' ? styles.paidBadge : 
                        order.paymentStatus === 'partial' ? styles.partialBadge : styles.pendingBadge]}>
                        <Text style={styles.statusText}>{order.paymentStatus || 'pending'}</Text>
                      </View>
                    </View>
                    <Button
                      variant="primary"
                      onPress={() => handleOpenPayment('customer', order)}
                      style={styles.payButton}
                    >
                      Record Pay
                    </Button>
                  </View>
                );
              })}
            </View>
          )
        ) : (
          supplierDues.length === 0 ? (
            <Text style={styles.emptyText}>No outstanding supplier dues.</Text>
          ) : (
            <View style={styles.list}>
              {supplierDues.map((item) => {
                const due = (Number(item.purchaseCost) || 0) - (Number(item.amountPaid) || 0);
                return (
                  <View key={item._id || item.id} style={styles.listItem}>
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemName}>{item.supplier || 'N/A'}</Text>
                      <Text style={styles.listItemDetail}>{item.name}</Text>
                      <Text style={styles.listItemDetail}>
                        {item.quantity} {item.unit}
                      </Text>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Cost: </Text>
                        <Text style={styles.amountValue}>₹{Number(item.purchaseCost || 0)}</Text>
                      </View>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Paid: </Text>
                        <Text style={styles.paidAmount}>₹{Number(item.amountPaid || 0)}</Text>
                      </View>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Due: </Text>
                        <Text style={styles.dueAmount}>₹{due}</Text>
                      </View>
                      <View style={[styles.statusBadge, item.paymentStatus === 'paid' ? styles.paidBadge : 
                        item.paymentStatus === 'partial' ? styles.partialBadge : styles.pendingBadge]}>
                        <Text style={styles.statusText}>{item.paymentStatus || 'pending'}</Text>
                      </View>
                    </View>
                    <Button
                      variant="primary"
                      onPress={() => handleOpenPayment('supplier', item)}
                      style={styles.payButton}
                    >
                      Pay Supplier
                    </Button>
                  </View>
                );
              })}
            </View>
          )
        )}
      </Card>

      <Modal
        visible={modal.show}
        onClose={() => setModal({ show: false, type: '', item: null, amount: '', status: 'partial' })}
        title={`Record Payment for ${modal.type === 'customer' ? 'Customer' : 'Supplier'}`}
      >
        <View style={styles.modalContent}>
          <View style={styles.paymentInfoBox}>
            <View style={styles.paymentInfoRow}>
              <Text style={styles.paymentInfoLabel}>Total Amount:</Text>
              <Text style={styles.paymentInfoValue}>
                ₹{modal.type === 'customer'
                  ? modal.item?.totalAmount
                  : modal.item?.purchaseCost || 0}
              </Text>
            </View>
            <View style={styles.paymentInfoRow}>
              <Text style={styles.paymentInfoLabel}>Already Paid:</Text>
              <Text style={[styles.paymentInfoValue, styles.paidAmount]}>
                ₹{modal.item?.amountPaid || 0}
              </Text>
            </View>
            <View style={[styles.paymentInfoRow, styles.balanceRow]}>
              <Text style={styles.paymentInfoLabel}>Balance Due:</Text>
              <Text style={[styles.paymentInfoValue, styles.dueAmount]}>
                ₹{modal.type === 'customer'
                  ? (modal.item?.totalAmount - (modal.item?.amountPaid || 0))
                  : ((modal.item?.purchaseCost || 0) - (modal.item?.amountPaid || 0))}
              </Text>
            </View>
          </View>

          <Input
            label="Payment Amount (₹)"
            value={modal.amount}
            onChangeText={(value) => setModal(prev => ({ ...prev, amount: value }))}
            keyboardType="decimal-pad"
            required
          />

          <Select
            label="New Payment Status"
            value={modal.status}
            onChange={(value) => setModal(prev => ({ ...prev, status: value as string }))}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'partial', label: 'Partial' },
              { value: 'paid', label: 'Paid' },
            ]}
          />

          <View style={styles.modalButtons}>
            <Button
              variant="secondary"
              onPress={() => setModal({ show: false, type: '', item: null, amount: '', status: 'partial' })}
            >
              Cancel
            </Button>
            <Button variant="primary" onPress={handlePaymentSubmit}>
              Save Payment
            </Button>
          </View>
        </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  receivableCard: {
    flex: 1,
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  payableCard: {
    flex: 1,
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 8,
  },
  statsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 4,
  },
  statsCount: {
    fontSize: 12,
    color: '#047857',
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
    fontSize: 14,
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
  amountRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  paidAmount: {
    color: '#059669',
  },
  dueAmount: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
  },
  paidBadge: {
    backgroundColor: '#d1fae5',
  },
  partialBadge: {
    backgroundColor: '#fef3c7',
  },
  pendingBadge: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  payButton: {
    marginTop: 8,
  },
  modalContent: {
    gap: 16,
  },
  paymentInfoBox: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 4,
  },
  paymentInfoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  paymentInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});

export default FinanceManagement;
