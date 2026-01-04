import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getMilkTruckPricing, setMilkTruckPricing } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';
import { useToast } from '../../../contexts/ToastContext';

const PricingManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const { success, error: showError } = useToast();
  const [pricing, setPricingState] = useState({
    basePricePerLiter: 0,
    fatPricePerPercent: 0,
    snfPricePerPercent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPricing();
  }, [selectedOwnerId]);

  const loadPricing = async () => {
    try {
      setLoading(true);
      const savedPricing = await getMilkTruckPricing();
      if (savedPricing && typeof savedPricing === 'object') {
        setPricingState({
          basePricePerLiter: savedPricing.basePricePerLiter || 50,
          fatPricePerPercent: savedPricing.fatPricePerPercent || 2,
          snfPricePerPercent: savedPricing.snfPricePerPercent || 1,
        });
      }
    } catch (err: any) {
      console.error('Error loading pricing:', err);
      showError('Failed to load pricing configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setPricingState(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleSubmit = async () => {
    try {
      await setMilkTruckPricing(pricing);
      success('Pricing updated successfully!');
    } catch (err: any) {
      showError('Failed to update pricing: ' + err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading pricing configuration...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}
      
      <Text style={styles.title}>Pricing Management</Text>

      <Card title="Set Pricing Rules">
        <View style={styles.form}>
          <Input
            label="Base Price Per Liter (₹)"
            value={pricing.basePricePerLiter.toString()}
            onChangeText={(value) => handleInputChange('basePricePerLiter', value)}
            disabled={loading}
            required
            keyboardType="decimal-pad"
            placeholder="Enter base price per liter"
          />

          <Input
            label="Fat Price Per Percent (₹)"
            value={pricing.fatPricePerPercent.toString()}
            onChangeText={(value) => handleInputChange('fatPricePerPercent', value)}
            disabled={loading}
            required
            keyboardType="decimal-pad"
            placeholder="Enter price per fat percent"
          />

          <Input
            label="SNF Price Per Percent (₹)"
            value={pricing.snfPricePerPercent.toString()}
            onChangeText={(value) => handleInputChange('snfPricePerPercent', value)}
            disabled={loading}
            required
            keyboardType="decimal-pad"
            placeholder="Enter price per SNF percent"
          />

          <Button variant="primary" onPress={handleSubmit} disabled={loading}>
            Update Pricing
          </Button>
        </View>
      </Card>

      <Card title="Pricing Calculation Formula" style={styles.formulaCard}>
        <View style={styles.formulaContent}>
          <Text style={styles.formulaText}><Text style={styles.formulaBold}>Total Price =</Text></Text>
          <Text style={styles.formulaDetail}>
            (Base Price × Total Liters) + (Fat Price × Fat% × Total Liters) + (SNF Price × SNF% × Total Liters)
          </Text>
          <Text style={styles.formulaNote}>
            This formula will be used to calculate payments for completed trips.
          </Text>
        </View>
      </Card>
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
  form: {
    gap: 16,
  },
  formulaCard: {
    marginTop: 16,
  },
  formulaContent: {
    gap: 8,
  },
  formulaText: {
    fontSize: 16,
    color: '#374151',
  },
  formulaBold: {
    fontWeight: '600',
  },
  formulaDetail: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 16,
    marginTop: 4,
  },
  formulaNote: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
});

export default PricingManagement;
