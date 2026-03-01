import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import {
  getCattleFeedInventory,
  getCattleFeedSales,
  getCattleFeedOrders,
} from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import LinearGradient from 'react-native-linear-gradient';

const QUICK_ACTIONS = [
  { id: 'sales', title: 'New Sale', icon: '💰', route: 'CattleFeedOwnerSales', color: ['#10b981', '#059669'], sub: 'Record sale' },
  { id: 'inventory', title: 'Inventory', icon: '📦', route: 'CattleFeedOwnerInventory', color: ['#3b82f6', '#2563eb'], sub: 'Stock count' },
  { id: 'orders', title: 'Orders', icon: '📑', route: 'CattleFeedOwnerOrders', color: ['#f59e0b', '#d97706'], sub: 'Manage orders' },
  { id: 'finance', title: 'Finance', icon: '📊', route: 'CattleFeedOwnerFinance', color: ['#8b5cf6', '#7c3aed'], sub: 'Cash flow' },
];

const CattleFeedOwnerDashboard: React.FC = () => {
  const { isSuperAdmin, user } = useAuth();
  const { selectedOwnerId } = useOwner();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalInventoryItems: 0,
    totalStockValue: 0,
    lowStockItems: 0,
    pendingOrders: 0,
    totalSales: 0,
    wholesaleSales: 0,
    retailSales: 0,
    totalRevenue: 0,
    wholesaleRevenue: 0,
    retailRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadStats().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedOwnerId]);

  const loadStats = async () => {
    if (isLoadingRef.current) return;
    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError('');

      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      const [inventoryRaw, salesRaw, pendingOrdersRaw] = await Promise.all([
        getCattleFeedInventory(ownerId),
        getCattleFeedSales(ownerId),
        getCattleFeedOrders({ ownerId, status: 'pending' }),
      ]);
      const inventory = Array.isArray(inventoryRaw) ? inventoryRaw : [];
      const sales = Array.isArray(salesRaw) ? salesRaw : [];
      const pendingOrdersData = Array.isArray(pendingOrdersRaw) ? pendingOrdersRaw : [];

      const totalItems = inventory.length;
      const stockValue = inventory.reduce((sum: number, item: any) => sum + (item.quantity * item.retailPrice), 0);
      const lowStock = inventory.filter((item: any) => item.quantity < 50).length;

      const totalSalesCount = sales.length;
      const wholesaleSales = sales.filter((s: any) => s.saleType === 'wholesale').length;
      const retailSales = sales.filter((s: any) => s.saleType === 'retail').length;
      const totalRevenue = sales.reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0);
      const wholesaleRevenue = sales
        .filter((s: any) => s.saleType === 'wholesale')
        .reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0);
      const retailRevenue = sales
        .filter((s: any) => s.saleType === 'retail')
        .reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0);

      setStats({
        totalInventoryItems: totalItems,
        totalStockValue: stockValue,
        lowStockItems: lowStock,
        pendingOrders: pendingOrdersData.length,
        totalSales: totalSalesCount,
        wholesaleSales,
        retailSales,
        totalRevenue,
        wholesaleRevenue,
        retailRevenue,
      });

      setRecentSales(
        sales
          .sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
          .slice(0, 5)
      );
      setLowStockItems(
        inventory
          .filter((item: any) => item.quantity < 50)
          .sort((a: any, b: any) => a.quantity - b.quantity)
          .slice(0, 5)
      );
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load dashboard data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  if (loading && stats.totalInventoryItems === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Dashboard"
        subtitle={isSuperAdmin ? "Cattle Feed Management" : user?.businessName || "Cattle Feed Shop"}
        rightAction={
          <TouchableOpacity onPress={loadStats} style={styles.headerAction}>
            <Text style={styles.headerActionIcon}>🔄</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary[500]]} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || "Partner"} 👋</Text>
        </View>

        {/* Global Summary */}
        <View style={styles.summaryContainer}>
          <LinearGradient
            colors={['#1e40af', '#1e3a8a']}
            style={styles.mainRevenueCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.revenueHeader}>
              <Text style={styles.revenueTitle}>Total Revenue</Text>
              <View style={styles.revenueIconContainer}>
                <Text style={styles.revenueIcon}>₹</Text>
              </View>
            </View>
            <Text style={styles.revenueValue}>₹{stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
            <View style={styles.revenueStats}>
              <View style={styles.revenueStatItem}>
                <Text style={styles.revenueStatLabel}>Wholesale</Text>
                <Text style={styles.revenueStatValue}>₹{stats.wholesaleRevenue.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.revenueStatDivider} />
              <View style={styles.revenueStatItem}>
                <Text style={styles.revenueStatLabel}>Retail</Text>
                <Text style={styles.revenueStatValue}>₹{stats.retailRevenue.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statRow}>
            <Card style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: colors.primary[50] }]}>
                <Text style={styles.statEmoji}>📦</Text>
              </View>
              <Text style={styles.statNum}>{stats.totalInventoryItems}</Text>
              <Text style={styles.statDesc}>Prod. Items</Text>
            </Card>
            <Card style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: colors.success[50] }]}>
                <Text style={styles.statEmoji}>💰</Text>
              </View>
              <Text style={styles.statNum}>{stats.totalSales}</Text>
              <Text style={styles.statDesc}>Sales Made</Text>
            </Card>
          </View>
          <View style={styles.statRow}>
            <Card style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: colors.warning[50] }]}>
                <Text style={styles.statEmoji}>⏳</Text>
              </View>
              <Text style={styles.statNum}>{stats.pendingOrders}</Text>
              <Text style={styles.statDesc}>Pending Ord.</Text>
            </Card>
            <Card style={[styles.statCard, stats.lowStockItems > 0 && styles.alertCard]}>
              <View style={[styles.statIconBox, { backgroundColor: stats.lowStockItems > 0 ? colors.error[50] : colors.secondary[100] }]}>
                <Text style={styles.statEmoji}>⚠️</Text>
              </View>
              <Text style={[styles.statNum, stats.lowStockItems > 0 && { color: colors.error[600] }]}>{stats.lowStockItems}</Text>
              <Text style={styles.statDesc}>Low Stock</Text>
            </Card>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionItem}
              onPress={() => navigation.navigate(action.route)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={action.color}
                style={styles.actionIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.actionEmoji}>{action.icon}</Text>
              </LinearGradient>
              <Text style={styles.actionText}>{action.title}</Text>
              <Text style={styles.actionSubText}>{action.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Explore More Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore More</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moreScroll}>
          <TouchableOpacity
            style={styles.moreItem}
            onPress={() => navigation.navigate('CattleFeedOwnerCustomers')}
          >
            <Text style={styles.moreEmoji}>👥</Text>
            <Text style={styles.moreText}>Customers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.moreItem}
            onPress={() => navigation.navigate('SupplierManagement')}
          >
            <Text style={styles.moreEmoji}>🚛</Text>
            <Text style={styles.moreText}>Suppliers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.moreItem}
            onPress={() => navigation.navigate('CattleFeedOwnerSellers')}
          >
            <Text style={styles.moreEmoji}>🏪</Text>
            <Text style={styles.moreText}>Sellers</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Recent Activity */}
        {recentSales.length > 0 && (
          <Card style={styles.activityCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Recent Sales</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CattleFeedOwnerSales')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {recentSales.map((sale, index) => (
              <View key={sale._id || sale.id || index} style={[styles.listRow, index === recentSales.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.listIconContainer}>
                  <Text style={styles.listIcon}>🧾</Text>
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listMainText}>₹{sale.totalAmount?.toLocaleString('en-IN') || 0}</Text>
                  <Text style={styles.listSubText}>
                    {new Date(sale.date || sale.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • {sale.saleType || 'Retail'}
                  </Text>
                </View>
                <Text style={styles.statusBadge}>Success</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <Card style={styles.activityCard}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.error[600] }]}>Low Stock Alerts</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CattleFeedOwnerInventory')}>
                <Text style={styles.viewAllText}>Manage</Text>
              </TouchableOpacity>
            </View>
            {lowStockItems.map((item, index) => (
              <View key={item._id || item.id || index} style={[styles.listRow, index === lowStockItems.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[styles.listIconContainer, { backgroundColor: colors.error[50] }]}>
                  <Text style={styles.listIcon}>📦</Text>
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listMainText}>{item.productName || item.name}</Text>
                  <Text style={[styles.listSubText, { color: colors.error[500] }]}>
                    Only {item.quantity} {item.unit || 'units'} left
                  </Text>
                </View>
                <TouchableOpacity style={styles.reorderBtn}>
                  <Text style={styles.reorderText}>Add</Text>
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        )}

        <View style={styles.footerSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  headerAction: {
    padding: spacing.sm,
  },
  headerActionIcon: {
    fontSize: 18,
  },
  welcomeSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  welcomeText: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.medium,
  },
  userName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: 2,
  },
  summaryContainer: {
    padding: spacing.lg,
  },
  mainRevenueCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.lg,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  revenueIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  revenueIcon: {
    color: 'white',
    fontWeight: 'bold',
  },
  revenueValue: {
    color: 'white',
    fontSize: 36,
    fontWeight: typography.fontWeight.black,
    marginVertical: spacing.md,
  },
  revenueStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  revenueStatItem: {
    flex: 1,
  },
  revenueStatLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  revenueStatValue: {
    color: 'white',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    marginTop: 2,
  },
  revenueStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: spacing.md,
  },
  statsGrid: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    marginVertical: 0,
    alignItems: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  alertCard: {
    borderColor: colors.error[100],
    backgroundColor: colors.error[50],
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statEmoji: {
    fontSize: 20,
  },
  statNum: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  statDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
    fontWeight: typography.fontWeight.medium,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  actionItem: {
    width: '25%',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: spacing.md,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.md,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionText: {
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  actionSubText: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  moreScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  moreItem: {
    backgroundColor: 'white',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...shadows.sm,
  },
  moreEmoji: {
    fontSize: 18,
  },
  moreText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  activityCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  viewAllText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.bold,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  listIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  listIcon: {
    fontSize: 18,
  },
  listContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  listMainText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  listSubText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.success[600],
    backgroundColor: colors.success[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  reorderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary[600],
    borderRadius: 8,
  },
  reorderText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footerSpacer: {
    height: spacing.xl,
  },
});

export default CattleFeedOwnerDashboard;
