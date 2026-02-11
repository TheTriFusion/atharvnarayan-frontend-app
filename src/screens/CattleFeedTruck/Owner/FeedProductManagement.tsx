import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import Select from '../../../components/common/Select';

interface FeedProduct {
  _id: string;
  name: string;
  category?: string;
  pricePerUnit?: string;
  unit?: string;
  description?: string;
}

const FeedProductManagement: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [products, setProducts] = useState<FeedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FeedProduct | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    pricePerUnit: '',
    unit: 'kg',
    description: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await cattleFeedTruckAPI.getFeedProducts(user?.id);
      setProducts(Array.isArray(response) ? response : (Array.isArray(response.data) ? response.data : []));
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error('Error loading products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingProduct) {
        await cattleFeedTruckAPI.updateFeedProduct(editingProduct._id, { ...formData, ownerId: user?.id });
        toast.success('Product updated successfully!');
      } else {
        await cattleFeedTruckAPI.createFeedProduct({ ...formData, ownerId: user?.id });
        toast.success('Product created successfully!');
      }
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleEdit = (product: FeedProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category || '',
      pricePerUnit: product.pricePerUnit || '',
      unit: product.unit || 'kg',
      description: product.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Product', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await cattleFeedTruckAPI.deleteFeedProduct(id);
            toast.success('Product deleted successfully!');
            fetchProducts();
          } catch (error: any) {
            console.error('Error deleting product:', error);
            toast.error('Error deleting product');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setFormData({ name: '', category: '', pricePerUnit: '', unit: 'kg', description: '' });
    setEditingProduct(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Feed Products</Text>
        <Button
          onPress={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Add Product
        </Button>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
      ) : (
        <Card style={styles.listCard}>
          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No products found. Add your first product.
              </Text>
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              renderItem={({ item: product }) => (
                <View style={styles.productItem}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    {product.category && (
                      <Text style={styles.productDetail}>Category: {product.category}</Text>
                    )}
                    {product.pricePerUnit && (
                      <Text style={styles.productDetail}>
                        Price: ₹{product.pricePerUnit} per {product.unit || 'kg'}
                      </Text>
                    )}
                    {product.description && (
                      <Text style={styles.productDescription}>{product.description}</Text>
                    )}
                  </View>
                  <View style={styles.productActions}>
                    <Button
                      onPress={() => handleEdit(product)}
                      variant="secondary"
                      style={styles.actionButton}
                    >
                      Edit
                    </Button>
                    <Button
                      onPress={() => handleDelete(product._id)}
                      variant="danger"
                      style={styles.actionButton}
                    >
                      Delete
                    </Button>
                  </View>
                </View>
              )}
            />
          )}
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
      >
        <Input
          label="Product Name *"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          required
        />
        <Input
          label="Category"
          value={formData.category}
          onChangeText={(text) => setFormData({ ...formData, category: text })}
          placeholder="Optional"
        />
        <View style={styles.formRow}>
          <Input
            label="Price Per Unit"
            value={formData.pricePerUnit}
            onChangeText={(text) => setFormData({ ...formData, pricePerUnit: text })}
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
          <Select
            label="Unit"
            value={formData.unit}
            onChange={(value) => setFormData({ ...formData, unit: value as string })}
            options={[
              { label: 'kg', value: 'kg' },
              { label: 'bags', value: 'bags' },
              { label: 'tons', value: 'tons' },
            ]}
            containerStyle={styles.halfInput}
          />
        </View>
        <Input
          label="Description"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Optional"
          multiline
          numberOfLines={3}
        />
        <View style={styles.modalActions}>
          <Button
            onPress={() => {
              setShowModal(false);
              resetForm();
            }}
            variant="secondary"
            style={styles.modalButton}
          >
            Cancel
          </Button>
          <Button onPress={handleSubmit} style={styles.modalButton}>
            {editingProduct ? 'Update' : 'Create'}
          </Button>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  loader: {
    marginVertical: 32,
  },
  listCard: {
    margin: 16,
    marginTop: 0,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productDetail: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  productDescription: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default FeedProductManagement;
