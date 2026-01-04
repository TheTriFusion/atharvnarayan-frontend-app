import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

// Import the actual management components
import CattleFeedOwnerManagement from './CattleFeedOwnerManagement';
import MilkTruckOwnerManagement from './MilkTruckOwnerManagement';
import CattleFeedTruckOwnerManagement from './CattleFeedTruckOwnerManagement';

const OwnerManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cattle-feed' | 'milk-truck' | 'cattle-feed-truck'>('cattle-feed');

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Owner Management</Text>

      <Card style={styles.tabCard}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'cattle-feed' && styles.activeTabButton]}
            onPress={() => setActiveTab('cattle-feed')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'cattle-feed' && styles.activeTabButtonText]}>
              🌾 Cattle Feed Shop Owners
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'milk-truck' && styles.activeTabButton]}
            onPress={() => setActiveTab('milk-truck')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'milk-truck' && styles.activeTabButtonText]}>
              🥛 Milk Truck Owners
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'cattle-feed-truck' && styles.activeTabButton]}
            onPress={() => setActiveTab('cattle-feed-truck')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'cattle-feed-truck' && styles.activeTabButtonText]}>
              🚚 Cattle Feed Truck Owners
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      <View style={styles.content}>
        {activeTab === 'cattle-feed' && <CattleFeedOwnerManagement />}
        {activeTab === 'milk-truck' && <MilkTruckOwnerManagement />}
        {activeTab === 'cattle-feed-truck' && <CattleFeedTruckOwnerManagement />}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  tabCard: {
    marginBottom: 16,
    padding: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#2563eb',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabButtonText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  content: {
    marginTop: 16,
  },
});

export default OwnerManagement;
