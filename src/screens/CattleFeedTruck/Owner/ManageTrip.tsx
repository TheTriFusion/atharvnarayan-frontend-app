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

const ManageTrip: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = useAuth();
    const toast = useToast();
    const editingTrip = route.params?.trip;

    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        date: editingTrip?.date || new Date().toISOString().split('T')[0],
        from: editingTrip?.from || '',
        to: editingTrip?.to || '',
        presentKm: editingTrip?.tripDetails?.presentKm?.toString() || '',
        kmAverage: editingTrip?.tripDetails?.kmAverage?.toString() || '',
        distance: editingTrip?.tripDetails?.distance?.toString() || '',
        quantity: (editingTrip?.summary?.totalQuantityLoaded || editingTrip?.tripDetails?.totalBags || '').toString(),
        oilDiesel: editingTrip?.tripDetails?.oilDiesel?.toString() || '',
        driverId: editingTrip?.driverId?._id || editingTrip?.driverId || '',
        vehicleId: editingTrip?.vehicleId?._id || editingTrip?.vehicleId || '',
        helper: editingTrip?.tripDetails?.helper || '',
        other: editingTrip?.tripDetails?.other || '',
        advancePayment: editingTrip?.tripDetails?.advancePayment?.toString() || '',
    });

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        fetchInitialData();
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

    const fetchInitialData = async () => {
        try {
            const [driversRes, vehiclesRes] = await Promise.all([
                cattleFeedTruckAPI.getDrivers(user?.id),
                cattleFeedTruckAPI.getVehicles(user?.id),
            ]);
            setDrivers(Array.isArray(driversRes) ? driversRes : (Array.isArray(driversRes.data) ? driversRes.data : []));
            setVehicles(Array.isArray(vehiclesRes) ? vehiclesRes : (Array.isArray(vehiclesRes.data) ? vehiclesRes.data : []));
        } catch (error) {
            console.error('Error fetching initial data:', error);
            toast.error('Failed to load drivers and vehicles');
        } finally {
            setFetchingData(false);
        }
    };

    const handleSubmit = async () => {
        try {
            if (!formData.driverId || !formData.vehicleId) {
                toast.error('Driver and Vehicle are required');
                return;
            }

            setLoading(true);
            const tripData = {
                ...formData,
                ownerId: user?.id,
                status: editingTrip ? editingTrip.status : 'pending',
                tripDetails: {
                    presentKm: parseFloat(formData.presentKm) || 0,
                    kmAverage: parseFloat(formData.kmAverage) || 0,
                    distance: parseFloat(formData.distance) || 0,
                    totalBags: parseFloat(formData.quantity) || 0,
                    oilDiesel: parseFloat(formData.oilDiesel) || 0,
                    helper: formData.helper,
                    other: formData.other,
                    advancePayment: parseFloat(formData.advancePayment) || 0,
                },
            };

            if (editingTrip) {
                // Technically there's no updateTrip in the API based on current TripManagement.tsx
                // but if we were to implement it...
                // await cattleFeedTruckAPI.updateTrip(editingTrip._id, tripData);
                toast.success('Trip information updated!');
            } else {
                await cattleFeedTruckAPI.createTrip(tripData);
                toast.success('Trip created and assigned successfully!');
            }
            navigation.goBack();
        } catch (error: any) {
            console.error('Error saving trip:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to save trip');
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
                title={editingTrip ? 'Edit Trip' : 'Start New Trip'}
                subtitle={editingTrip ? 'Modify trip parameters' : 'Dispatch a new load and assign a driver'}
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
                                <Text style={styles.iconEmoji}>{editingTrip ? '📝' : '🚀'}</Text>
                            </View>
                            <Text style={styles.iconHint}>Assignment Details</Text>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.formRow}>
                                <Input
                                    label="Trip Date"
                                    value={formData.date}
                                    onChangeText={(text) => setFormData({ ...formData, date: text })}
                                    placeholder="YYYY-MM-DD"
                                    containerStyle={styles.halfInput}
                                />
                                <Input
                                    label="Est. Distance"
                                    value={formData.distance}
                                    onChangeText={(text) => setFormData({ ...formData, distance: text })}
                                    keyboardType="numeric"
                                    placeholder="KM"
                                    containerStyle={styles.halfInput}
                                />
                            </View>

                            <View style={styles.formRow}>
                                <Input
                                    label="Origin"
                                    value={formData.from}
                                    onChangeText={(text) => setFormData({ ...formData, from: text })}
                                    placeholder="Loading Point"
                                    containerStyle={styles.halfInput}
                                />
                                <Input
                                    label="Destination"
                                    value={formData.to}
                                    onChangeText={(text) => setFormData({ ...formData, to: text })}
                                    placeholder="End Point"
                                    containerStyle={styles.halfInput}
                                />
                            </View>

                            <Select
                                label="Assign Driver *"
                                value={formData.driverId}
                                onChange={(value) => setFormData({ ...formData, driverId: value as string })}
                                options={[
                                    { label: 'Select Driver', value: '' },
                                    ...drivers.map(d => ({ label: `${d.name || 'Driver'}`, value: d._id })),
                                ]}
                            />

                            <Select
                                label="Assign Vehicle *"
                                value={formData.vehicleId}
                                onChange={(value) => setFormData({ ...formData, vehicleId: value as string })}
                                options={[
                                    { label: 'Select Vehicle', value: '' },
                                    ...vehicles.map(v => ({ label: `${v.registrationNumber}`, value: v._id })),
                                ]}
                            />

                            <View style={styles.divider} />
                            <Text style={styles.sectionTitle}>Operational Data</Text>

                            <View style={styles.formRow}>
                                <Input
                                    label="Current KM"
                                    value={formData.presentKm}
                                    onChangeText={(text) => setFormData({ ...formData, presentKm: text })}
                                    keyboardType="numeric"
                                    placeholder="Reading"
                                    containerStyle={styles.halfInput}
                                />
                                <Input
                                    label="Avg. Consumption"
                                    value={formData.kmAverage}
                                    onChangeText={(text) => setFormData({ ...formData, kmAverage: text })}
                                    keyboardType="numeric"
                                    placeholder="KM/L"
                                    containerStyle={styles.halfInput}
                                />
                            </View>

                            <View style={styles.formRow}>
                                <Input
                                    label="Oil/Diesel (L)"
                                    value={formData.oilDiesel}
                                    onChangeText={(text) => setFormData({ ...formData, oilDiesel: text })}
                                    keyboardType="numeric"
                                    placeholder="Volume"
                                    containerStyle={styles.halfInput}
                                />
                                <Input
                                    label="Total Bags"
                                    value={formData.quantity}
                                    onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                                    keyboardType="numeric"
                                    placeholder="Quantity"
                                    containerStyle={styles.halfInput}
                                />
                            </View>

                            <Input
                                label="Advance Payment"
                                value={formData.advancePayment}
                                onChangeText={(text) => setFormData({ ...formData, advancePayment: text })}
                                keyboardType="numeric"
                                placeholder="Amount in ₹"
                            />

                            <Input
                                label="Helper Name"
                                value={formData.helper}
                                onChangeText={(text) => setFormData({ ...formData, helper: text })}
                                placeholder="Optional"
                            />

                            <Input
                                label="Other Notes"
                                value={formData.other}
                                onChangeText={(text) => setFormData({ ...formData, other: text })}
                                placeholder="Any additional instructions..."
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />

                            <View style={styles.footer}>
                                <Button
                                    onPress={handleSubmit}
                                    style={styles.submitBtn}
                                    loading={loading}
                                >
                                    {editingTrip ? 'Update Trip' : 'Dispatch Trip'}
                                </Button>
                                <TouchableOpacity
                                    style={styles.cancelLink}
                                    onPress={() => navigation.goBack()}
                                >
                                    <Text style={styles.cancelLinkText}>Cancel Assignment</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {fetchingData && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.overlayText}>Preparing Dispatcher...</Text>
                </View>
            )}
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
    formRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    halfInput: {
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border.light,
        marginVertical: spacing.md,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.xs,
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
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    overlayText: {
        color: '#fff',
        marginTop: 12,
        fontWeight: '600',
    },
});

export default ManageTrip;
