import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Animated, StatusBar, Platform, KeyboardAvoidingView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';

const ManageVehicle: React.FC = () => {
    const { user } = useAuth();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const toast = useToast();
    const editingVehicle = route.params?.vehicle;

    const [loading, setLoading] = useState(false);
    const [fetchingDrivers, setFetchingDrivers] = useState(true);
    const [drivers, setDrivers] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        registrationNumber: editingVehicle?.registrationNumber || '',
        vehicleType: editingVehicle?.vehicleType || '',
        capacity: editingVehicle?.capacity?.toString() || '',
        assignedDriver: editingVehicle?.assignedDriver || '',
    });

    const vehicleTypeOptions = [
        { label: 'Select Type', value: '' },
        { label: 'Mini Truck', value: 'mini_truck' },
        { label: 'Pickup', value: 'pickup' },
        { label: 'Truck (6 Wheeler)', value: 'truck_6w' },
        { label: 'Truck (10 Wheeler)', value: 'truck_10w' },
        { label: 'Other', value: 'other' },
    ];

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        fetchDrivers();
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

    const fetchDrivers = async () => {
        try {
            const response = await cattleFeedTruckAPI.getDrivers(user?.id);
            const data = Array.isArray(response) ? response : (Array.isArray(response.data) ? response.data : []);
            setDrivers(data);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        } finally {
            setFetchingDrivers(false);
        }
    };

    const handleSubmit = async () => {
        try {
            if (!formData.registrationNumber.trim()) {
                toast.error('Registration number is required');
                return;
            }

            setLoading(true);
            const vehicleData = {
                registrationNumber: formData.registrationNumber.trim().toUpperCase(),
                vehicleType: formData.vehicleType,
                capacity: parseFloat(formData.capacity) || 0,
                assignedDriver: formData.assignedDriver || null,
            };

            if (editingVehicle) {
                await cattleFeedTruckAPI.updateVehicle(editingVehicle._id, vehicleData);
                toast.success('Vehicle updated successfully!');
            } else {
                await cattleFeedTruckAPI.createVehicle(vehicleData);
                toast.success('Vehicle created successfully!');
            }
            navigation.goBack();
        } catch (error: any) {
            console.error('Error saving vehicle:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to save vehicle');
        } finally {
            setLoading(false);
        }
    };

    const driverOptions = [
        { label: 'Unassigned', value: '' },
        ...drivers.map(d => ({ label: d.name, value: d._id }))
    ];

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
                title={editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                subtitle={editingVehicle ? 'Update vehicle specifications' : 'Register a new vehicle to your fleet'}
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
                        <View style={styles.iconSection}>
                            <View style={styles.iconCircle}>
                                <Text style={styles.iconEmoji}>🚛</Text>
                            </View>
                            <Text style={styles.iconHint}>Fleet Assets</Text>
                        </View>

                        <View style={styles.form}>
                            <Input
                                label="Registration Number"
                                value={formData.registrationNumber}
                                onChangeText={(text) => setFormData({ ...formData, registrationNumber: text })}
                                placeholder="e.g. MH-12-AB-1234"
                                required
                            />

                            <Select
                                label="Vehicle Type"
                                value={formData.vehicleType}
                                options={vehicleTypeOptions}
                                onChange={(value) => setFormData({ ...formData, vehicleType: value as string })}
                                placeholder="Select vehicle type"
                            />

                            <Input
                                label="Capacity (in tons)"
                                value={formData.capacity}
                                onChangeText={(text) => setFormData({ ...formData, capacity: text })}
                                keyboardType="numeric"
                                placeholder="e.g. 10"
                            />

                            <Select
                                label="Assigned Driver"
                                value={formData.assignedDriver}
                                options={driverOptions}
                                onChange={(value) => setFormData({ ...formData, assignedDriver: value as string })}
                                placeholder={fetchingDrivers ? "Loading drivers..." : "Select driver"}
                            />

                            <View style={styles.footer}>
                                <Button
                                    onPress={handleSubmit}
                                    style={styles.submitBtn}
                                    loading={loading}
                                >
                                    {editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
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
    iconSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    iconCircle: {
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
    iconEmoji: {
        fontSize: 32,
    },
    iconHint: {
        fontSize: 12,
        color: colors.text.tertiary,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    form: {
        gap: spacing.sm,
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

export default ManageVehicle;
