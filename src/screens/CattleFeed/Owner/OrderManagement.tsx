import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { getCattleFeedOrders, updateCattleFeedOrderStatus, updateCattleFeedOrderPayment } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import Select from '../../../components/common/Select';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';

const OrderManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const { success: showSuccess, error: showError } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState({ show: false, orderId: null as string | null, currentPaid: 0, total: 0 });
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    loadOrders();
  }, [selectedOwnerId, filter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      const params: any = {};
      if (ownerId) params.ownerId = ownerId;
      if (filter !== 'all') params.status = filter;

      const data = await getCattleFeedOrders(params);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setProcessingId(orderId);
      await updateCattleFeedOrderStatus(orderId, newStatus, '');
      showSuccess(`Order updated to ${newStatus}`);
      loadOrders();
    } catch (err: any) {
      showError('Failed to update order status');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      pending: { bg: '#fef3c7', text: '#92400e' },
      confirmed: { bg: '#dbeafe', text: '#1e40af' },
      processing: { bg: '#e9d5ff', text: '#6b21a8' },
      packed: { bg: '#e0e7ff', text: '#3730a3' },
      shipped: { bg: '#cffafe', text: '#155e75' },
      delivered: { bg: '#d1fae5', text: '#065f46' },
      cancelled: { bg: '#fee2e2', text: '#991b1b' },
    };
    return colors[status] || { bg: '#f3f4f6', text: '#374151' };
  };

  const openPaymentModal = (order: any) => {
    setPaymentModal({
      show: true,
      orderId: order._id || order.id,
      currentPaid: order.amountPaid || 0,
      total: order.totalAmount,
    });
    setPaymentAmount('');
  };

  const handlePaymentSubmit = async () => {
    try {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount < 0) {
        showError('Please enter a valid amount');
        return;
      }

      const newTotalPaid = paymentModal.currentPaid + amount;
      await updateCattleFeedOrderPayment(paymentModal.orderId!, {
        amountPaid: newTotalPaid,
      });

      showSuccess('Payment recorded successfully');
      setPaymentModal({ show: false, orderId: null, currentPaid: 0, total: 0 });
      loadOrders();
    } catch (err: any) {
      showError('Failed to record payment');
    }
  };

  const filterOptions = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {isSuperAdmin && <OwnerSelector systemType="cattleFeed" />}

      <View style={styles.header}>
        <Text style={styles.title}>Order Management</Text>
        <Button variant="primary" onPress={loadOrders}>
          Refresh
        </Button>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {filterOptions.map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterButton, filter === status && styles.activeFilterButton]}
            onPress={() => setFilter(status)}
          >
            <Text style={[styles.filterText, filter === status && styles.activeFilterText]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {orders.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            No {filter !== 'all' ? filter : ''} orders found
          </Text>
        </Card>
      ) : (
        <View style={styles.ordersList}>
          {orders.map((order) => {
            const amountPaid = order.amountPaid || 0;
            const balanceDue = order.totalAmount - amountPaid;
            const statusColor = getStatusColor(order.status);

            return (
              <Card key={order._id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(order.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                    <Text style={[styles.statusText, { color: statusColor.text }]}>
                      {order.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Customer Details</Text>
                    {order.customerId ? (
                      <View style={styles.customerInfo}>
                        <Text style={styles.customerName}>{order.customerId.name}</Text>
                        <Text style={styles.customerDetail}>{order.customerId.phone}</Text>
                        {order.deliveryAddress && (
                          <>
                            <Text style={styles.customerDetail}>{order.deliveryAddress.street}</Text>
                            <Text style={styles.customerDetail}>
                              {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
                            </Text>
                          </>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.errorText}>Customer Deleted</Text>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Order Info</Text>
                    <Text style={styles.orderInfoText}>
                      Total Amount: <Text style={styles.amountText}>₹{order.totalAmount}</Text>
                    </Text>
                    <Text style={styles.orderInfoText}>
                      Payment Method: {order.paymentMethod?.toUpperCase() || 'N/A'}
                    </Text>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentLabel}>
                        Status: <Text style={[styles.paymentStatus, order.paymentStatus === 'paid' && styles.paidStatus]}>
                          {order.paymentStatus?.toUpperCase() || 'PENDING'}
                        </Text>
                      </Text>
                    </View>
                    <View style={styles.paymentDetails}>
                      <Text style={styles.paymentDetailText}>Paid: ₹{amountPaid}</Text>
                      <Text style={[styles.paymentDetailText, balanceDue > 0 && styles.dueAmount]}>
                        Due: ₹{balanceDue > 0 ? balanceDue : 0}
                      </Text>
                    </View>
                    {balanceDue > 0 && order.status !== 'cancelled' && (
                      <Button
                        variant="primary"
                        onPress={() => openPaymentModal(order)}
                        style={styles.paymentButton}
                      >
                        Record Payment
                      </Button>
                    )}
                  </View>
                </View>

                <View style={styles.itemsSection}>
                  <Text style={styles.sectionTitle}>Items</Text>
                  <View style={styles.itemsList}>
                    {order.items?.map((item: any, idx: number) => (
                      <View key={idx} style={styles.itemRow}>
                        <Text style={styles.itemText}>
                          {item.quantity} x {item.productName} ({item.unit})
                        </Text>
                        <Text style={styles.itemPrice}>₹{item.totalPrice}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.actionsSection}>
                  {order.status === 'pending' && (
                    <>
                      <Button
                        variant="primary"
                        onPress={() => handleStatusUpdate(order._id || order.id, 'confirmed')}
                        disabled={processingId === order._id}
                        style={styles.actionButton}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="danger"
                        onPress={() => handleStatusUpdate(order._id || order.id, 'cancelled')}
                        disabled={processingId === order._id}
                        style={styles.actionButton}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  {order.status === 'confirmed' && (
                    <Button
                      variant="primary"
                      onPress={() => handleStatusUpdate(order._id || order.id, 'processing')}
                      disabled={processingId === order._id}
                      style={styles.actionButton}
                    >
                      Process
                    </Button>
                  )}
                  {order.status === 'processing' && (
                    <Button
                      variant="primary"
                      onPress={() => handleStatusUpdate(order._id || order.id, 'shipped')}
                      disabled={processingId === order._id}
                      style={styles.actionButton}
                    >
                      Ship
                    </Button>
                  )}
                  {order.status === 'shipped' && (
                    <Button
                      variant="primary"
                      onPress={() => handleStatusUpdate(order._id || order.id, 'delivered')}
                      disabled={processingId === order._id}
                      style={styles.actionButton}
                    >
                      Mark Delivered
                    </Button>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <Modal
        visible={paymentModal.show}
        onClose={() => setPaymentModal({ show: false, orderId: null, currentPaid: 0, total: 0 })}
        title="Record Payment"
      >
        <View style={styles.paymentModalContent}>
          <View style={styles.paymentInfoBox}>
            <Text style={styles.paymentInfoText}>
              Total Order Amount: <Text style={styles.paymentInfoValue}>₹{paymentModal.total}</Text>
            </Text>
            <Text style={styles.paymentInfoText}>
              Already Paid: <Text style={styles.paymentInfoValue}>₹{paymentModal.currentPaid}</Text>
            </Text>
            <Text style={[styles.paymentInfoText, styles.dueAmount]}>
              Balance Due: ₹{paymentModal.total - paymentModal.currentPaid}
            </Text>
          </View>
          <Input
            label="Amount to Receive (₹)"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="decimal-pad"
            required
          />
          <View style={styles.paymentModalButtons}>
            <Button
              variant="secondary"
              onPress={() => setPaymentModal({ show: false, orderId: null, currentPaid: 0, total: 0 })}
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
  filters: {
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeFilterButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  activeFilterText: {
    color: '#ffffff',
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#6b7280',
  },
  ordersList: {
    gap: 16,
  },
  orderCard: {
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    gap: 16,
    marginBottom: 16,
  },
  detailSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  customerInfo: {
    gap: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  customerDetail: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  orderInfoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  paymentInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  paymentStatus: {
    fontWeight: '500',
    color: '#f97316',
  },
  paidStatus: {
    color: '#059669',
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  paymentDetailText: {
    fontSize: 12,
    color: '#6b7280',
  },
  dueAmount: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  paymentButton: {
    marginTop: 8,
  },
  itemsSection: {
    marginBottom: 16,
  },
  itemsList: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
  paymentModalContent: {
    gap: 16,
  },
  paymentInfoBox: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  paymentInfoText: {
    fontSize: 14,
    color: '#6b7280',
  },
  paymentInfoValue: {
    fontWeight: '600',
    color: '#1f2937',
  },
  paymentModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});

export default OrderManagement;
