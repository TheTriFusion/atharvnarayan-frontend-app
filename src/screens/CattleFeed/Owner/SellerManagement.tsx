import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { getCattleFeedSellers, addCattleFeedSeller, updateCattleFeedSeller, deleteCattleFeedSeller } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

const SellerManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const toast = useToast();
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSeller, setEditingSeller] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    phoneNumber: '',
    email: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedOwnerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      const data = await getCattleFeedSellers(ownerId);
      setSellers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load sellers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else {
      const existingSeller = sellers.find(
        s => s.username === formData.username && (s._id || s.id) !== (editingSeller?._id || editingSeller?.id)
      );
      if (existingSeller) {
        newErrors.username = 'Username already exists';
      }
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    }
    if (!editingSeller && (!formData.password || formData.password.length < 4)) {
      newErrors.password = 'Password must be at least 4 characters';
    }
    if (editingSeller && formData.password && formData.password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const sellerData: any = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim() || null,
      };

      if (formData.password) {
        sellerData.password = formData.password;
      }

      if (editingSeller) {
        await updateCattleFeedSeller(editingSeller._id || editingSeller.id, sellerData);
        toast.success('Seller updated');
      } else {
        await addCattleFeedSeller(sellerData);
        toast.success('Seller added');
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save seller');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (seller: any) => {
    setEditingSeller(seller);
    setFormData({
      name: seller.name || '',
      username: seller.username || '',
      password: '',
      phoneNumber: seller.phoneNumber || seller.phone || '',
      email: seller.email || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Seller',
      'Are you sure you want to delete this seller?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCattleFeedSeller(id);
              toast.success('Seller deleted');
              await loadData();
            } catch (err: any) {
              toast.error(err.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({ name: '', username: '', password: '', phoneNumber: '', email: '' });
    setEditingSeller(null);
    setShowForm(false);
    setErrors({});
  };

  const filteredSellers = sellers.filter(seller => {
    const searchLower = searchTerm.toLowerCase();
    return (
      seller.name?.toLowerCase().includes(searchLower) ||
      seller.username?.toLowerCase().includes(searchLower) ||
      (seller.phoneNumber || seller.phone)?.includes(searchTerm) ||
      seller.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Sellers"
        subtitle="Manage your sales team"
        showBackButton
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Text style={styles.addButtonIcon}>➕</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[500]]} />
        }
      >
        <View style={styles.content}>
          {isSuperAdmin && <OwnerSelector systemType="cattleFeed" />}

          <View style={styles.searchSection}>
            <Input
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search by name, username..."
              style={styles.searchInput}
            />
          </View>

          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={colors.primary[500]} style={styles.loader} />
          ) : (
            <View style={styles.sellerList}>
              {filteredSellers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>👥</Text>
                  <Text style={styles.emptyText}>No sellers found.</Text>
                </View>
              ) : (
                filteredSellers.map((seller) => (
                  <Card key={seller._id || seller.id} style={styles.sellerCard}>
                    <View style={styles.sellerRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {seller.name?.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.sellerInfo}>
                        <Text style={styles.sellerName}>{seller.name}</Text>
                        <Text style={styles.sellerUsername}>@{seller.username}</Text>
                        <View style={styles.contactRow}>
                          <Text style={styles.contactItem}>📞 {seller.phoneNumber || seller.phone}</Text>
                          {seller.email && <Text style={styles.contactItem}>📧 {seller.email}</Text>}
                        </View>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primary[50] }]}
                        onPress={() => handleEdit(seller)}
                      >
                        <Text style={[styles.actionBtnText, { color: colors.primary[700] }]}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.error[50] }]}
                        onPress={() => handleDelete(seller._id || seller.id)}
                      >
                        <Text style={[styles.actionBtnText, { color: colors.error[700] }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showForm}
        onClose={resetForm}
        title={editingSeller ? 'Edit Seller Details' : 'Add New Seller'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalBody}>
            <Input
              label="Full Name *"
              value={formData.name}
              onChangeText={(v) => handleInputChange('name', v)}
              error={errors.name}
              placeholder="Enter name"
            />
            <Input
              label="Username *"
              value={formData.username}
              onChangeText={(v) => handleInputChange('username', v)}
              error={errors.username}
              placeholder="Choose a username"
              autoCapitalize="none"
            />
            <Input
              label="Phone Number *"
              value={formData.phoneNumber}
              onChangeText={(v) => handleInputChange('phoneNumber', v)}
              error={errors.phoneNumber}
              keyboardType="phone-pad"
              placeholder="Enter mobile number"
            />
            <Input
              label={editingSeller ? 'Set New Password (optional)' : 'Password *'}
              value={formData.password}
              onChangeText={(v) => handleInputChange('password', v)}
              error={errors.password}
              secureTextEntry
              placeholder="Min 4 characters"
            />
            <Input
              label="Email Address"
              value={formData.email}
              onChangeText={(v) => handleInputChange('email', v)}
              error={errors.email}
              keyboardType="email-address"
              placeholder="example@mail.com"
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={resetForm}
              >Cancel</Button>
              <Button
                style={{ flex: 1 }}
                onPress={handleSubmit}
                loading={submitting}
              >{editingSeller ? 'Update' : 'Create'}</Button>
            </View>
          </View>
          <View style={{ height: 20 }} />
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: spacing.lg,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonIcon: {
    fontSize: 20,
    color: colors.primary[600],
  },
  loader: {
    marginVertical: spacing.xxl,
  },
  searchSection: {
    marginBottom: spacing.lg,
  },
  searchInput: {
    backgroundColor: 'white',
  },
  sellerList: {
    marginBottom: spacing.xxl,
  },
  sellerCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  sellerUsername: {
    fontSize: 13,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semibold,
    marginTop: 1,
  },
  contactRow: {
    marginTop: 4,
    gap: 2,
  },
  contactItem: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: spacing.md,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: 'white',
    borderRadius: borderRadius.xl,
    marginTop: spacing.md,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: spacing.md,
    opacity: 0.2,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  modalBody: {
    paddingVertical: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

export default SellerManagement;
