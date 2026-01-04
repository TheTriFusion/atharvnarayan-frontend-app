import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { getCattleFeedSellers, addCattleFeedSeller, updateCattleFeedSeller, deleteCattleFeedSeller } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';

const SellerManagement: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const { success, error: showError } = useToast();
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      showError(err.message || 'Failed to load sellers');
    } finally {
      setLoading(false);
    }
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
        success('Seller updated successfully');
      } else {
        await addCattleFeedSeller(sellerData);
        success('Seller added successfully');
      }
      
      resetForm();
      await loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to save seller');
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
      'Are you sure you want to delete this seller? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCattleFeedSeller(id);
              success('Seller deleted successfully');
              await loadData();
            } catch (err: any) {
              showError(err.message || 'Failed to delete seller');
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading sellers...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {isSuperAdmin && <OwnerSelector systemType="cattleFeed" />}
      
      <View style={styles.header}>
        <Text style={styles.title}>Seller Management</Text>
        <Button
          variant="primary"
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Add New Seller
        </Button>
      </View>

      <Card>
        <Input
          label="Search Sellers"
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search by name, username, phone, or email..."
        />
      </Card>

      <Card title={`Sellers (${filteredSellers.length})`}>
        {filteredSellers.length === 0 ? (
          <Text style={styles.emptyText}>No sellers found</Text>
        ) : (
          <View style={styles.list}>
            {filteredSellers.map((seller) => (
              <View key={seller._id || seller.id} style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemName}>{seller.name}</Text>
                  <Text style={styles.listItemDetail}>👤 {seller.username}</Text>
                  <Text style={styles.listItemDetail}>📞 {seller.phoneNumber || seller.phone}</Text>
                  {seller.email && <Text style={styles.listItemDetail}>📧 {seller.email}</Text>}
                </View>
                <View style={styles.listItemActions}>
                  <Button
                    variant="secondary"
                    onPress={() => handleEdit(seller)}
                    style={styles.actionButton}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onPress={() => handleDelete(seller._id || seller.id)}
                    style={styles.actionButton}
                  >
                    Delete
                  </Button>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Modal
        visible={showForm}
        onClose={resetForm}
        title={editingSeller ? 'Edit Seller' : 'Add New Seller'}
      >
        <ScrollView style={styles.modalContent}>
          <View style={styles.form}>
            <Input
              label="Name"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              error={errors.name}
              required
            />
            <Input
              label="Username"
              value={formData.username}
              onChangeText={(value) => handleInputChange('username', value)}
              error={errors.username}
              required
            />
            <Input
              label="Phone Number"
              value={formData.phoneNumber}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
              error={errors.phoneNumber}
              required
              keyboardType="phone-pad"
            />
            <Input
              label={editingSeller ? 'New Password (leave blank to keep current)' : 'Password'}
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              error={errors.password}
              required={!editingSeller}
              secureTextEntry
            />
            <Input
              label="Email (Optional)"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              error={errors.email}
              keyboardType="email-address"
            />
            <View style={styles.formButtons}>
              <Button variant="secondary" onPress={resetForm} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" onPress={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : editingSeller ? 'Update' : 'Add'}
              </Button>
            </View>
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  listItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  modalContent: {
    maxHeight: 500,
  },
  form: {
    gap: 16,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});

export default SellerManagement;
