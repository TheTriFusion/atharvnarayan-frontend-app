import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
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

const CattleFeedOwnerDashboard: React.FC = () => {
  const { isSuperAdmin, user, logout } = useAuth();
  const { selectedOwnerId } = useOwner();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
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
    loadStats();
  }, [selectedOwnerId]);

  const loadStats = async () => {
    if (isLoadingRef.current) return;
    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError('');

      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      const [inventory, sales, pendingOrdersData] = await Promise.all([
        getCattleFeedInventory(ownerId),
        getCattleFeedSales(ownerId),
        getCattleFeedOrders({ ownerId, status: 'pending' }),
      ]);

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

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setShowMenu(false),
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              setShowMenu(false);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout failed:', error);
              Alert.alert('Error', 'Failed to log out');
            }
          },
        },
      ]
    );
  };

  if (loading && stats.totalInventoryItems === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error && stats.totalInventoryItems === 0) {
    return (
      <View style={styles.errorContainer}>
        <Card>
          <Text style={styles.errorText}>{error}</Text>
          <Button onPress={loadStats} style={styles.retryButton}>
            Retry
          </Button>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <View style={styles.headerRight}>
            {loading && (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.loadingLabel}>Loading...</Text>
              </View>
            )}
            {!loading && (
              <Button onPress={loadStats} variant="secondary" style={styles.refreshButton}>
                🔄 Refresh
              </Button>
            )}
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => setShowMenu(!showMenu)}
            >
              <Text style={styles.profileIcon} allowFontScaling={false}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showMenu && (
          <View style={styles.menuDropdown}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); /* Navigate to Profile */ }}>
              <Text style={styles.menuText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); /* Navigate to Settings */ }}>
              <Text style={styles.menuText}>Settings</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Text style={[styles.menuText, styles.logoutText]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#2563eb' }]}>
            {stats.totalInventoryItems}
          </Text>
          <Text style={styles.statLabel}>Total Inventory Items</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>
            ₹{stats.totalStockValue.toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Total Stock Value</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#dc2626' }]}>
            {stats.lowStockItems}
          </Text>
          <Text style={styles.statLabel}>Low Stock Items</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#9333ea' }]}>
            {stats.pendingOrders}
          </Text>
          <Text style={styles.statLabel}>Pending Orders</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#6366f1' }]}>
            {stats.totalSales}
          </Text>
          <Text style={styles.statLabel}>Total Sales</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#14b8a6' }]}>
            ₹{stats.totalRevenue.toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </Card>
      </View>

      {/* Sales Breakdown */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Sales Breakdown</Text>
        <View style={styles.breakdownGrid}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Wholesale</Text>
            <Text style={styles.breakdownValue}>{stats.wholesaleSales} sales</Text>
            <Text style={styles.breakdownRevenue}>₹{stats.wholesaleRevenue.toFixed(2)}</Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Retail</Text>
            <Text style={styles.breakdownValue}>{stats.retailSales} sales</Text>
            <Text style={styles.breakdownRevenue}>₹{stats.retailRevenue.toFixed(2)}</Text>
          </View>
        </View>
      </Card>

      {/* Recent Sales */}
      {recentSales.length > 0 && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Sales</Text>
          {recentSales.map((sale: any) => (
            <View key={sale._id || sale.id} style={styles.saleItem}>
              <View style={styles.saleInfo}>
                <Text style={styles.saleDate}>
                  {new Date(sale.date || sale.createdAt).toLocaleDateString()}
                </Text>
                <Text style={styles.saleAmount}>₹{sale.totalAmount || 0}</Text>
              </View>
              <Text style={styles.saleType}>{sale.saleType || 'N/A'}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Low Stock Items */}
      {lowStockItems.length > 0 && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Low Stock Items</Text>
          {lowStockItems.map((item: any) => (
            <View key={item._id || item.id} style={styles.stockItem}>
              <Text style={styles.stockItemName}>{item.productName || item.name}</Text>
              <Text style={styles.stockItemQuantity}>
                {item.quantity} {item.unit || 'units'}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f3f4f6',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
  },
  headerContainer: {
    zIndex: 10,
    backgroundColor: '#ffffff',
    paddingBottom: 8,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  sectionCard: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  breakdownGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  breakdownItem: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  breakdownRevenue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  saleInfo: {
    flex: 1,
  },
  saleDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  saleType: {
    fontSize: 12,
    color: '#9ca3af',
    textTransform: 'capitalize',
  },
  stockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stockItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  stockItemQuantity: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '600',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  profileIcon: {
    fontSize: 22,
  },
  menuDropdown: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 150,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 16,
    color: '#374151',
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
});

export default CattleFeedOwnerDashboard;
