import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getCattleFeedCustomers, getCattleFeedCustomerPurchases, getCattleFeedSales } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

const CustomerManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const toast = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerPurchases, setCustomerPurchases] = useState<any[]>([]);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedOwnerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      const [allCustomers, allSales] = await Promise.all([
        getCattleFeedCustomers(ownerId),
        getCattleFeedSales(ownerId),
      ]);

      const updatedCustomers = (Array.isArray(allCustomers) ? allCustomers : []).map((customer: any) => {
        const purchases = (Array.isArray(allSales) ? allSales : []).filter((sale: any) => sale.customerPhone === customer.phone);
        const totalPurchases = purchases.length;
        const totalAmount = purchases.reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0);
        const lastPurchase = purchases.length > 0
          ? purchases.sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())[0]
          : null;

        return {
          ...customer,
          totalPurchases,
          totalAmount,
          lastPurchaseDate: lastPurchase?.date || lastPurchase?.createdAt || customer.lastPurchaseDate,
        };
      });

      setCustomers(updatedCustomers);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleViewPurchases = async (customer: any) => {
    try {
      setSelectedCustomer(customer);
      const purchases = await getCattleFeedCustomerPurchases(customer.phone);
      setCustomerPurchases((Array.isArray(purchases) ? purchases : []).sort((a: any, b: any) =>
        new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
      ));
      setShowPurchaseModal(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load customer purchases');
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.phone?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Customers"
        subtitle="Manage client relationships"
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

          <Card style={styles.searchCard}>
            <Input
              label="Search Customers"
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Name, Phone or Email..."
            />
          </Card>

          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={colors.primary[500]} style={styles.loader} />
          ) : (
            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>All Customers</Text>
                <Text style={styles.listCount}>{filteredCustomers.length} Total</Text>
              </View>

              {filteredCustomers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>👥</Text>
                  <Text style={styles.emptyText}>No customers found matching search.</Text>
                </View>
              ) : (
                filteredCustomers.map((customer) => (
                  <Card key={customer._id || customer.id} style={styles.customerCard}>
                    <View style={styles.customerTop}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {customer.name?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.customerInfo}>
                        <Text style={styles.customerName}>{customer.name}</Text>
                        <Text style={styles.customerPhone}>📞 {customer.phone}</Text>
                      </View>
                      <View style={styles.purchaseCount}>
                        <Text style={styles.countNumber}>{customer.totalPurchases || 0}</Text>
                        <Text style={styles.countText}>Purchases</Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total Value</Text>
                        <Text style={styles.statValue}>₹{customer.totalAmount?.toFixed(0)}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Last Transaction</Text>
                        <Text style={styles.statValue}>
                          {customer.lastPurchaseDate
                            ? new Date(customer.lastPurchaseDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                            : '-'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.historyBtn}
                      onPress={() => handleViewPurchases(customer)}
                    >
                      <Text style={styles.historyBtnText}>View History</Text>
                    </TouchableOpacity>
                  </Card>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showPurchaseModal}
        onClose={() => {
          setShowPurchaseModal(false);
          setSelectedCustomer(null);
        }}
        title={`History: ${selectedCustomer?.name || ''}`}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalContent}>
            {customerPurchases.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.emptyText}>No transactions found.</Text>
              </View>
            ) : (
              <View style={styles.purchasesList}>
                {customerPurchases.map((purchase: any) => (
                  <View key={purchase._id || purchase.id} style={styles.purchaseItem}>
                    <View style={styles.purchaseHeader}>
                      <Text style={styles.purchaseDate}>
                        {new Date(purchase.date || purchase.createdAt).toLocaleDateString(undefined, {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </Text>
                      <View style={[styles.typeBadge, purchase.saleType === 'wholesale' ? styles.wholesaleBadge : styles.retailBadge]}>
                        <Text style={styles.typeBadgeText}>{purchase.saleType}</Text>
                      </View>
                    </View>
                    <View style={styles.purchaseFooter}>
                      <Text style={styles.purchaseItemsCount}>
                        📦 {purchase.items?.length || 0} product{(purchase.items?.length || 0) !== 1 ? 's' : ''}
                      </Text>
                      <Text style={styles.purchaseAmount}>
                        ₹{purchase.totalAmount?.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}

                <View style={styles.grandTotalContainer}>
                  <Text style={styles.grandTotalLabel}>Life-time Value</Text>
                  <Text style={styles.grandTotalValue}>
                    ₹{customerPurchases.reduce((sum: number, p: any) => sum + (p.totalAmount || 0), 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
            <Button variant="outline" onPress={() => setShowPurchaseModal(false)} style={{ marginTop: spacing.lg }}>
              Close
            </Button>
          </View>
          <View style={{ height: 40 }} />
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
  searchCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
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
  customerCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  customerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[700],
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  customerPhone: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  purchaseCount: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  countNumber: {
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  countText: {
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  historyBtn: {
    backgroundColor: colors.primary[50],
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  historyBtnText: {
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
    textAlign: 'center',
  },
  modalContent: {
    paddingVertical: spacing.sm,
  },
  modalEmpty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  purchasesList: {
    gap: spacing.md,
  },
  purchaseItem: {
    backgroundColor: '#f8fafc',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  purchaseDate: {
    fontSize: 13,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  wholesaleBadge: {
    backgroundColor: colors.secondary[50],
  },
  retailBadge: {
    backgroundColor: colors.success[50],
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    textTransform: 'capitalize',
  },
  purchaseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  purchaseItemsCount: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  purchaseAmount: {
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  grandTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[800],
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[700],
  },
});

export default CustomerManagement;
