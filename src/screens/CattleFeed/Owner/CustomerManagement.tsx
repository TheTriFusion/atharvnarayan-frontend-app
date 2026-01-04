import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getCattleFeedCustomers, getCattleFeedCustomerPurchases, getCattleFeedSales } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';

const CustomerManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const { error: showError } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      showError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
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
      showError(err.message || 'Failed to load customer purchases');
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {isSuperAdmin && <OwnerSelector systemType="cattleFeed" />}
      
      <View style={styles.header}>
        <Text style={styles.title}>Customer Management</Text>
      </View>

      <Card>
        <Input
          label="Search Customers"
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search by name, phone, or email..."
        />
      </Card>

      <Card title={`Customers (${filteredCustomers.length})`}>
        {filteredCustomers.length === 0 ? (
          <Text style={styles.emptyText}>No customers found</Text>
        ) : (
          <View style={styles.list}>
            {filteredCustomers.map((customer) => (
              <View key={customer._id || customer.id} style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemName}>{customer.name}</Text>
                  <Text style={styles.listItemDetail}>📞 {customer.phone}</Text>
                  {customer.email && <Text style={styles.listItemDetail}>📧 {customer.email}</Text>}
                  <Text style={styles.listItemDetail}>
                    🛒 Total Purchases: {customer.totalPurchases || 0}
                  </Text>
                  <Text style={styles.listItemDetail}>
                    💰 Total Amount: ₹{customer.totalAmount?.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={styles.listItemDetail}>
                    📅 Last Purchase: {customer.lastPurchaseDate 
                      ? new Date(customer.lastPurchaseDate).toLocaleDateString()
                      : '-'}
                  </Text>
                </View>
                <Button
                  variant="primary"
                  onPress={() => handleViewPurchases(customer)}
                  style={styles.viewButton}
                >
                  View Purchases
                </Button>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Modal
        visible={showPurchaseModal}
        onClose={() => {
          setShowPurchaseModal(false);
          setSelectedCustomer(null);
        }}
        title={`Purchase History - ${selectedCustomer?.name || ''}`}
      >
        <ScrollView style={styles.modalContent}>
          {customerPurchases.length === 0 ? (
            <Text style={styles.emptyText}>No purchases found for this customer</Text>
          ) : (
            <View style={styles.purchasesList}>
              {customerPurchases.map((purchase: any) => (
                <View key={purchase._id || purchase.id} style={styles.purchaseItem}>
                  <View style={styles.purchaseHeader}>
                    <Text style={styles.purchaseDate}>
                      {new Date(purchase.date || purchase.createdAt).toLocaleDateString()}
                    </Text>
                    <View style={[styles.typeBadge, purchase.saleType === 'wholesale' ? styles.wholesaleBadge : styles.retailBadge]}>
                      <Text style={styles.typeBadgeText}>{purchase.saleType}</Text>
                    </View>
                  </View>
                  <Text style={styles.purchaseItems}>
                    {purchase.items?.length || 0} items
                  </Text>
                  <Text style={styles.purchaseAmount}>
                    ₹{purchase.totalAmount?.toFixed(2) || '0.00'}
                  </Text>
                </View>
              ))}
              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>
                  ₹{customerPurchases.reduce((sum: number, p: any) => sum + (p.totalAmount || 0), 0).toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
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
  viewButton: {
    marginTop: 8,
  },
  modalContent: {
    maxHeight: 500,
  },
  purchasesList: {
    gap: 12,
  },
  purchaseItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  purchaseDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
  purchaseItems: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  purchaseAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
});

export default CustomerManagement;
