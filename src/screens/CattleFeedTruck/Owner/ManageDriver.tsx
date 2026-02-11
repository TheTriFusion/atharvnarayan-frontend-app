import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Animated, StatusBar, Platform, KeyboardAvoidingView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

const ManageDriver: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = useAuth();
    const toast = useToast();
    const editingDriver = route.params?.driver;

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: editingDriver?.name || '',
        phoneNumber: editingDriver?.phoneNumber || '',
        licenseNumber: editingDriver?.licenseNumber || '',
        address: editingDriver?.address || '',
        password: '',
    });

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
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

    const handleSubmit = async () => {
        try {
            if (!formData.name.trim()) {
                toast.error('Name is required');
                return;
            }
            if (!formData.phoneNumber.trim()) {
                toast.error('Phone number is required');
                return;
            }

            setLoading(true);
            const normalizedPhone = formData.phoneNumber.replace(/\D/g, '');

            if (editingDriver) {
                const updateData: any = {
                    name: formData.name.trim(),
                    phoneNumber: normalizedPhone,
                    ownerId: user?.id,
                };

                if (formData.licenseNumber.trim()) updateData.licenseNumber = formData.licenseNumber.trim();
                if (formData.address.trim()) updateData.address = formData.address.trim();
                if (formData.password && formData.password.trim()) updateData.password = formData.password.trim();

                await cattleFeedTruckAPI.updateDriver(editingDriver._id, updateData);
                toast.success('Driver updated successfully!');
            } else {
                const data = {
                    name: formData.name.trim(),
                    phoneNumber: normalizedPhone,
                    licenseNumber: formData.licenseNumber.trim() || undefined,
                    address: formData.address.trim() || undefined,
                    role: 'cattleFeedTruckDriver',
                    systemType: 'cattleFeedTruck',
                    ownerId: user?.id,
                    password: formData.password.trim() || normalizedPhone,
                };
                await cattleFeedTruckAPI.createDriver(data);
                toast.success('Driver created successfully!');
            }
            navigation.goBack();
        } catch (error: any) {
            console.error('Error saving driver:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to save driver';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

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
                title={editingDriver ? 'Edit Driver' : 'Add New Driver'}
                subtitle={editingDriver ? 'Update driver credentials' : 'Add a driver to your fleet'}
                transparent
                showBackButton
                titleStyle={{ color: '#fff' }}
                subtitleStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.avatarSection}>
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarText}>
                                    {formData.name ? formData.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : '👤'}
                                </Text>
                            </View>
                            <Text style={styles.avatarHint}>Driver Profiles</Text>
                        </View>

                        <View style={styles.form}>
                            <Input
                                label="Full Name"
                                value={formData.name}
                                onChangeText={(text) => setFormData({ ...formData, name: text })}
                                placeholder="Externally John Doe"
                                required
                            />
                            <Input
                                label="Phone Number"
                                value={formData.phoneNumber}
                                onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                                keyboardType="phone-pad"
                                placeholder="+91 00000 00000"
                                required
                            />
                            <Input
                                label="License Number"
                                value={formData.licenseNumber}
                                onChangeText={(text) => setFormData({ ...formData, licenseNumber: text })}
                                placeholder="DL-0000000000"
                            />
                            <Input
                                label="Address"
                                value={formData.address}
                                onChangeText={(text) => setFormData({ ...formData, address: text })}
                                placeholder="Driver's residential address"
                                multiline
                            />
                            <Input
                                label={editingDriver ? 'Update Password' : 'Password'}
                                value={formData.password}
                                onChangeText={(text) => setFormData({ ...formData, password: text })}
                                secureTextEntry
                                placeholder={editingDriver ? 'Leave blank to keep current' : 'Enter login password'}
                            />

                            {editingDriver && (
                                <View style={styles.infoBox}>
                                    <Text style={styles.infoText}>
                                        Note: Leave the password field empty if you don't wish to change the driver's current login password.
                                    </Text>
                                </View>
                            )}

                            <View style={styles.footer}>
                                <Button
                                    onPress={handleSubmit}
                                    style={styles.submitBtn}
                                    loading={loading}
                                >
                                    {editingDriver ? 'Update Driver Profile' : 'Register New Driver'}
                                </Button>
                                <TouchableOpacity
                                    style={styles.cancelLink}
                                    onPress={() => navigation.goBack()}
                                >
                                    <Text style={styles.cancelLinkText}>Discard Changes</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
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
    scrollContent: {
        padding: spacing.md,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: borderRadius.xl || 24,
        padding: spacing.lg,
        ...shadows.xl,
        marginTop: spacing.sm,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
        borderWidth: 4,
        borderColor: '#fff',
        ...shadows.md,
    },
    avatarText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.primary[600],
    },
    avatarHint: {
        fontSize: 12,
        color: colors.text.tertiary,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    form: {
        gap: spacing.sm,
    },
    infoBox: {
        backgroundColor: colors.primary[50],
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginTop: spacing.xs,
    },
    infoText: {
        fontSize: 12,
        color: colors.primary[700],
        lineHeight: 18,
    },
    footer: {
        marginTop: spacing.xl,
        gap: spacing.md,
    },
    submitBtn: {
        paddingVertical: 14,
    },
    cancelLink: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    cancelLinkText: {
        color: colors.text.tertiary,
        fontWeight: '600',
        fontSize: 14,
    },
});

export default ManageDriver;
