import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Platform, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getMilkTruckPricing, setMilkTruckPricing } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';
import { useToast } from '../../../contexts/ToastContext';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import ScreenHeader from '../../../components/common/ScreenHeader';
import LinearGradient from 'react-native-linear-gradient';

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

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadPricing();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#F59E0B', '#D97706', colors.background.primary]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.8 }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}

        <View style={styles.headerSpacer} />
        <ScreenHeader
          title="Revenue Configuration"
          subtitle="Define Milk Pricing Algorithms"
          transparent
        />

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {loading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator color="#D97706" size="large" />
              <Text style={styles.loadingText}>Calibrating pricing engine...</Text>
            </View>
          ) : (
            <View style={styles.content}>
              <View style={styles.pricingGrid}>
                <View style={styles.pricingCard}>
                  <View style={styles.pricingIconBox}>
                    <Text style={styles.pricingEmoji}>🥛</Text>
                  </View>
                  <Text style={styles.pricingLabel}>Base Price</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.currency}>₹</Text>
                    <Input
                      label=""
                      value={pricing.basePricePerLiter.toString()}
                      onChangeText={(value) => handleInputChange('basePricePerLiter', value)}
                      keyboardType="decimal-pad"
                      containerStyle={styles.nakedInput}
                    />
                  </View>
                  <Text style={styles.perUnit}>per Liter</Text>
                </View>

                <View style={styles.pricingCard}>
                  <View style={[styles.pricingIconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={styles.pricingEmoji}>🧈</Text>
                  </View>
                  <Text style={styles.pricingLabel}>Fat Premium</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.currency}>₹</Text>
                    <Input
                      label=""
                      value={pricing.fatPricePerPercent.toString()}
                      onChangeText={(value) => handleInputChange('fatPricePerPercent', value)}
                      keyboardType="decimal-pad"
                      containerStyle={styles.nakedInput}
                    />
                  </View>
                  <Text style={styles.perUnit}>per Fat %</Text>
                </View>

                <View style={[styles.pricingCard, { width: '100%' }]}>
                  <View style={[styles.pricingIconBox, { backgroundColor: '#E0F2FE' }]}>
                    <Text style={styles.pricingEmoji}>🧬</Text>
                  </View>
                  <Text style={styles.pricingLabel}>SNF Premium</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.currency}>₹</Text>
                    <Input
                      label=""
                      value={pricing.snfPricePerPercent.toString()}
                      onChangeText={(value) => handleInputChange('snfPricePerPercent', value)}
                      keyboardType="decimal-pad"
                      containerStyle={styles.nakedInput}
                    />
                  </View>
                  <Text style={styles.perUnit}>per SNF %</Text>
                </View>
              </View>

              <Button
                variant="primary"
                onPress={handleSubmit}
                style={styles.updateBtn}
              >
                Apply Updated Pricing
              </Button>

              <View style={styles.formulaSection}>
                <LinearGradient
                  colors={['#FFFBEB', '#FEF3C7']}
                  style={styles.formulaGradient}
                >
                  <Text style={styles.formulaTitle}>Pricing Logic Formula</Text>
                  <View style={styles.formulaBox}>
                    <Text style={styles.mainFormula}>
                      Total = (Base × Qty) + (Fat × Fat% × Qty) + (SNF × SNF% × Qty)
                    </Text>
                  </View>
                  <Text style={styles.formulaExplanation}>
                    This logic applies to all collection centers in your network.
                    Changes take effect for future trips immediately.
                  </Text>
                </LinearGradient>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 350,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  headerSpacer: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
  loadingWrapper: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: '#D97706',
    fontWeight: '500',
  },
  content: {
    marginTop: spacing.md,
  },
  pricingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  pricingCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '47.5%',
    alignItems: 'center',
    ...shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.1)',
  },
  pricingIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pricingEmoji: {
    fontSize: 24,
  },
  pricingLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currency: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary[900],
    marginTop: 4,
  },
  nakedInput: {
    minWidth: 60,
  },
  perUnit: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: -8,
  },
  updateBtn: {
    marginTop: spacing.xl,
    backgroundColor: '#D97706',
  },
  formulaSection: {
    marginTop: spacing.xxl,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  formulaGradient: {
    padding: spacing.xl,
  },
  formulaTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: spacing.md,
  },
  formulaBox: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: spacing.md,
  },
  mainFormula: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#B45309',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  formulaExplanation: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
    opacity: 0.8,
  },
});

export default PricingManagement;
