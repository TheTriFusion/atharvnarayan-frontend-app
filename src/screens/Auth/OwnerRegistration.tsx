import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, StatusBar, Platform, KeyboardAvoidingView, Alert, Image as RNImage } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Select from '../../components/common/Select';
import ScreenHeader from '../../components/common/ScreenHeader';
import { useToast } from '../../contexts/ToastContext';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import API_BASE_URL from '../../config/api';

const OwnerRegistration: React.FC = () => {
  const navigation = useNavigation<any>();
  const { success, error: showError } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
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
    gstNumber: '',
    businessCategory: 'agro_cattle_feed',
  });

  // File States
  const [profileImage, setProfileImage] = useState<any>(null);
  const [panImage, setPanImage] = useState<any>(null);
  const [aadhaarFrontImage, setAadhaarFrontImage] = useState<any>(null);
  const [aadhaarBackImage, setAadhaarBackImage] = useState<any>(null);
  const [gstDocument, setGstDocument] = useState<any>(null);

  const [error, setError] = useState('');
  const [successState, setSuccessState] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    animateStep();
  }, [currentStep]);

  const animateStep = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const validateStep = () => {
    setError('');
    if (currentStep === 1) {
      if (!formData.name.trim()) return 'Please enter your full name';
      if (!formData.phoneNumber.trim() || formData.phoneNumber.length < 10) return 'Please enter a valid 10-digit phone number';
      if (!formData.password.trim() || formData.password.length < 6) return 'Password must be at least 6 characters';
    } else if (currentStep === 2) {
      if (!formData.companyName.trim()) return 'Company name is required';
    } else if (currentStep === 3) {
      if (!formData.panCard.trim()) return 'PAN Number is required';
      if (!panImage) return 'PAN Card image is required';
      if (!formData.aadhaarCard.trim()) return 'Aadhaar Number is required';
      if (!aadhaarFrontImage || !aadhaarBackImage) return 'Aadhaar Card images (both sides) are required';
    }
    return null;
  };

  const nextStep = () => {
    const stepError = validateStep();
    if (stepError) {
      setError(stepError);
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handlePickFile = (type: 'profile' | 'pan' | 'aadhaarFront' | 'aadhaarBack' | 'gst') => {
    if (type === 'gst') {
      DocumentPicker.pick({
        type: [DocumentPicker.types.pdf],
      }).then(res => {
        setGstDocument(res[0]);
      }).catch(err => {
        if (!DocumentPicker.isCancel(err)) {
          console.error(err);
        }
      });
      return;
    }

    Alert.alert(
      'Upload Image',
      'Capture photo or select from gallery',
      [
        {
          text: 'Camera',
          onPress: () => {
            launchCamera({ mediaType: 'photo', quality: 0.7 }, (response) => {
              if (response.assets && response.assets.length > 0) {
                const img = response.assets[0];
                if (type === 'profile') setProfileImage(img);
                else if (type === 'pan') setPanImage(img);
                else if (type === 'aadhaarFront') setAadhaarFrontImage(img);
                else if (type === 'aadhaarBack') setAadhaarBackImage(img);
              }
            });
          },
        },
        {
          text: 'Gallery',
          onPress: () => {
            launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, (response) => {
              if (response.assets && response.assets.length > 0) {
                const img = response.assets[0];
                if (type === 'profile') setProfileImage(img);
                else if (type === 'pan') setPanImage(img);
                else if (type === 'aadhaarFront') setAadhaarFrontImage(img);
                else if (type === 'aadhaarBack') setAadhaarBackImage(img);
              }
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSubmit = async () => {
    const stepError = validateStep();
    if (stepError) {
      setError(stepError);
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.keys(formData).forEach(key => {
        fd.append(key, (formData as any)[key]);
      });

      // Appending all files
      if (profileImage) {
        fd.append('image', {
          uri: profileImage.uri,
          type: profileImage.type || 'image/jpeg',
          name: profileImage.fileName || `profile_${Date.now()}.jpg`,
        } as any);
      }

      if (panImage) {
        fd.append('panImage', {
          uri: panImage.uri,
          type: panImage.type || 'image/jpeg',
          name: panImage.fileName || `pan_${Date.now()}.jpg`,
        } as any);
      }

      if (aadhaarFrontImage) {
        fd.append('aadhaarFrontImage', {
          uri: aadhaarFrontImage.uri,
          type: aadhaarFrontImage.type || 'image/jpeg',
          name: aadhaarFrontImage.fileName || `aadhaar_f_${Date.now()}.jpg`,
        } as any);
      }

      if (aadhaarBackImage) {
        fd.append('aadhaarBackImage', {
          uri: aadhaarBackImage.uri,
          type: aadhaarBackImage.type || 'image/jpeg',
          name: aadhaarBackImage.fileName || `aadhaar_b_${Date.now()}.jpg`,
        } as any);
      }

      if (gstDocument) {
        fd.append('gstDocument', {
          uri: gstDocument.uri,
          type: gstDocument.type || 'application/pdf',
          name: gstDocument.name || `gst_${Date.now()}.pdf`,
        } as any);
      }

      const response = await fetch(`${API_BASE_URL}/auth/register-owner`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: fd
      });

      const data = await response.json();
      if (data.success) {
        setSuccessState(true);
        success('Registration successful!');
      } else {
        setError(data.message || 'Registration failed');
        showError(data.message || 'Registration failed');
      }
    } catch (err: any) {
      console.error(err);
      setError('Network error. Please try again.');
      showError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (successState) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient
          colors={[colors.primary[600], colors.primary[400], colors.background.primary]}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.8 }}
        />
        <View style={styles.centerContent}>
          <Card style={styles.successCard}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Registration Successful!</Text>
            <Text style={styles.successText}>Your account is pending approval.</Text>
            <Text style={styles.successText}>We will notify you once approved.</Text>
            <Button variant="primary" onPress={() => navigation.navigate('Login')} style={styles.returnButton}>
              Return to Login
            </Button>
          </Card>
        </View>
      </View>
    );
  }

  const renderStepIndicator = () => (
    <View style={styles.stepperContainer}>
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <View style={[styles.stepCircle, currentStep >= step && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, currentStep >= step && styles.stepNumberActive]}>{step}</Text>
          </View>
          {step < 3 && <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );

  const renderImageUploader = (label: string, value: any, onPress: () => void, isPdf: boolean = false) => (
    <View style={styles.miniUploadSection}>
      <Text style={styles.miniLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.miniUploadBox, value && styles.miniUploadBoxActive]}
        onPress={onPress}
      >
        {value ? (
          isPdf ? (
            <View style={styles.pdfIndicator}>
              <Text style={styles.pdfEmoji}>📄</Text>
              <Text style={styles.pdfName} numberOfLines={1}>{value.name || 'PDF Selected'}</Text>
            </View>
          ) : (
            <RNImage source={{ uri: value.uri }} style={styles.miniPreview} />
          )
        ) : (
          <Text style={styles.miniPlaceholder}>{isPdf ? 'Select PDF' : 'Tap to Capture'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[colors.primary[600], colors.primary[400], colors.background.primary]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
      />
      <View style={styles.headerSpacer} />
      <ScreenHeader
        title="Partner Registration"
        subtitle={`Step ${currentStep} of 3: ${currentStep === 1 ? 'Personal' : currentStep === 2 ? 'Business' : 'Identity'}`}
        transparent
        showBackButton
        titleStyle={{ color: '#fff' }}
        subtitleStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {renderStepIndicator()}

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Card style={styles.formCard}>
              {currentStep === 1 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIcon}><Text>👤</Text></View>
                    <Text style={styles.sectionTitle}>Owner Information</Text>
                  </View>
                  <Input label="Full Name *" value={formData.name} onChangeText={(v) => handleChange('name', v)} placeholder="John Doe" required />
                  <View style={styles.formRow}>
                    <Input label="Phone Number *" value={formData.phoneNumber} onChangeText={(v) => handleChange('phoneNumber', v)} required keyboardType="phone-pad" maxLength={10} placeholder="10 digits" containerStyle={styles.halfInput} />
                    <Input label="Password *" value={formData.password} onChangeText={(v) => handleChange('password', v)} required secureTextEntry placeholder="Min 6 characters" containerStyle={styles.halfInput} />
                  </View>
                  <Input label="Email Address" value={formData.email} onChangeText={(v) => handleChange('email', v)} keyboardType="email-address" placeholder="john@example.com" />
                </View>
              )}

              {currentStep === 2 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIcon}><Text>🏢</Text></View>
                    <Text style={styles.sectionTitle}>Business Details</Text>
                  </View>
                  <Input label="Company Name *" value={formData.companyName} onChangeText={(v) => handleChange('companyName', v)} required placeholder="e.g. Atharv Enterprises" />
                  <View style={styles.formRow}>
                    <Select label="System Type" value={formData.systemType} onChange={(v) => handleChange('systemType', String(v))} options={[{ value: 'milkTruck', label: 'Milk Truck' }, { value: 'cattleFeed', label: 'Retail App' }, { value: 'cattleFeedTruck', label: 'Feed Truck' }]} containerStyle={styles.halfInput} />
                    <Select label="Ownership" value={formData.companyType} onChange={(v) => handleChange('companyType', String(v))} options={[{ value: 'sole_proprietorship', label: 'Individual' }, { value: 'partnership', label: 'Partnership' }, { value: 'private_limited', label: 'Private Ltd' }]} containerStyle={styles.halfInput} />
                  </View>
                  <Input label="Business Address" value={formData.address} onChangeText={(v) => handleChange('address', v)} multiline numberOfLines={3} placeholder="Complete address" />

                  <View style={styles.imageUploadSection}>
                    <Text style={styles.imageLabel}>Shop / Profile Image</Text>
                    <TouchableOpacity
                      style={[styles.imageUploadBox, profileImage && styles.imageUploadBoxActive]}
                      onPress={() => handlePickFile('profile')}
                    >
                      {profileImage ? (
                        <RNImage source={{ uri: profileImage.uri }} style={styles.previewImage} />
                      ) : (
                        <View style={styles.placeholderContainer}>
                          <View style={styles.cameraCircle}>
                            <Text style={styles.cameraEmoji}>📷</Text>
                          </View>
                          <Text style={styles.uploadText}>Upload Image</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {currentStep === 3 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIcon}><Text>📄</Text></View>
                    <Text style={styles.sectionTitle}>Identity Verification</Text>
                  </View>

                  <View style={styles.docRow}>
                    <View style={styles.docLeft}>
                      <Input label="PAN Card No. *" value={formData.panCard} onChangeText={(v) => handleChange('panCard', v.toUpperCase())} placeholder="ABCDE1234F" autoCapitalize="characters" />
                    </View>
                    <View style={styles.docRight}>
                      {renderImageUploader("PAN Image *", panImage, () => handlePickFile('pan'))}
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <Input label="Aadhaar Number *" value={formData.aadhaarCard} onChangeText={(v) => handleChange('aadhaarCard', v)} placeholder="12 digits" keyboardType="numeric" maxLength={12} />

                  <View style={styles.formRow}>
                    <View style={styles.halfInput}>
                      {renderImageUploader("Aadhaar Front *", aadhaarFrontImage, () => handlePickFile('aadhaarFront'))}
                    </View>
                    <View style={styles.halfInput}>
                      {renderImageUploader("Aadhaar Back *", aadhaarBackImage, () => handlePickFile('aadhaarBack'))}
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.docRow}>
                    <View style={styles.docLeft}>
                      <Input label="GSTIN (Optional)" value={formData.gstNumber} onChangeText={(v) => handleChange('gstNumber', v.toUpperCase())} placeholder="GST Number" />
                    </View>
                    <View style={styles.docRight}>
                      {renderImageUploader("GST Document", gstDocument, () => handlePickFile('gst'), true)}
                    </View>
                  </View>
                </View>
              )}

              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {error}</Text></View> : null}

              <View style={styles.buttonRow}>
                {currentStep > 1 && (
                  <Button variant="outline" onPress={prevStep} style={styles.navButton} disabled={loading}>Previous</Button>
                )}
                {currentStep < 3 ? (
                  <Button variant="primary" onPress={nextStep} style={styles.navButton}>Next Step</Button>
                ) : (
                  <Button variant="primary" onPress={handleSubmit} loading={loading} style={styles.navButton}>Register</Button>
                )}
              </View>

              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
                <Text style={styles.loginLinkText}>Already have an account? <Text style={styles.loginLinkBold}>Login</Text></Text>
              </TouchableOpacity>
            </Card>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  backgroundGradient: { position: 'absolute', left: 0, right: 0, top: 0, height: 400 },
  headerSpacer: { height: Platform.OS === 'ios' ? 40 : 20 },
  centerContent: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.md },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl, paddingHorizontal: spacing.xl },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  stepCircleActive: { backgroundColor: '#fff', borderColor: '#fff' },
  stepNumber: { fontSize: 14, fontWeight: 'bold', color: 'rgba(255,255,255,0.8)' },
  stepNumberActive: { color: colors.primary[600] },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },
  stepLineActive: { backgroundColor: '#fff' },
  formCard: { padding: spacing.lg, borderRadius: borderRadius.xl, backgroundColor: '#fff', ...shadows.xl },
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light, paddingBottom: spacing.sm },
  sectionIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary },
  formRow: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: spacing.lg },
  navButton: { flex: 1, borderRadius: borderRadius.full },
  errorBox: { backgroundColor: '#fff1f2', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: '#fda4af' },
  errorText: { color: '#e11d48', fontSize: 14, fontWeight: '500' },
  loginLink: { alignItems: 'center', marginTop: spacing.xl },
  loginLinkText: { color: colors.text.secondary, fontSize: 14 },
  loginLinkBold: { color: colors.primary[600], fontWeight: 'bold' },
  successCard: { alignItems: 'center', padding: spacing.xl, borderRadius: borderRadius.xl * 1.5, backgroundColor: '#fff', ...shadows.xl },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success[50], justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl, borderWidth: 6, borderColor: '#fff', ...shadows.md },
  successIconText: { fontSize: 40, color: colors.success[600], fontWeight: 'bold' },
  successTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.md },
  successText: { fontSize: 15, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.sm, lineHeight: 22 },
  returnButton: { marginTop: spacing.xl, width: '100%', borderRadius: borderRadius.full },
  imageUploadSection: { marginTop: spacing.md },
  imageLabel: { fontSize: 12, fontWeight: 'bold', color: colors.text.secondary, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  imageUploadBox: { height: 160, borderRadius: borderRadius.lg, borderStyle: 'dotted', borderWidth: 2, borderColor: colors.border.light, backgroundColor: colors.background.tertiary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imageUploadBoxActive: { borderStyle: 'solid', borderColor: colors.primary[400] },
  previewImage: { width: '100%', height: '100%' },
  placeholderContainer: { alignItems: 'center' },
  cameraCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  cameraEmoji: { fontSize: 24 },
  uploadText: { fontSize: 14, fontWeight: 'bold', color: colors.primary[600] },

  // New Styles
  docRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 },
  docLeft: { flex: 2 },
  docRight: { flex: 1 },
  miniUploadSection: { marginBottom: 10 },
  miniLabel: { fontSize: 10, fontWeight: 'bold', color: colors.text.tertiary, marginBottom: 4, textTransform: 'uppercase' },
  miniUploadBox: { height: 70, backgroundColor: colors.background.tertiary, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border.light, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  miniUploadBoxActive: { borderStyle: 'solid', borderColor: colors.primary[400] },
  miniPlaceholder: { fontSize: 10, color: colors.text.tertiary, textAlign: 'center' },
  miniPreview: { width: '100%', height: '100%' },
  pdfIndicator: { alignItems: 'center', padding: 4 },
  pdfEmoji: { fontSize: 20 },
  pdfName: { fontSize: 8, color: colors.primary[700], marginTop: 2, textAlign: 'center' },
  divider: { height: 1, backgroundColor: colors.border.light, marginVertical: 15 },
});

export default OwnerRegistration;

