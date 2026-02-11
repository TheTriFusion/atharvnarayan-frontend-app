import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Animated, RefreshControl, StatusBar, Platform, TextInput } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

interface Driver {
  _id: string;
  name: string;
  phoneNumber: string;
  licenseNumber?: string;
  address?: string;
}

const DriverManagement: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Refresh data when focused
  useFocusEffect(
    React.useCallback(() => {
      fetchDrivers();
    }, [])
  );

  useEffect(() => {
    fetchDrivers();

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDrivers(drivers);
    } else {
      const filtered = drivers.filter(driver =>
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.phoneNumber.includes(searchQuery)
      );
      setFilteredDrivers(filtered);
    }
  }, [searchQuery, drivers]);

  const fetchDrivers = async () => {
    try {
      const response = await cattleFeedTruckAPI.getDrivers(user?.id);
      const data = Array.isArray(response) ? response : (Array.isArray(response.data) ? response.data : []);
      setDrivers(data);
      setFilteredDrivers(data);
    } catch (error: any) {
      console.error('Error fetching drivers:', error);
      toast.error('Error loading drivers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchDrivers();
  }, []);

  const handleAdd = () => {
    navigation.navigate('ManageDriver');
  };

  const handleEdit = (driver: Driver) => {
    navigation.navigate('ManageDriver', { driver });
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Driver',
      'Are you sure you want to delete this driver? All associated data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await cattleFeedTruckAPI.deleteDriver(id);
              toast.success('Driver deleted successfully!');
              fetchDrivers();
            } catch (error: any) {
              console.error('Error deleting driver:', error);
              toast.error('Error deleting driver');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };


  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (loading && !refreshing && drivers.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading Drivers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background Gradient */}
      <LinearGradient
        colors={[colors.primary[600], colors.primary[400], colors.background.primary]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
      />

      <View style={styles.headerSpacer} />

      <ScreenHeader
        title="Driver Management"
        subtitle="Manage your fleet drivers"
        transparent
        titleStyle={{ color: '#fff' }}
        subtitleStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAdd}
          >
            <Text style={styles.addButtonText}>+ New</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search by name or phone..."
            placeholderTextColor={colors.text.tertiary}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {filteredDrivers.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Text style={styles.emptyIcon}>👥</Text>
              </View>
              <Text style={styles.emptyTitle}>No Drivers Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? `No results for "${searchQuery}"` : "You haven't added any drivers yet."}
              </Text>
              <Button
                onPress={() => {
                  if (searchQuery) setSearchQuery('');
                  else handleAdd();
                }}
                variant="outline"
                style={styles.emptyButton}
              >
                {searchQuery ? "Clear Search" : "Add Driver"}
              </Button>
            </View>
          ) : (
            <View style={styles.driverList}>
              {filteredDrivers.map((driver) => (
                <Card key={driver._id} style={styles.driverCard}>
                  <View style={styles.cardTop}>
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatarText}>{getInitials(driver.name)}</Text>
                    </View>
                    <View style={styles.driverMainInfo}>
                      <Text style={styles.driverName}>{driver.name}</Text>
                      <View style={styles.phoneBox}>
                        <Text style={styles.phoneIconSmall}>📞</Text>
                        <Text style={styles.driverPhone}>{driver.phoneNumber}</Text>
                      </View>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Active</Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardDetails}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>License</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>
                        {driver.licenseNumber || 'Not provided'}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Address</Text>
                      <Text style={styles.detailValue} numberOfLines={1}>
                        {driver.address || 'Not provided'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.editBtn]}
                      onPress={() => handleEdit(driver)}
                    >
                      <Text style={styles.editBtnText}>Edit Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => handleDelete(driver._id)}
                    >
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          )}
          <View style={{ height: 100 }} />
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
    height: 300,
  },
  headerSpacer: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: colors.primary[600],
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    height: 48,
    ...shadows.md,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
  },
  clearIcon: {
    fontSize: 14,
    color: colors.text.tertiary,
    padding: 4,
  },
  driverList: {
    gap: 16,
    marginTop: spacing.sm,
  },
  driverCard: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: '#fff',
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[600],
  },
  driverMainInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  phoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneIconSmall: {
    fontSize: 12,
    marginRight: 4,
  },
  driverPhone: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  badge: {
    backgroundColor: colors.success[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success[600],
    textTransform: 'uppercase',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 12,
  },
  cardDetails: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: '#fff',
    borderColor: colors.primary[600],
  },
  editBtnText: {
    color: colors.primary[600],
    fontWeight: '600',
    fontSize: 14,
  },
  deleteBtn: {
    backgroundColor: colors.error[50],
    borderColor: colors.error[100],
  },
  deleteBtnText: {
    color: colors.error[600],
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyButton: {
    width: 160,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 20,
  },
  cancelLink: {
    paddingVertical: 10,
  },
  cancelLinkText: {
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
  },
});

export default DriverManagement;
