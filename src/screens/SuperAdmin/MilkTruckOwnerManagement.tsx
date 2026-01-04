import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import {
  getMilkTruckOwners,
  getPendingMilkTruckOwners,
  approveMilkTruckOwner,
  addMilkTruckOwner,
  updateMilkTruckOwner,
  deleteMilkTruckOwner
} from '../../utils/storage';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { useToast } from '../../contexts/ToastContext';

const MilkTruckOwnerManagement: React.FC = () => {
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [owners, setOwners] = useState<any[]>([]);
  const [pendingOwners, setPendingOwners] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOwner, setEditingOwner] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    password: '',
    companyName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'active') {
        const data = await getMilkTruckOwners();
        setOwners(Array.isArray(data) ? data : []);
      } else {
        const data = await getPendingMilkTruckOwners();
        setPendingOwners(Array.isArray(data) ? data : []);
      }
    } catch (error: any) {
      console.error('Error loading milk truck owners:', error);
      showError(error.message || 'Failed to load owners');
      setOwners([]);
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
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = "Phone required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const ownerData: any = {
      name: formData.name.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      companyDetails: { name: formData.companyName }
    };
    if (formData.password) ownerData.password = formData.password;

    try {
      if (editingOwner) {
        await updateMilkTruckOwner(editingOwner._id || editingOwner.id, ownerData);
        success('Owner updated successfully');
      } else {
        await addMilkTruckOwner(ownerData);
        success('Owner added successfully');
      }
      resetForm();
      await loadData();
    } catch (error: any) {
      console.error(error);
      showError(error.message || 'Failed to save owner');
    }
  };

  const handleApprove = async (owner: any) => {
    Alert.alert(
      'Approve Registration',
      `Approve registration for ${owner.name} (${owner.companyDetails?.name})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await approveMilkTruckOwner(owner._id || owner.id);
              success('Owner approved successfully');
              loadData();
            } catch (e: any) {
              showError(e.message || 'Error approving owner');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (owner: any) => {
    setEditingOwner(owner);
    setFormData({
      name: owner.name || '',
      phoneNumber: owner.phoneNumber || '',
      password: '',
      companyName: owner.companyDetails?.name || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Owner',
      'Are you sure you want to delete this milk truck owner?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMilkTruckOwner(id);
              success('Owner deleted successfully');
              loadData();
            } catch (e: any) {
              showError(e.message || 'Failed to delete owner');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({ name: '', phoneNumber: '', password: '', companyName: '' });
    setEditingOwner(null);
    setShowForm(false);
    setErrors({});
  };

  const currentList = activeTab === 'active' ? owners : pendingOwners;
  const filteredOwners = Array.isArray(currentList) ? currentList.filter(owner => {
    const term = searchTerm.toLowerCase();
    return (
      (owner.name && owner.name.toLowerCase().includes(term)) ||
      (owner.phoneNumber && owner.phoneNumber.includes(term)) ||
      (owner.companyDetails?.name && owner.companyDetails.name.toLowerCase().includes(term))
    );
  }) : [];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Milk Truck Owners</Text>
        <Button
          variant="primary"
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Add New Owner
        </Button>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active Owners
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending Approvals ({pendingOwners.length})
          </Text>
        </TouchableOpacity>
      </View>

      <Card>
        <Input
          label="Search"
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search..."
        />
      </Card>

      <Modal visible={showForm} onClose={resetForm} title={editingOwner ? 'Edit Owner' : 'Add Owner'}>
        <ScrollView style={styles.modalContent}>
          <View style={styles.form}>
            <Input
              label="Full Name"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              required
              error={errors.name}
            />
            <Input
              label="Company Name"
              value={formData.companyName}
              onChangeText={(value) => handleInputChange('companyName', value)}
              placeholder="e.g., ABC Transport"
            />
            <Input
              label="Phone Number"
              value={formData.phoneNumber}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
              required
              keyboardType="phone-pad"
              error={errors.phoneNumber}
            />
            <Input
              label={editingOwner ? "New Password" : "Password"}
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              secureTextEntry
              required={!editingOwner}
            />
            <View style={styles.formButtons}>
              <Button variant="secondary" onPress={resetForm}>
                Cancel
              </Button>
              <Button variant="primary" onPress={handleSubmit}>
                Save
              </Button>
            </View>
          </View>
        </ScrollView>
      </Modal>

      <Card>
        {filteredOwners.length === 0 ? (
          <Text style={styles.emptyText}>No owners found</Text>
        ) : (
          <View style={styles.list}>
            {filteredOwners.map(owner => (
              <View key={owner._id || owner.id} style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <Text style={styles.companyName}>{owner.companyDetails?.name || '-'}</Text>
                  <Text style={styles.ownerName}>{owner.name}</Text>
                  <Text style={styles.phone}>{owner.phoneNumber}</Text>
                  <View style={[styles.statusBadge, owner.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={styles.statusText}>
                      {owner.onboardingStatus || (owner.isActive ? 'Active' : 'Inactive')}
                    </Text>
                  </View>
                </View>
                <View style={styles.listItemActions}>
                  {activeTab === 'pending' && (
                    <Button
                      variant="primary"
                      onPress={() => handleApprove(owner)}
                      style={styles.actionButton}
                    >
                      Approve
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onPress={() => handleEdit(owner)}
                    style={styles.actionButton}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onPress={() => handleDelete(owner._id || owner.id)}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
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
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadge: {
    backgroundColor: '#d1fae5',
  },
  inactiveBadge: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
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

export default MilkTruckOwnerManagement;

