import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Animated, Platform, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getMilkTruckRoutes, getMilkTruckBMCs, addMilkTruckRoute, updateMilkTruckRoute, deleteMilkTruckRoute } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
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

const RouteManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const { success, error: showError } = useToast();
  const [routes, setRoutes] = useState<any[]>([]);
  const [bmcs, setBMCs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
  });
  const [selectedBMCs, setSelectedBMCs] = useState<string[]>([]);
  const [bmcToAdd, setBMCToAdd] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadData();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [selectedOwnerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      const [routesData, bmcsData] = await Promise.all([
        getMilkTruckRoutes(ownerId),
        getMilkTruckBMCs(ownerId),
      ]);
      setRoutes(Array.isArray(routesData) ? routesData : []);
      setBMCs(Array.isArray(bmcsData) ? bmcsData : []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      showError(error.message || 'Failed to load data');
      setRoutes([]);
      setBMCs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddBMC = () => {
    if (bmcToAdd && !selectedBMCs.includes(bmcToAdd)) {
      setSelectedBMCs(prev => [...prev, bmcToAdd]);
      setBMCToAdd('');
    }
  };

  const handleRemoveBMC = (indexToRemove: number) => {
    setSelectedBMCs(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const moveBMC = (index: number, direction: 'up' | 'down') => {
    const newBMCs = [...selectedBMCs];
    if (direction === 'up' && index > 0) {
      [newBMCs[index], newBMCs[index - 1]] = [newBMCs[index - 1], newBMCs[index]];
      setSelectedBMCs(newBMCs);
    } else if (direction === 'down' && index < newBMCs.length - 1) {
      [newBMCs[index], newBMCs[index + 1]] = [newBMCs[index + 1], newBMCs[index]];
      setSelectedBMCs(newBMCs);
    }
  };

  const handleSubmit = async () => {
    if (selectedBMCs.length === 0) {
      showError('Please select at least one BMC for the route');
      return;
    }

    const routeData = {
      ...formData,
      bmcSequence: selectedBMCs,
    };

    try {
      if (editingRoute) {
        await updateMilkTruckRoute(editingRoute._id || editingRoute.id, routeData);
        success('Route updated successfully');
      } else {
        await addMilkTruckRoute(routeData);
        success('Route added successfully');
      }

      resetForm();
      await loadData();
    } catch (error: any) {
      console.error('Error saving route:', error);
      showError(error.message || 'Failed to save route');
    }
  };

  const handleEdit = (route: any) => {
    setEditingRoute(route);
    setFormData({
      name: route.name || '',
    });
    const bmcIds = route.bmcSequence?.map((b: any) => (typeof b === 'object' ? b._id || b.id : b)) || [];
    setSelectedBMCs(bmcIds);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Route',
      'Are you sure you want to delete this route?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMilkTruckRoute(id);
              success('Route deleted successfully');
              await loadData();
            } catch (error: any) {
              console.error('Error deleting route:', error);
              showError(error.message || 'Failed to delete route');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setSelectedBMCs([]);
    setBMCToAdd('');
    setEditingRoute(null);
    setShowForm(false);
  };

  const availableBMCs = bmcs.filter(bmc => {
    const bmcId = bmc._id || bmc.id;
    return !selectedBMCs.includes(bmcId);
  });

  const bmcOptions = availableBMCs.map(b => ({
    value: b._id || b.id,
    label: `${b.name} (${b.location})`,
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[colors.success[600], colors.success[400], colors.background.primary]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.8 }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}

        <View style={styles.headerSpacer} />
        <ScreenHeader
          title="Route Network"
          subtitle="Define Strategic Logistics"
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

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {loading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator color={colors.success[500]} size="large" />
              <Text style={styles.loadingText}>Mapping logistics...</Text>
            </View>
          ) : !Array.isArray(routes) || routes.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🛣️</Text>
              <Text style={styles.emptyText}>No routes established</Text>
              <Button
                variant="primary"
                onPress={() => setShowForm(true)}
                style={[styles.emptyButton, { backgroundColor: colors.success[600] }]}
              >
                Create First Route
              </Button>
            </Card>
          ) : (
            <View style={styles.list}>
              {routes.map((route) => {
                const routeBMCs = Array.isArray(route.bmcSequence) ? route.bmcSequence : [];
                return (
                  <View key={route._id || route.id} style={styles.listItem}>
                    <View style={styles.listItemHeader}>
                      <View style={[styles.routeIconContainer, { backgroundColor: colors.success[50] }]}>
                        <Text style={styles.routeIcon}>🛣️</Text>
                      </View>
                      <View style={styles.routeMainInfo}>
                        <Text style={styles.listItemName}>{route.name}</Text>
                        <Text style={styles.stopCount}>{routeBMCs.length} Collections Centers</Text>
                      </View>
                    </View>

                    <View style={styles.mapVisualContainer}>
                      <View style={styles.timelineLine} />
                      {routeBMCs.map((bmcData: any, idx: number) => {
                        const bmcId = typeof bmcData === 'object' ? bmcData._id || bmcData.id : bmcData;
                        const bmc = typeof bmcData === 'object' ? bmcData : (bmcs.find(b => (b._id || b.id) === bmcId));
                        return (
                          <View key={idx} style={styles.timelineItem}>
                            <View style={[styles.timelineDot, { backgroundColor: idx === 0 ? colors.success[500] : colors.success[300] }]} />
                            <Text style={styles.timelineText} numberOfLines={1}>
                              {bmc?.name || 'Loading...'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.listItemActions}>
                      <TouchableOpacity
                        onPress={() => handleEdit(route)}
                        style={[styles.premiumActionBtn, styles.editBtn]}
                      >
                        <Text style={styles.editBtnText}>✏️ Refine Route</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDelete(route._id || route.id)}
                        style={styles.iconActionBtn}
                      >
                        <Text style={styles.iconEmoji}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showForm}
        onClose={resetForm}
        title={editingRoute ? 'Refine Route' : 'Establish Route'}
      >
        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <Input
              label="Route Identifier"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="e.g. Northern Hub Route"
            />

            <View style={styles.addBmcSection}>
              <Text style={styles.selectionLabel}>Add Collection Centers</Text>
              <View style={styles.addBmcPickerRow}>
                <View style={styles.flex1}>
                  <Select
                    label=""
                    value={bmcToAdd}
                    onChange={(value) => setBMCToAdd(value as string)}
                    options={[
                      { value: '', label: 'Select BMC' },
                      ...bmcOptions,
                    ]}
                  />
                </View>
                <TouchableOpacity
                  onPress={handleAddBMC}
                  disabled={!bmcToAdd}
                  style={[styles.miniAddBtn, !bmcToAdd && styles.disabledMiniBtn]}
                >
                  <Text style={styles.miniAddBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {selectedBMCs.length > 0 ? (
              <View style={styles.sequenceEditList}>
                <Text style={styles.selectionLabel}>Sequence Roadmap</Text>
                {selectedBMCs.map((bmcId, index) => {
                  const bmc = bmcs.find(b => (b._id || b.id) === bmcId);
                  return (
                    <View key={bmcId} style={styles.editableSequenceItem}>
                      <View style={styles.seqIndex}>
                        <Text style={styles.seqIndexText}>{index + 1}</Text>
                      </View>
                      <View style={styles.seqInfo}>
                        <Text style={styles.seqName} numberOfLines={1}>{bmc?.name}</Text>
                        <Text style={styles.seqLoc} numberOfLines={1}>{bmc?.location}</Text>
                      </View>
                      <View style={styles.seqActions}>
                        <TouchableOpacity onPress={() => moveBMC(index, 'up')} disabled={index === 0} style={styles.seqMoveBtn}>
                          <Text style={[styles.seqMoveText, index === 0 && styles.disabledText]}>↑</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => moveBMC(index, 'down')} disabled={index === selectedBMCs.length - 1} style={styles.seqMoveBtn}>
                          <Text style={[styles.seqMoveText, index === selectedBMCs.length - 1 && styles.disabledText]}>↓</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleRemoveBMC(index)} style={styles.seqRemoveBtn}>
                          <Text style={styles.seqRemoveText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyFormState}>
                <Text style={styles.emptyFormText}>Add at least one BMC to build the route sequence.</Text>
              </View>
            )}

            <View style={styles.modalFooter}>
              <Button
                variant="primary"
                onPress={handleSubmit}
                style={[styles.modalSubmitBtn, { backgroundColor: colors.success[600] }]}
              >
                {editingRoute ? 'Save Roadmap' : 'Create Route'}
              </Button>
              <TouchableOpacity onPress={resetForm} style={styles.cancelLink}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
    color: colors.success[600],
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
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  routeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeIcon: {
    fontSize: 26,
  },
  routeMainInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  listItemName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    marginBottom: 4,
  },
  stopCount: {
    fontSize: 12,
    color: colors.success[700],
    fontWeight: 'bold',
  },
  mapVisualContainer: {
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    position: 'relative',
    gap: spacing.xs,
  },
  timelineLine: {
    position: 'absolute',
    left: 21,
    top: 25,
    bottom: 25,
    width: 2,
    backgroundColor: colors.success[100],
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    zIndex: 1,
  },
  timelineText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: spacing.sm,
  },
  listItemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  premiumActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: '#fff',
    borderColor: colors.success[200],
    flex: 1,
    marginRight: spacing.md,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.success[600],
    textAlign: 'center',
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.error[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 16,
  },
  modalScroll: {
    maxHeight: 550,
  },
  formContainer: {
    padding: spacing.md,
  },
  addBmcSection: {
    marginTop: spacing.sm,
  },
  selectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  addBmcPickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  miniAddBtn: {
    backgroundColor: colors.success[600],
    paddingHorizontal: 16,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  disabledMiniBtn: {
    backgroundColor: colors.background.tertiary,
  },
  miniAddBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sequenceEditList: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  editableSequenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  seqIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  seqIndexText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.success[700],
  },
  seqInfo: {
    flex: 1,
  },
  seqName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary[900],
  },
  seqLoc: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  seqActions: {
    flexDirection: 'row',
    gap: 4,
  },
  seqMoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  seqMoveText: {
    fontSize: 16,
    color: colors.primary[600],
  },
  seqRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.error[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  seqRemoveText: {
    fontSize: 12,
    color: colors.error[600],
    fontWeight: 'bold',
  },
  disabledText: {
    color: colors.text.tertiary,
    opacity: 0.3,
  },
  emptyFormState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyFormText: {
    color: colors.text.tertiary,
    textAlign: 'center',
    fontSize: 12,
    fontStyle: 'italic',
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
});

export default RouteManagement;
