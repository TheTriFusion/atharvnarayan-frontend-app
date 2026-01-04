import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

const Login: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigation = useNavigation<any>();

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    if (!phoneNumber || !password) {
      setError('Please enter both phone number and password');
      setLoading(false);
      return;
    }

    try {
      const result = await login(phoneNumber, password);

      if (result.success) {
        // Navigate based on role
        const userRole = result.user?.role;
        if (userRole === 'superadmin') {
          navigation.navigate('SuperAdminDashboard');
        } else if (userRole === 'cattleFeedOwner') {
          navigation.navigate('CattleFeedOwnerDashboard');
        } else if (userRole === 'cattleFeedSeller') {
          navigation.navigate('CattleFeedSellerSales');
        } else if (userRole === 'milkTruckOwner') {
          navigation.navigate('MilkTruckOwnerDashboard');
        } else if (userRole === 'milkTruckDriver') {
          navigation.navigate('MilkTruckDriverDashboard');
        } else if (userRole === 'cattleFeedTruckOwner') {
          navigation.navigate('CattleFeedTruckOwnerDashboard');
        } else if (userRole === 'cattleFeedTruckDriver') {
          navigation.navigate('CattleFeedTruckDriverDashboard');
        } else {
          navigation.navigate('Login');
        }
      } else {
        setError(result.message || 'Invalid phone number or password');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.languageContainer}>
        <LanguageSwitcher />
      </View>

      {/* Login Card */}
      <Card style={styles.loginCard}>
        <Text style={styles.title}>Atharvnarayana</Text>
        <Text style={styles.subtitle}>{t('login.title')}</Text>

        <Text style={styles.description}>
          👤 Login as Owner, Driver, or Seller
        </Text>

        <Input
          label={t('forms.phone')}
          value={phoneNumber}
          onChangeText={(text) => {
            setPhoneNumber(text);
            setError('');
          }}
          placeholder={t('login.enterPhone')}
          keyboardType="phone-pad"
          editable={!loading}
        />

        <Input
          label={t('forms.password')}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError('');
          }}
          placeholder={t('login.enterPassword')}
          secureTextEntry
          editable={!loading}
        />

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Button
          onPress={handleSubmit}
          variant="primary"
          disabled={loading}
          loading={loading}
          style={styles.loginButton}
        >
          {loading ? t('login.loggingIn') : t('login.login')}
        </Button>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>
            New Partner?{' '}
            <Text
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')}
            >
              Register your company here
            </Text>
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  contentContainer: {
    padding: 16,
    paddingTop: 40,
  },
  languageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  loginCard: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    color: '#4b5563',
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  loginButton: {
    marginTop: 8,
  },
  registerContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#4b5563',
  },
  registerLink: {
    color: '#2563eb',
    fontWeight: '500',
  },
});

export default Login;

