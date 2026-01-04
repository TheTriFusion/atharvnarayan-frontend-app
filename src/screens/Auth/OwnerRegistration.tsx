import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Select from '../../components/common/Select';
import { useToast } from '../../contexts/ToastContext';
import API_BASE_URL from '../../config/api';

const OwnerRegistration: React.FC = () => {
  const navigation = useNavigation<any>();
  const { success, error: showError } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    password: '',
    email: '',
    systemType: 'milkTruck',
    companyName: '',
    companyType: 'sole_proprietorship',
    address: '',
    panCard: '',
    aadhaarCard: '',
    registrationNumber: '',
    gstNumber: '',
    businessCategory: 'agro_cattle_feed',
  });
  const [error, setError] = useState('');
  const [successState, setSuccessState] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register-owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccessState(true);
        success('Registration successful! Your account is pending approval.');
      } else {
        setError(data.message || 'Registration failed');
        showError(data.message || 'Registration failed');
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg = 'Network error. Please try again.';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (successState) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centerContent}>
        <Card style={styles.successCard}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Registration Successful!</Text>
          <Text style={styles.successText}>
            Your account has been created and is pending approval.
          </Text>
          <Text style={styles.successText}>
            You will be notified once the Super Admin approves your request.
          </Text>
          <Button
            variant="primary"
            onPress={() => navigation.navigate('Login')}
            style={styles.returnButton}
          >
            Return to Login
          </Button>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Partner Registration</Text>
        <Text style={styles.subtitle}>Register your company with us</Text>
      </View>

      <Card style={styles.formCard}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Owner Details</Text>
          <View style={styles.formRow}>
            <Input
              label="Full Name *"
              value={formData.name}
              onChangeText={(value) => handleChange('name', value)}
              required
              containerStyle={styles.halfInput}
            />
            <Input
              label="Phone Number *"
              value={formData.phoneNumber}
              onChangeText={(value) => handleChange('phoneNumber', value)}
              required
              keyboardType="phone-pad"
              maxLength={10}
              containerStyle={styles.halfInput}
            />
          </View>
          <View style={styles.formRow}>
            <Input
              label="Email"
              value={formData.email}
              onChangeText={(value) => handleChange('email', value)}
              keyboardType="email-address"
              containerStyle={styles.halfInput}
            />
            <Input
              label="Password *"
              value={formData.password}
              onChangeText={(value) => handleChange('password', value)}
              required
              secureTextEntry
              containerStyle={styles.halfInput}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Details</Text>
          <Input
            label="Company Name *"
            value={formData.companyName}
            onChangeText={(value) => handleChange('companyName', value)}
            required
            placeholder="e.g. Atharv Transports"
          />
          <View style={styles.formRow}>
            <Select
              label="Business Type"
              value={formData.companyType}
              onChange={(value) => handleChange('companyType', String(value))}
              options={[
                { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
                { value: 'partnership', label: 'Partnership' },
                { value: 'private_limited', label: 'Private Limited' },
                { value: 'other', label: 'Other' },
              ]}
              containerStyle={styles.halfInput}
            />
            <Select
              label="System Type"
              value={formData.systemType}
              onChange={(value) => handleChange('systemType', String(value))}
              options={[
                { value: 'milkTruck', label: 'Milk Truck System' },
                { value: 'cattleFeed', label: 'Retail Shop System (POS/Inventory)' },
              ]}
              containerStyle={styles.halfInput}
            />
          </View>
          {formData.systemType === 'cattleFeed' && (
            <Select
              label="Shop Category"
              value={formData.businessCategory}
              onChange={(value) => handleChange('businessCategory', String(value))}
              options={[
                { value: 'agro_cattle_feed', label: 'Agro / Cattle Feed' },
                { value: 'grocery', label: 'Grocery / Kirana' },
                { value: 'medical', label: 'Medical / Pharmacy' },
                { value: 'hardware', label: 'Hardware / Electronics' },
                { value: 'clothing', label: 'Clothing / Textile' },
                { value: 'other', label: 'Other' },
              ]}
            />
          )}
          <Input
            label="Address"
            value={formData.address}
            onChangeText={(value) => handleChange('address', value)}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents (Numbers)</Text>
          <View style={styles.formRow}>
            <Input
              label="PAN Card Number"
              value={formData.panCard}
              onChangeText={(value) => handleChange('panCard', value)}
              placeholder="ABCDE1234F"
              containerStyle={styles.halfInput}
            />
            <Input
              label="Aadhaar Card Number"
              value={formData.aadhaarCard}
              onChangeText={(value) => handleChange('aadhaarCard', value)}
              placeholder="12 digit number"
              keyboardType="numeric"
              maxLength={12}
              containerStyle={styles.halfInput}
            />
          </View>
          <View style={styles.formRow}>
            <Input
              label="Registration/Shop Act No."
              value={formData.registrationNumber}
              onChangeText={(value) => handleChange('registrationNumber', value)}
              containerStyle={styles.halfInput}
            />
            <Input
              label="GST Number (Optional)"
              value={formData.gstNumber}
              onChangeText={(value) => handleChange('gstNumber', value)}
              containerStyle={styles.halfInput}
            />
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Button
          variant="primary"
          onPress={handleSubmit}
          disabled={loading}
          style={styles.submitButton}
        >
          {loading ? 'Submitting...' : 'Register Company'}
        </Button>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.loginLink}
        >
          <Text style={styles.loginLinkText}>
            Already have an account? Login here
          </Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  formCard: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginLinkText: {
    color: '#2563eb',
    fontSize: 14,
  },
  successCard: {
    alignItems: 'center',
    padding: 32,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIconText: {
    fontSize: 32,
    color: '#059669',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  returnButton: {
    marginTop: 24,
  },
});

export default OwnerRegistration;
