import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { getCattleFeedOrders, getCattleFeedInventory, updateCattleFeedOrderPayment, updateCattleFeedInventory } from '../../../utils/storage';
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
import LinearGradient from 'react-native-linear-gradient';

const FinanceManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      toast.error('Failed to load finance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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
        toast.error('Please enter a valid amount');
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
        toast.success('Payment recorded');
      } else {
        const currentPaid = item.amountPaid || 0;
        const newPaid = currentPaid + amount;

        await updateCattleFeedInventory(item._id || item.id, {
          amountPaid: newPaid,
          paymentStatus: status,
        });
        toast.success('Payment recorded');
      }

      setModal({ show: false, type: '', item: null, amount: '', status: 'partial' });
      loadData();
    } catch (err: any) {
      toast.error('Failed to record payment');
    }
  };

  const calculateTotalStats = () => {
    const totalCustomerReceivable = customerDues.reduce((sum, o) => sum + (o.totalAmount - (o.amountPaid || 0)), 0);
    const totalSupplierPayable = supplierDues.reduce((sum, i) => sum + ((i.purchaseCost || 0) - (i.amountPaid || 0)), 0);
    return { totalCustomerReceivable, totalSupplierPayable };
  };

  const stats = calculateTotalStats();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Finance"
        subtitle="Outstanding dues & payments"
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

          {/* Quick Stats Summary */}
          <View style={styles.statsRow}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={[styles.statCard, shadows.md]}
            >
              <Text style={styles.statLabel}>Receivable</Text>
              <Text style={styles.statAmount}>₹{stats.totalCustomerReceivable.toLocaleString()}</Text>
              <View style={styles.statBadge}>
                <Text style={styles.badgeText}>{customerDues.length} Customers</Text>
              </View>
            </LinearGradient>

            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={[styles.statCard, shadows.md]}
            >
              <Text style={styles.statLabel}>Payable</Text>
              <Text style={styles.statAmount}>₹{stats.totalSupplierPayable.toLocaleString()}</Text>
              <View style={styles.statBadge}>
                <Text style={styles.badgeText}>{supplierDues.length} Suppliers</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'customer' && styles.activeTab]}
              onPress={() => setActiveTab('customer')}
            >
              <Text style={[styles.tabText, activeTab === 'customer' && styles.activeTabText]}>Customers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'supplier' && styles.activeTab]}
              onPress={() => setActiveTab('supplier')}
            >
              <Text style={[styles.tabText, activeTab === 'supplier' && styles.activeTabText]}>Suppliers</Text>
            </TouchableOpacity>
          </View>

          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={colors.primary[500]} style={styles.loader} />
          ) : (
            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>
                  {activeTab === 'customer' ? 'Customer Receivables' : 'Supplier Payables'}
                </Text>
              </View>

              {(activeTab === 'customer' ? customerDues : supplierDues).length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>🎉</Text>
                  <Text style={styles.emptyText}>No pending {activeTab} dues found.</Text>
                </View>
              ) : (
                (activeTab === 'customer' ? customerDues : supplierDues).map((item) => {
                  const due = activeTab === 'customer'
                    ? (item.totalAmount - (item.amountPaid || 0))
                    : ((item.purchaseCost || 0) - (item.amountPaid || 0));

                  return (
                    <Card key={item._id || item.id} style={styles.dueCard}>
                      <View style={styles.dueTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dueName}>
                            {activeTab === 'customer' ? (item.customerId?.name || 'Unknown') : (item.supplier || 'N/A')}
                          </Text>
                          <Text style={styles.dueSubtext}>
                            {activeTab === 'customer' ? `Order #${item.orderNumber}` : item.name}
                          </Text>
                        </View>
                        <View style={styles.badgeContainer}>
                          <View style={[styles.statusBadge,
                          item.paymentStatus === 'partial' ? { backgroundColor: '#fef3c7' } : { backgroundColor: '#fee2e2' }
                          ]}>
                            <Text style={[styles.statusText,
                            item.paymentStatus === 'partial' ? { color: '#92400e' } : { color: '#991b1b' }
                            ]}>{item.paymentStatus || 'pending'}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.amountBreakdown}>
                        <View style={styles.amountItem}>
                          <Text style={styles.amountLabelSmall}>Total</Text>
                          <Text style={styles.amountValueSmall}>₹{activeTab === 'customer' ? item.totalAmount : item.purchaseCost}</Text>
                        </View>
                        <View style={styles.amountItem}>
                          <Text style={styles.amountLabelSmall}>Paid</Text>
                          <Text style={[styles.amountValueSmall, { color: colors.success[600] }]}>₹{item.amountPaid || 0}</Text>
                        </View>
                        <View style={styles.amountItem}>
                          <Text style={styles.amountLabelSmall}>Balance</Text>
                          <Text style={[styles.amountValueSmall, { color: colors.error[600], fontWeight: 'bold' }]}>₹{due}</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() => handleOpenPayment(activeTab, item)}
                      >
                        <Text style={styles.payBtnText}>Record Payment</Text>
                      </TouchableOpacity>
                    </Card>
                  );
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modal.show}
        onClose={() => setModal({ show: false, type: '', item: null, amount: '', status: 'partial' })}
        title={`Payment: ${modal.type === 'customer' ? (modal.item?.customerId?.name || 'Customer') : (modal.item?.supplier || 'Supplier')}`}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalBody}>
            <View style={styles.paymentSummaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Balance Due</Text>
                <Text style={styles.summaryValueBig}>₹{
                  modal.type === 'customer'
                    ? (modal.item?.totalAmount - (modal.item?.amountPaid || 0))
                    : ((modal.item?.purchaseCost || 0) - (modal.item?.amountPaid || 0))
                }</Text>
              </View>
            </View>

            <Input
              label="Payment Amount *"
              value={modal.amount}
              onChangeText={(v) => setModal(prev => ({ ...prev, amount: v }))}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />

            <Select
              label="Updated Status"
              value={modal.status}
              onChange={(v) => setModal(prev => ({ ...prev, status: v as string }))}
              options={[
                { value: 'partial', label: 'Partial Payment' },
                { value: 'paid', label: 'Fully Paid' },
                { value: 'pending', label: 'Pending' },
              ]}
            />

            <View style={styles.modalActions}>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setModal({ show: false, type: '', item: null, amount: '', status: 'partial' })}
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statAmount: {
    color: 'white',
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 8,
  },
  statBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
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
  listContainer: {
    marginBottom: spacing.xxl,
  },
  listHeader: {
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  dueCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  dueTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dueName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  dueSubtext: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  badgeContainer: {
    marginLeft: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: spacing.md,
  },
  amountBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    backgroundColor: '#f8fafc',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  amountItem: {
    alignItems: 'center',
  },
  amountLabelSmall: {
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  amountValueSmall: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  payBtn: {
    backgroundColor: colors.primary[50],
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  payBtnText: {
    color: colors.primary[700],
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
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  summaryValueBig: {
    fontSize: 28,
    fontWeight: typography.fontWeight.bold,
    color: colors.error[600],
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

export default FinanceManagement;
