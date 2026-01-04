import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Button from './Button';

interface ReceiptProps {
  sale: any;
  companyName?: string;
  onClose?: () => void;
  onPrint?: () => void;
}

const Receipt: React.FC<ReceiptProps> = ({ sale, companyName, onClose, onPrint }) => {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      // In React Native, printing would require a library like react-native-print
      console.log('Print functionality - implement with react-native-print if needed');
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{companyName || 'Retail Shop'}</Text>
          <Text style={styles.receiptTitle}>Sales Receipt</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Receipt No:</Text>
            <Text style={styles.infoValue}>{sale._id || sale.id || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>
              {formatDate(sale.date || sale.createdAt || new Date())}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Details:</Text>
          <View style={styles.customerInfo}>
            <Text style={styles.customerText}>
              <Text style={styles.customerLabel}>Name: </Text>
              <Text style={styles.customerValue}>{sale.customerName}</Text>
            </Text>
            {sale.customerPhone && (
              <Text style={styles.customerText}>
                <Text style={styles.customerLabel}>Phone: </Text>
                <Text style={styles.customerValue}>{sale.customerPhone}</Text>
              </Text>
            )}
          </View>
        </View>

        <View style={styles.saleTypeBadge}>
          <Text
            style={[
              styles.saleTypeText,
              sale.saleType === 'wholesale' ? styles.wholesaleBadge : styles.retailBadge,
            ]}
          >
            {sale.saleType?.charAt(0).toUpperCase() + sale.saleType?.slice(1) || 'Sale'} Sale
          </Text>
        </View>

        <View style={styles.itemsSection}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.itemName]}>Item</Text>
            <Text style={[styles.tableHeaderText, styles.itemQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.itemPrice]}>Price</Text>
            <Text style={[styles.tableHeaderText, styles.itemTotal]}>Total</Text>
          </View>
          {sale.items?.map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.itemName]}>{item.itemName}</Text>
              <Text style={[styles.tableCell, styles.itemQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.itemPrice]}>
                ₹{item.unitPrice?.toFixed(2) || '0.00'}
              </Text>
              <Text style={[styles.tableCell, styles.itemTotal]}>
                ₹{item.total?.toFixed(2) || '0.00'}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>
              ₹{sale.totalAmount?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for your business!</Text>
          <Text style={styles.footerText}>For inquiries, please contact us.</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {onPrint && (
          <Button variant="primary" onPress={handlePrint} style={styles.actionButton}>
            Print
          </Button>
        )}
        {onClose && (
          <Button variant="secondary" onPress={onClose} style={styles.actionButton}>
            Close
          </Button>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#d1d5db',
    paddingBottom: 16,
    marginBottom: 16,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  receiptTitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  section: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  customerInfo: {
    gap: 4,
  },
  customerText: {
    fontSize: 14,
  },
  customerLabel: {
    color: '#6b7280',
  },
  customerValue: {
    fontWeight: '600',
    color: '#1f2937',
  },
  saleTypeBadge: {
    marginBottom: 16,
  },
  saleTypeText: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    fontSize: 14,
    fontWeight: '500',
    alignSelf: 'flex-start',
  },
  wholesaleBadge: {
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
  },
  retailBadge: {
    backgroundColor: '#ccfbf1',
    color: '#134e4a',
  },
  itemsSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 16,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
  },
  tableCell: {
    fontSize: 14,
    color: '#1f2937',
  },
  itemName: {
    flex: 2,
  },
  itemQty: {
    flex: 1,
    textAlign: 'center',
  },
  itemPrice: {
    flex: 1,
    textAlign: 'right',
  },
  itemTotal: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '600',
  },
  totalSection: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  totalRow: {
    width: 250,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#9ca3af',
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingTop: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    flex: 1,
  },
});

export default Receipt;

