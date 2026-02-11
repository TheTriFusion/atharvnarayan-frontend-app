import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import { colors } from '../../theme/colors';

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
      // Normalize phone number (keep only digits)
      const normalizedPhone = phoneNumber.replace(/\D/g, '');
      const result = await login(normalizedPhone, password);

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

          {/* Refined gradient background - Blue to White */}
          <LinearGradient
            colors={[colors.primary[600], colors.primary[400], colors.background.primary]}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.8 }}
          />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Language Switcher */}
            <View style={styles.languageContainer}>
              <LanguageSwitcher />
            </View>

            {/* Main Content */}
            <View style={styles.contentWrapper}>
              {/* Title */}
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Atharvnarayana</Text>
                <View style={styles.titleUnderline} />
              </View>

              <Text style={styles.subtitle}>{t('login.title')}</Text>

              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>👤 Login as Owner, Driver, or Seller</Text>
              </View>

              {/* Combined Input Card */}
              <View style={styles.inputWrapper}>
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
                  containerStyle={styles.inputContainerStyle}
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
                  containerStyle={styles.inputContainerStyleLast}
                />
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Login Button - Blue Text on White */}
              <View style={styles.buttonWrapper}>
                <Button
                  onPress={handleSubmit}
                  variant="primary"
                  disabled={loading}
                  loading={loading}
                  style={styles.loginButton}
                  textStyle={styles.loginButtonText}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </View>

              {/* Register Link */}
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
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  languageContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.primary[900],
    letterSpacing: 1,
  },
  titleUnderline: {
    width: 60,
    height: 4,
    backgroundColor: colors.primary[500],
    borderRadius: 2,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
    color: colors.primary[700],
  },
  roleBadge: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 32,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.primary[100],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roleText: {
    fontSize: 14,
    color: colors.primary[600],
    textAlign: 'center',
    fontWeight: '500',
  },
  inputWrapper: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  inputContainerStyle: {
    marginBottom: 16,
  },
  inputContainerStyleLast: {
    marginBottom: 0,
  },
  errorContainer: {
    padding: 14,
    backgroundColor: colors.error[100],
    borderWidth: 1,
    borderColor: colors.error[300],
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.error[600],
  },
  errorText: {
    color: colors.error[700],
    fontSize: 14,
    fontWeight: '500',
  },
  buttonWrapper: {
    marginTop: 8,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.primary[100],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  loginButtonText: {
    color: colors.primary[600],
    fontWeight: '700',
  },
  registerContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  registerLink: {
    color: colors.primary[600],
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default Login;

