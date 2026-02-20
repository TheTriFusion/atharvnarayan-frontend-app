import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { getCattleFeedOrders, updateCattleFeedOrderStatus, updateCattleFeedOrderPayment } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

const OrderManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const toast = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setProcessingId(orderId);
      await updateCattleFeedOrderStatus(orderId, newStatus, '');
      toast.success(`Order updated to ${newStatus}`);
      loadOrders();
    } catch (err: any) {
      toast.error('Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: string }> = {
      pending: { bg: '#fef3c7', text: '#92400e', icon: '⏳' },
      confirmed: { bg: '#dbeafe', text: '#1e40af', icon: '✅' },
      processing: { bg: '#e9d5ff', text: '#6b21a8', icon: '⚙️' },
      packed: { bg: '#e0e7ff', text: '#3730a3', icon: '📦' },
      shipped: { bg: '#cffafe', text: '#155e75', icon: '🚚' },
      delivered: { bg: '#d1fae5', text: '#065f46', icon: '🏁' },
      cancelled: { bg: '#fee2e2', text: '#991b1b', icon: '❌' },
    };
    return configs[status] || { bg: '#f3f4f6', text: '#374151', icon: '📄' };
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
        toast.error('Invalid amount');
        return;
      }

      const newTotalPaid = paymentModal.currentPaid + amount;
      await updateCattleFeedOrderPayment(paymentModal.orderId!, {
        amountPaid: newTotalPaid,
      });

      toast.success('Payment recorded');
      setPaymentModal({ show: false, orderId: null, currentPaid: 0, total: 0 });
      loadOrders();
    } catch (err: any) {
      toast.error('Failed to record payment');
    }
  };

  const statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Processing', value: 'processing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Orders"
        subtitle="Track & manage customer orders"
        showBackButton
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[500]]} />
        }
      >
        <View style={styles.content}>
          {isSuperAdmin && <OwnerSelector systemType="cattleFeed" />}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            <View style={styles.chipsContainer}>
              {statusOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, filter === opt.value && styles.activeChip]}
                  onPress={() => setFilter(opt.value)}
                >
                  <Text style={[styles.chipText, filter === opt.value && styles.activeChipText]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={colors.primary[500]} style={styles.loader} />
          ) : (
            <View style={styles.ordersList}>
              {orders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📑</Text>
                  <Text style={styles.emptyText}>No {filter !== 'all' ? filter : ''} orders found.</Text>
                </View>
              ) : (
                orders.map((order) => {
                  const amountPaid = order.amountPaid || 0;
                  const balanceDue = order.totalAmount - amountPaid;
                  const config = getStatusConfig(order.status);

                  return (
                    <Card key={order._id || order.id} style={styles.orderCard}>
                      <View style={styles.orderTop}>
                        <View style={styles.orderInfo}>
                          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                          <Text style={styles.orderDate}>
                            {new Date(order.createdAt).toLocaleDateString(undefined, {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                          <Text style={[styles.statusText, { color: config.text }]}>
                            {config.icon} {order.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.customerRow}>
                        <View style={styles.clientAvatar}>
                          <Text style={styles.clientAvatarText}>
                            {order.customerId?.name?.charAt(0).toUpperCase() || '?'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.clientName}>{order.customerId?.name || 'Customer Deleted'}</Text>
                          <Text style={styles.clientPhone}>📞 {order.customerId?.phone}</Text>
                        </View>
                        <View style={styles.amountBox}>
                          <Text style={styles.amountLabel}>Total</Text>
                          <Text style={styles.amountValue}>₹{order.totalAmount}</Text>
                        </View>
                      </View>

                      {order.deliveryAddress && (
                        <View style={styles.addressBox}>
                          <Text style={styles.addressTitle}>📍 Delivery to</Text>
                          <Text style={styles.addressText}>
                            {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
                          </Text>
                        </View>
                      )}

                      <View style={styles.itemsList}>
                        <Text style={styles.itemsHeader}>ORDER ITEMS ({order.items?.length || 0})</Text>
                        {order.items?.map((item: any, idx: number) => (
                          <View key={idx} style={styles.itemRow}>
                            <Text style={styles.itemName}>{item.productName} ({item.quantity} {item.unit})</Text>
                            <Text style={styles.itemPrice}>₹{item.totalPrice}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.paymentStatusRow}>
                        <View style={styles.paymentLabelBox}>
                          <Text style={styles.paymentInfoLabel}>Payment</Text>
                          <Text style={[styles.paymentStatusText, order.paymentStatus === 'paid' ? { color: colors.success[600] } : { color: colors.warning[600] }]}>
                            {order.paymentStatus?.toUpperCase() || 'PENDING'}
                          </Text>
                        </View>
                        <View style={styles.dueBox}>
                          <Text style={styles.dueLabel}>Due</Text>
                          <Text style={[styles.dueValue, balanceDue > 0 ? { color: colors.error[600] } : { color: colors.success[600] }]}>
                            ₹{balanceDue > 0 ? balanceDue : 0}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.actionsGrid}>
                        {balanceDue > 0 && order.status !== 'cancelled' && (
                          <TouchableOpacity
                            style={[styles.smallBtn, { backgroundColor: colors.primary[50] }]}
                            onPress={() => openPaymentModal(order)}
                          >
                            <Text style={[styles.smallBtnText, { color: colors.primary[700] }]}>Record Pay</Text>
                          </TouchableOpacity>
                        )}

                        {order.status === 'pending' && (
                          <>
                            <TouchableOpacity
                              style={[styles.smallBtn, { backgroundColor: colors.success[50] }]}
                              onPress={() => handleStatusUpdate(order._id || order.id, 'confirmed')}
                            >
                              <Text style={[styles.smallBtnText, { color: colors.success[700] }]}>Confirm</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.smallBtn, { backgroundColor: colors.error[50] }]}
                              onPress={() => handleStatusUpdate(order._id || order.id, 'cancelled')}
                            >
                              <Text style={[styles.smallBtnText, { color: colors.error[700] }]}>Cancel</Text>
                            </TouchableOpacity>
                          </>
                        )}
                        {order.status === 'confirmed' && (
                          <TouchableOpacity
                            style={[styles.smallBtn, { backgroundColor: colors.primary[600] }]}
                            onPress={() => handleStatusUpdate(order._id || order.id, 'processing')}
                          >
                            <Text style={[styles.smallBtnText, { color: 'white' }]}>Process</Text>
                          </TouchableOpacity>
                        )}
                        {order.status === 'processing' && (
                          <TouchableOpacity
                            style={[styles.smallBtn, { backgroundColor: colors.primary[600] }]}
                            onPress={() => handleStatusUpdate(order._id || order.id, 'shipped')}
                          >
                            <Text style={[styles.smallBtnText, { color: 'white' }]}>Ship</Text>
                          </TouchableOpacity>
                        )}
                        {order.status === 'shipped' && (
                          <TouchableOpacity
                            style={[styles.smallBtn, { backgroundColor: colors.success[600] }]}
                            onPress={() => handleStatusUpdate(order._id || order.id, 'delivered')}
                          >
                            <Text style={[styles.smallBtnText, { color: 'white' }]}>Deliver</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </Card>
                  );
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={paymentModal.show}
        onClose={() => setPaymentModal({ show: false, orderId: null, currentPaid: 0, total: 0 })}
        title="Record Payment"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalBody}>
            <View style={styles.paymentSummaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Paid</Text>
                <Text style={styles.summaryValue}>₹{paymentModal.currentPaid}</Text>
              </View>
              <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 10, marginTop: 10 }]}>
                <Text style={styles.summaryLabel}>Balance Due</Text>
                <Text style={[styles.summaryValue, { color: colors.error[600], fontWeight: 'bold' }]}>₹{paymentModal.total - paymentModal.currentPaid}</Text>
              </View>
            </View>

            <Input
              label="Payment Received (₹)"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />

            <View style={styles.modalActions}>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setPaymentModal({ show: false, orderId: null, currentPaid: 0, total: 0 })}
              >Cancel</Button>
              <Button
                style={{ flex: 1 }}
                onPress={handlePaymentSubmit}
              >Save</Button>
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
  loader: {
    marginVertical: spacing.xxl,
  },
  chipsScroll: {
    marginBottom: spacing.lg,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeChip: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  chipText: {
    fontSize: 13,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
  },
  activeChipText: {
    color: 'white',
  },
  ordersList: {
    marginBottom: spacing.xxl,
  },
  orderCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  orderDate: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: spacing.md,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  clientAvatarText: {
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  clientName: {
    fontSize: 15,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  clientPhone: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  amountBox: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  addressBox: {
    backgroundColor: '#f8fafc',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  addressTitle: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 12,
    color: colors.text.tertiary,
    lineHeight: 18,
  },
  itemsList: {
    backgroundColor: '#f1f5f9',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  itemsHeader: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.tertiary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 13,
    color: colors.text.secondary,
    flex: 1,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  paymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
    paddingHorizontal: 4,
  },
  paymentLabelBox: {
    gap: 4,
  },
  paymentInfoLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  dueBox: {
    alignItems: 'flex-end',
    gap: 2,
  },
  dueLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  dueValue: {
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  smallBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  smallBtnText: {
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
  modalBody: {
    paddingVertical: spacing.sm,
  },
  paymentSummaryBox: {
    backgroundColor: '#f8fafc',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

export default OrderManagement;
