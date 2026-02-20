import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Animated, Platform, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { getMilkTruckBMCs, addMilkTruckBMC, updateMilkTruckBMC, deleteMilkTruckBMC, getMilkTruckBMCHistory } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';
import { useToast } from '../../../contexts/ToastContext';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import ScreenHeader from '../../../components/common/ScreenHeader';
import LinearGradient from 'react-native-linear-gradient';

const BMCManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const route = useRoute<any>();
  const { success, error: showError } = useToast();
  const [bmcs, setBMCs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBMC, setEditingBMC] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    contact: '',
  });
  const [loading, setLoading] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // View Control
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');
  const [analyticsData, setAnalyticsData] = useState<{
    bmc: any;
    data: any;
    loading: boolean;
  }>({ bmc: null, data: null, loading: false });

  useEffect(() => {
    loadBMCs();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [selectedOwnerId]);

  // Handle direct navigation to analytics
  useEffect(() => {
    if (route.params?.bmcId && bmcs.length > 0) {
      const bmc = bmcs.find(b => (b._id || b.id) === route.params.bmcId);
      if (bmc) {
        viewHistory(bmc);
      }
    }
  }, [route.params?.bmcId, bmcs]);

  const loadBMCs = async () => {
    try {
      setLoading(true);
      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      const data = await getMilkTruckBMCs(ownerId);
      setBMCs(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error loading BMCs:', error);
      showError(error.message || 'Failed to load BMCs');
      setBMCs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (editingBMC) {
        await updateMilkTruckBMC(editingBMC._id || editingBMC.id, formData);
        success('BMC updated successfully');
      } else {
        await addMilkTruckBMC(formData);
        success('BMC added successfully');
      }

      resetForm();
      await loadBMCs();
    } catch (error: any) {
      console.error('Error saving BMC:', error);
      showError(error.message || 'Failed to save BMC');
    }
  };

  const handleEdit = (bmc: any) => {
    setEditingBMC(bmc);
    setFormData({
      name: bmc.name || '',
      location: bmc.location || '',
      contact: bmc.contact || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete BMC',
      'Are you sure you want to delete this BMC?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMilkTruckBMC(id);
              success('BMC deleted successfully');
              await loadBMCs();
            } catch (error: any) {
              console.error('Error deleting BMC:', error);
              showError(error.message || 'Failed to delete BMC');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({ name: '', location: '', contact: '' });
    setEditingBMC(null);
    setShowForm(false);
  };

  const viewHistory = async (bmc: any) => {
    setViewMode('analytics');
    setAnalyticsData({ bmc, data: null, loading: true });
    try {
      const historyData = await getMilkTruckBMCHistory(bmc._id || bmc.id);
      setAnalyticsData({ bmc, data: historyData, loading: false });
    } catch (error: any) {
      console.error('Error fetching history:', error);
      showError('Failed to load history');
      setViewMode('list');
    }
  };

  const closeHistory = () => {
    setViewMode('list');
    setAnalyticsData({ bmc: null, data: null, loading: false });
  };

  const renderContent = () => {
    if (viewMode === 'list') {
      return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {loading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator color={colors.primary[500]} size="large" />
              <Text style={styles.loadingText}>Syncing BMC data...</Text>
            </View>
          ) : !Array.isArray(bmcs) || bmcs.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🏢</Text>
              <Text style={styles.emptyText}>No BMCs registered yet</Text>
              <Button
                variant="primary"
                onPress={() => setShowForm(true)}
                style={styles.emptyButton}
              >
                Register First BMC
              </Button>
            </Card>
          ) : (
            <View style={styles.list}>
              {bmcs.map((bmc) => (
                <View key={bmc._id || bmc.id} style={styles.listItem}>
                  <View style={styles.listItemHeader}>
                    <View style={styles.bmcIconContainer}>
                      <Text style={styles.bmcIcon}>🏢</Text>
                    </View>
                    <View style={styles.bmcMainInfo}>
                      <Text style={styles.listItemName}>{bmc.name}</Text>
                      <View style={styles.locationContainer}>
                        <Text style={styles.locationIcon}>📍</Text>
                        <Text style={styles.listItemDetail}>{bmc.location}</Text>
                      </View>
                    </View>
                    <View style={styles.contactBadge}>
                      <Text style={styles.contactPhone}>📞 {bmc.contact}</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.listItemActions}>
                    <TouchableOpacity
                      onPress={() => viewHistory(bmc)}
                      style={[styles.premiumActionBtn, styles.analysisBtn]}
                    >
                      <Text style={styles.analysisBtnText}>📊 Performance</Text>
                    </TouchableOpacity>

                    <View style={styles.actionGroupRight}>
                      <TouchableOpacity
                        onPress={() => handleEdit(bmc)}
                        style={styles.iconActionBtn}
                      >
                        <Text style={styles.iconEmoji}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(bmc._id || bmc.id)}
                        style={[styles.iconActionBtn, styles.dangerIconBtn]}
                      >
                        <Text style={styles.iconEmoji}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      );
    }

    // Analytics View
    return (
      <View style={styles.analyticsPage}>
        <View style={styles.analyticsHeader}>
          <TouchableOpacity onPress={closeHistory} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back to Network</Text>
          </TouchableOpacity>
          <Text style={styles.analyticsTitle}>Performance Analytics</Text>
          <Text style={styles.analyticsBmcName}>{analyticsData.bmc?.name}</Text>
        </View>

        {analyticsData.loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator color={colors.primary[500]} size="large" />
            <Text style={styles.loadingText}>Analyzing performance metrics...</Text>
          </View>
        ) : (
          <View>
            <View style={styles.heroAnalytics}>
              <View style={styles.mainVarianceCard}>
                <Text style={styles.mvLabel}>Total Milk Variance</Text>
                <Text style={[styles.mvValue, (analyticsData.data?.totalVariance?.milk || 0) >= 0 ? styles.textSuccess : styles.textDanger]}>
                  {(analyticsData.data?.totalVariance?.milk || 0).toFixed(1)} <Text style={styles.mvUnit}>Ltrs</Text>
                </Text>
                <View style={styles.mvDivider} />
                <View style={styles.mvGrid}>
                  <View style={styles.mvGridItem}>
                    <Text style={styles.mvgLabel}>Fat (kg)</Text>
                    <Text style={[styles.mvgValue, (analyticsData.data?.totalVariance?.fatKg || 0) >= 0 ? styles.textSuccess : styles.textDanger]}>
                      {(analyticsData.data?.totalVariance?.fatKg || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.mvgItemDivider} />
                  <View style={styles.mvGridItem}>
                    <Text style={styles.mvgLabel}>SNF (kg)</Text>
                    <Text style={[styles.mvgValue, (analyticsData.data?.totalVariance?.snfKg || 0) >= 0 ? styles.textSuccess : styles.textDanger]}>
                      {(analyticsData.data?.totalVariance?.snfKg || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeaderAnalytics}>
              <Text style={styles.secTitleA}>Collection Logs</Text>
              <View style={styles.logCountBadge}>
                <Text style={styles.lcbText}>{analyticsData.data?.history?.length || 0} Entries</Text>
              </View>
            </View>

            {analyticsData.data?.history?.length > 0 ? (
              analyticsData.data.history.map((item: any, idx: number) => (
                <Card key={idx} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <View>
                      <Text style={styles.logDate}>
                        {item.date ? new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </Text>
                      <Text style={styles.logTime}>
                        {item.date ? new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </Text>
                    </View>
                    <View style={styles.vehicleBadge}>
                      <Text style={styles.vbText}>{item.vehicleReg || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.logGrid}>
                    <View style={styles.logMetric}>
                      <Text style={styles.lmLabel}>Quantity</Text>
                      <Text style={styles.lmValue}>{(item.collection?.milk || 0).toFixed(1)}L</Text>
                      <Text style={[styles.lmVar, (item.variance?.milk || 0) >= 0 ? styles.textSuccess : styles.textDanger]}>
                        {(item.variance?.milk || 0) > 0 ? '+' : ''}{(item.variance?.milk || 0).toFixed(1)}
                      </Text>
                    </View>
                    <View style={styles.logMetric}>
                      <Text style={styles.lmLabel}>Fat Var</Text>
                      <Text style={[styles.lmVarLarge, (item.variance?.fatKg || 0) >= 0 ? styles.textSuccess : styles.textDanger]}>
                        {(item.variance?.fatKg || 0) > 0 ? '+' : ''}{(item.variance?.fatKg || 0).toFixed(2)}kg
                      </Text>
                    </View>
                    <View style={styles.logMetric}>
                      <Text style={styles.lmLabel}>SNF Var</Text>
                      <Text style={[styles.lmVarLarge, (item.variance?.snfKg || 0) >= 0 ? styles.textSuccess : styles.textDanger]}>
                        {(item.variance?.snfKg || 0) > 0 ? '+' : ''}{(item.variance?.snfKg || 0).toFixed(2)}kg
                      </Text>
                    </View>
                  </View>
                </Card>
              ))
            ) : (
              <View style={styles.emptyA}>
                <Text style={styles.emptyAText}>No historical collection data found.</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[colors.primary[600], colors.primary[400], colors.background.primary]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.8 }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}

        <View style={styles.headerSpacer} />
        <ScreenHeader
          title="BMC Network"
          subtitle="Manage Centers & Collections"
          transparent
          rightAction={
            <TouchableOpacity
              onPress={() => {
                resetForm();
                setShowForm(true);
              }}
              style={styles.addButtonCircle}
            >
              <Text style={styles.addButtonIcon}>+</Text>
            </TouchableOpacity>
          }
        />

        {renderContent()}
      </ScrollView>

      <Modal
        visible={showForm}
        onClose={resetForm}
        title={editingBMC ? 'Update BMC' : 'Register BMC'}
      >
        <View style={styles.formContainer}>
          <Text style={styles.formSubtitle}>Ensure all details are accurate for collections.</Text>
          <Input
            label="BMC Name"
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder="e.g. Anand Dairy BMC"
          />
          <Input
            label="Center Location"
            value={formData.location}
            onChangeText={(value) => handleInputChange('location', value)}
            placeholder="e.g. Sector 5, Anand"
          />
          <Input
            label="In-charge Contact"
            value={formData.contact}
            onChangeText={(value) => handleInputChange('contact', value)}
            placeholder="Phone number"
            keyboardType="phone-pad"
          />
          <View style={styles.modalFooter}>
            <Button
              variant="primary"
              onPress={handleSubmit}
              style={styles.modalSubmitBtn}
            >
              {editingBMC ? 'Save Changes' : 'Register BMC'}
            </Button>
            <TouchableOpacity onPress={resetForm} style={styles.cancelLink}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  addButtonIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingWrapper: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.primary[600],
    fontWeight: '500',
  },
  list: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.primary[50],
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  bmcIconContainer: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  bmcIcon: {
    fontSize: 24,
  },
  bmcMainInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  listItemName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  listItemDetail: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  contactBadge: {
    backgroundColor: colors.success[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  contactPhone: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.success[700],
  },
  divider: {
    height: 1,
    backgroundColor: colors.primary[50],
    marginVertical: spacing.md,
  },
  listItemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  premiumActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  analysisBtn: {
    backgroundColor: '#fff',
    borderColor: colors.primary[200],
  },
  analysisBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary[600],
  },
  actionGroupRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerIconBtn: {
    backgroundColor: colors.error[50],
  },
  iconEmoji: {
    fontSize: 16,
  },
  formContainer: {
    padding: spacing.md,
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginBottom: spacing.lg,
  },
  modalFooter: {
    marginTop: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  modalSubmitBtn: {
    width: '100%',
  },
  cancelLink: {
    padding: spacing.sm,
  },
  cancelText: {
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: borderRadius.xl,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.tertiary,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    width: '100%',
  },
  analyticsPage: {
    paddingBottom: 40,
  },
  analyticsHeader: {
    marginBottom: spacing.xl,
  },
  backBtn: {
    marginBottom: spacing.md,
  },
  backBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    fontSize: 14,
  },
  analyticsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  analyticsBmcName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: 4,
  },
  heroAnalytics: {
    marginBottom: spacing.xl,
  },
  mainVarianceCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    ...shadows.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary[50],
  },
  mvLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  mvValue: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  mvUnit: {
    fontSize: 18,
    opacity: 0.6,
  },
  mvDivider: {
    height: 1,
    width: '100%',
    backgroundColor: colors.border.light,
    marginVertical: spacing.lg,
  },
  mvGrid: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  mvGridItem: {
    alignItems: 'center',
    flex: 1,
  },
  mvgLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    marginBottom: 4,
  },
  mvgValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  mvgItemDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.light,
  },
  sectionHeaderAnalytics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  secTitleA: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[900],
  },
  logCountBadge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  lcbText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary[700],
  },
  logCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  logDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  logTime: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  vehicleBadge: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  vbText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary[700],
  },
  logGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
    paddingTop: spacing.md,
  },
  logMetric: {
    flex: 1,
    alignItems: 'center',
  },
  lmLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  lmValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  lmVar: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  lmVarLarge: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyA: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyAText: {
    color: colors.text.tertiary,
    fontSize: 14,
  },
  textSuccess: {
    color: colors.success[600],
  },
  textDanger: {
    color: colors.error[600],
  },
});

export default BMCManagement;
