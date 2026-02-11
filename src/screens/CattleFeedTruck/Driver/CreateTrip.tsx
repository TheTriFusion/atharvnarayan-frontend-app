import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import Modal from '../../../components/common/Modal';

const { width } = Dimensions.get('window');

const CreateTrip: React.FC = () => {
    const navigation = useNavigation<any>();
    const [step, setStep] = useState(1);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Data State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        from: '',
        to: '',
        vehicleId: '',
        startKm: '',
        average: '',
        distance: '',
        oil: '',
        diesel: '',
        helperName: '',
        advance: '',
    });

    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [newDelivery, setNewDelivery] = useState({
        location: '',
        bags: '',
        feedType: 'Cattle Feed',
        receiverName: '',
        receiverPhone: ''
    });

    useEffect(() => {
        fetchVehicles();
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const response = await cattleFeedTruckAPI.getVehicles();
            if (Array.isArray(response)) {
                setVehicles(response);
            } else if (response && response.data && Array.isArray(response.data)) {
                setVehicles(response.data);
            }
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        } finally {
            setLoading(false);
        }
    };

    const validateStep = () => {
        if (step === 1) {
            if (!formData.from || !formData.to || !formData.vehicleId) {
                Alert.alert('Required', 'Please fill in From, To and Vehicle');
                return false;
            }
        } else if (step === 2) {
            if (!formData.startKm) {
                Alert.alert('Required', 'Please enter Start KM Reading');
                return false;
            }
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep()) {
            setStep(s => s + 1);
            slideAnim.setValue(width);
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 20,
                friction: 7,
            }).start();
        }
    };

    const prevStep = () => {
        setStep(s => s - 1);
        slideAnim.setValue(-width);
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 20,
            friction: 7,
        }).start();
    };

    const addDelivery = () => {
        if (!newDelivery.location || !newDelivery.bags) {
            Alert.alert('Required', 'Location and Bags are required');
            return;
        }
        setDeliveries([...deliveries, { ...newDelivery }]);
        setNewDelivery({
            location: '',
            bags: '',
            feedType: 'Cattle Feed',
            receiverName: '',
            receiverPhone: ''
        });
    };

    const removeDelivery = (index: number) => {
        const updated = [...deliveries];
        updated.splice(index, 1);
        setDeliveries(updated);
    };

    const handleCreateTrip = async () => {
        try {
            setLoading(true);
            const validDeliveries = deliveries.map(d => ({
                location: d.location,
                receiverName: d.receiverName || undefined,
                receiverPhone: d.receiverPhone || undefined,
                plannedDelivery: {
                    feedItems: [{
                        feedType: d.feedType,
                        quantity: Number(d.bags),
                        unit: 'bags'
                    }]
                }
            }));

            const payload = {
                ...formData,
                deliveryEntries: validDeliveries,
                totalBags: deliveries.reduce((sum, d) => sum + Number(d.bags), 0),
                status: 'in_transit',
                startTime: new Date()
            };

            await cattleFeedTruckAPI.createTrip(payload);
            setShowSuccessModal(true);
        } catch (error: any) {
            console.error('Error creating trip:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to start trip');
        } finally {
            setLoading(false);
        }
    };

    const renderStepIndicators = () => {
        return (
            <View style={styles.stepperContainer}>
                {[1, 2, 3, 4].map((s) => (
                    <React.Fragment key={s}>
                        <View style={styles.stepItem}>
                            <View style={[
                                styles.stepCircle,
                                s <= step ? styles.stepActive : styles.stepInactive,
                                s < step && styles.stepCompleted
                            ]}>
                                {s < step ? (
                                    <Text style={styles.stepCheck}>✓</Text>
                                ) : (
                                    <Text style={[styles.stepNumber, s === step && styles.textWhite]}>{s}</Text>
                                )}
                            </View>
                        </View>
                        {s < 4 && (
                            <View style={[
                                styles.stepLine,
                                { backgroundColor: s < step ? colors.primary[500] : colors.border.light }
                            ]} />
                        )}
                    </React.Fragment>
                ))}
            </View>
        );
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <Animated.View style={[styles.stepWrapper, { transform: [{ translateX: slideAnim }] }]}>
                        <View style={styles.stepInfoContainer}>
                            <Text style={styles.stepTitle}>Basics</Text>
                            <Text style={styles.stepSubtitle}>Whose vehicle and where to?</Text>
                        </View>

                        <Select
                            label="Vehicle"
                            value={formData.vehicleId}
                            onChange={v => setFormData({ ...formData, vehicleId: v as string })}
                            options={[
                                { label: loading ? 'Loading...' : 'Select Vehicle', value: '' },
                                ...vehicles.map(v => ({
                                    label: `${v.registrationNumber} ${v.vehicleType ? `(${v.vehicleType})` : ''}`,
                                    value: v._id
                                }))
                            ]}
                        />

                        <Input
                            label="Route Start"
                            value={formData.from}
                            onChangeText={t => setFormData({ ...formData, from: t })}
                            placeholder="Current Warehouse / Point"
                        />

                        <Input
                            label="Route End"
                            value={formData.to}
                            onChangeText={t => setFormData({ ...formData, to: t })}
                            placeholder="Final Destination / Shop"
                        />

                        <Input
                            label="Trip Date"
                            value={formData.date}
                            onChangeText={t => setFormData({ ...formData, date: t })}
                            placeholder="YYYY-MM-DD"
                        />
                    </Animated.View>
                );
            case 2:
                return (
                    <Animated.View style={[styles.stepWrapper, { transform: [{ translateX: slideAnim }] }]}>
                        <View style={styles.stepInfoContainer}>
                            <Text style={styles.stepTitle}>Metrics</Text>
                            <Text style={styles.stepSubtitle}>Technical data of the trip</Text>
                        </View>

                        <View style={styles.row}>
                            <Input
                                label="Start KM"
                                value={formData.startKm}
                                onChangeText={t => setFormData({ ...formData, startKm: t })}
                                keyboardType="numeric"
                                containerStyle={styles.halfInput}
                            />
                            <Input
                                label="Avg KMPL"
                                value={formData.average}
                                onChangeText={t => setFormData({ ...formData, average: t })}
                                keyboardType="numeric"
                                containerStyle={styles.halfInput}
                            />
                        </View>

                        <View style={styles.row}>
                            <Input
                                label="Oil (L)"
                                value={formData.oil}
                                onChangeText={t => setFormData({ ...formData, oil: t })}
                                keyboardType="numeric"
                                containerStyle={styles.halfInput}
                            />
                            <Input
                                label="Diesel (L)"
                                value={formData.diesel}
                                onChangeText={t => setFormData({ ...formData, diesel: t })}
                                keyboardType="numeric"
                                containerStyle={styles.halfInput}
                            />
                        </View>

                        <Input
                            label="Advance (₹)"
                            value={formData.advance}
                            onChangeText={t => setFormData({ ...formData, advance: t })}
                            keyboardType="numeric"
                        />

                        <Input
                            label="Helper"
                            value={formData.helperName}
                            onChangeText={t => setFormData({ ...formData, helperName: t })}
                        />
                    </Animated.View>
                );
            case 3:
                return (
                    <Animated.View style={[styles.stepWrapper, { transform: [{ translateX: slideAnim }] }]}>
                        <View style={styles.stepInfoContainer}>
                            <Text style={styles.stepTitle}>Plan</Text>
                            <Text style={styles.stepSubtitle}>Add planned delivery points</Text>
                        </View>

                        <Card style={styles.addStopCard}>
                            <Text style={styles.cardHeader}>ADD NEW STOP</Text>
                            <Input
                                placeholder="Where to drop?"
                                value={newDelivery.location}
                                onChangeText={t => setNewDelivery({ ...newDelivery, location: t })}
                            />
                            <View style={styles.row}>
                                <Input
                                    placeholder="Bags"
                                    value={newDelivery.bags}
                                    onChangeText={t => setNewDelivery({ ...newDelivery, bags: t })}
                                    keyboardType="numeric"
                                    containerStyle={[styles.halfInput, { flex: 0.4 }]}
                                />
                                <Select
                                    label=""
                                    value={newDelivery.feedType}
                                    onChange={v => setNewDelivery({ ...newDelivery, feedType: v as string })}
                                    options={['Cattle Feed', 'Poultry Feed', 'Supplements'].map(f => ({ label: f, value: f }))}
                                    containerStyle={{ flex: 0.6, marginTop: 4 }}
                                />
                            </View>
                            <Button
                                onPress={addDelivery}
                                variant="secondary"
                                style={{ marginTop: spacing.sm }}
                            >
                                + ADD TO LIST
                            </Button>
                        </Card>

                        <Text style={styles.listHeader}>STOPS ({deliveries.length})</Text>
                        {deliveries.map((d, i) => (
                            <View key={i} style={styles.stopCard}>
                                <View style={styles.stopInfo}>
                                    <Text style={styles.stopLoc}>{d.location}</Text>
                                    <View style={styles.stopMeta}>
                                        <View style={styles.metaChip}><Text style={styles.metaText}>📦 {d.bags}</Text></View>
                                        <View style={styles.metaChip}><Text style={styles.metaText}>✨ {d.feedType}</Text></View>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => removeDelivery(i)} style={styles.removeBtn}>
                                    <Text style={styles.removeText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                        {deliveries.length === 0 && (
                            <View style={styles.emptyStops}>
                                <Text style={styles.emptyStopsText}>No stops added. Add at least one.</Text>
                            </View>
                        )}
                    </Animated.View>
                );
            case 4:
                const vehicle = vehicles.find(v => v._id === formData.vehicleId);
                const totalBags = deliveries.reduce((sum, d) => sum + Number(d.bags), 0);
                return (
                    <Animated.View style={[styles.stepWrapper, { transform: [{ translateX: slideAnim }] }]}>
                        <View style={styles.stepInfoContainer}>
                            <Text style={styles.stepTitle}>Verify</Text>
                            <Text style={styles.stepSubtitle}>Check everything before takeoff</Text>
                        </View>

                        <Card style={styles.reviewCard}>
                            <View style={styles.reviewMainItem}>
                                <Text style={styles.reviewMainVal}>{formData.from} → {formData.to}</Text>
                                <Text style={styles.reviewMainLabel}>ROUTE</Text>
                            </View>

                            <View style={styles.reviewGrid}>
                                <View style={styles.reviewChild}>
                                    <Text style={styles.reviewLabel}>VEHICLE</Text>
                                    <Text style={styles.reviewValue}>{vehicle?.registrationNumber || 'N/A'}</Text>
                                </View>
                                <View style={styles.reviewChild}>
                                    <Text style={styles.reviewLabel}>METER</Text>
                                    <Text style={styles.reviewValue}>{formData.startKm} KM</Text>
                                </View>
                                <View style={styles.reviewChild}>
                                    <Text style={styles.reviewLabel}>STOPS</Text>
                                    <Text style={styles.reviewValue}>{deliveries.length}</Text>
                                </View>
                                <View style={styles.reviewChild}>
                                    <Text style={styles.reviewLabel}>TOTAL LOAD</Text>
                                    <Text style={[styles.reviewValue, { color: colors.success[600] }]}>{totalBags} BAGS</Text>
                                </View>
                            </View>
                        </Card>

                        <View style={[styles.infoBox, { backgroundColor: colors.warning[50], borderColor: colors.warning[100] }]}>
                            <Text style={styles.warningText}>
                                Once started, you won't be able to edit these metrics until you complete the trip.
                            </Text>
                        </View>
                    </Animated.View>
                );
            default: return null;
        }
    };

    return (
        <>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <LinearGradient
                    colors={[colors.primary[700], colors.primary[900]]}
                    style={styles.header}
                >
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Text style={styles.backButtonIcon}>←</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>New Shipment</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    {renderStepIndicators()}
                </LinearGradient>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {renderStepContent()}
                    </Animated.View>
                </ScrollView>

                <View style={styles.footer}>
                    {step > 1 ? (
                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={prevStep}
                            disabled={loading}
                        >
                            <Text style={styles.btnTextSecondary}>PREVIOUS</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={() => navigation.goBack()}
                            disabled={loading}
                        >
                            <Text style={styles.btnTextSecondary}>CANCEL</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={step < 4 ? nextStep : handleCreateTrip}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={[step < 4 ? colors.primary[500] : colors.success[500], step < 4 ? colors.primary[700] : colors.success[700]]}
                            style={styles.btnGradient}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.btnTextPrimary}>
                                    {step < 4 ? 'NEXT STEP' : 'START TRIP'}
                                </Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Success Modal */}
            <Modal
                visible={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    navigation.replace('CattleFeedTruckDriverActiveTrip');
                }}
                title="Trip Created!"
                subtitle="Your journey has officially started"
                icon="✨"
                footer={
                    <Button
                        onPress={() => {
                            setShowSuccessModal(false);
                            navigation.replace('CattleFeedTruckDriverActiveTrip');
                        }}
                    >
                        LET'S GO
                    </Button>
                }
            >
                <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
                    <Text style={{ textAlign: 'center', color: colors.text.tertiary, fontSize: 14 }}>
                        New trip for vehicle {vehicles.find(v => v._id === formData.vehicleId)?.registrationNumber} has been recorded.
                    </Text>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.secondary,
    },
    header: {
        paddingTop: 60,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.xl,
        borderBottomLeftRadius: borderRadius.xl,
        borderBottomRightRadius: borderRadius.xl,
        ...shadows.lg,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonIcon: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
    },
    stepItem: {
        alignItems: 'center',
    },
    stepCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    stepActive: {
        backgroundColor: '#FFFFFF',
        borderColor: '#FFFFFF',
    },
    stepInactive: {
        borderColor: 'rgba(255,255,255,0.3)',
    },
    stepCompleted: {
        backgroundColor: colors.success[400],
        borderColor: colors.success[400],
    },
    stepNumber: {
        fontSize: 12,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.5)',
    },
    textWhite: {
        color: colors.primary[700],
    },
    stepCheck: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    stepLine: {
        flex: 1,
        height: 2,
        marginHorizontal: 4,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: 120,
    },
    stepWrapper: {
        width: '100%',
    },
    stepInfoContainer: {
        marginBottom: spacing.xl,
    },
    stepTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '900',
        color: colors.text.primary,
    },
    stepSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.tertiary,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    halfInput: {
        flex: 1,
    },
    addStopCard: {
        padding: spacing.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.primary[300],
        marginBottom: spacing.xl,
    },
    cardHeader: {
        fontSize: 10,
        fontWeight: 'black',
        color: colors.primary[600],
        letterSpacing: 2,
        marginBottom: spacing.sm,
    },
    listHeader: {
        fontSize: 10,
        fontWeight: 'black',
        color: colors.text.tertiary,
        letterSpacing: 1.5,
        marginBottom: spacing.md,
    },
    stopCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
        alignItems: 'center',
        ...shadows.sm,
    },
    stopInfo: {
        flex: 1,
    },
    stopLoc: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    stopMeta: {
        flexDirection: 'row',
        gap: spacing.xs,
        marginTop: 4,
    },
    metaChip: {
        backgroundColor: colors.background.tertiary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    metaText: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    removeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.error[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeText: {
        color: colors.error[600],
        fontWeight: 'bold',
    },
    emptyStops: {
        padding: spacing.xl,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    emptyStopsText: {
        color: colors.text.tertiary,
        fontSize: 12,
        fontStyle: 'italic',
    },
    reviewCard: {
        padding: spacing.lg,
    },
    reviewMainItem: {
        alignItems: 'center',
        paddingBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        marginBottom: spacing.lg,
    },
    reviewMainVal: {
        fontSize: typography.fontSize.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        textAlign: 'center',
    },
    reviewMainLabel: {
        fontSize: 10,
        fontWeight: 'black',
        color: colors.text.tertiary,
        letterSpacing: 1.5,
        marginTop: 4,
    },
    reviewGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    reviewChild: {
        width: '50%',
        marginBottom: spacing.md,
    },
    reviewLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.text.tertiary,
    },
    reviewValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    infoBox: {
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        marginTop: spacing.md,
    },
    warningText: {
        fontSize: 11,
        color: colors.warning[800],
        lineHeight: 16,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.lg,
        paddingBottom: 40,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        gap: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border.light,
        ...shadows.lg,
    },
    secondaryBtn: {
        flex: 1,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: borderRadius.xl,
        backgroundColor: colors.background.secondary,
    },
    btnTextSecondary: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.text.tertiary,
        letterSpacing: 1,
    },
    primaryBtn: {
        flex: 2,
        height: 52,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
    },
    btnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnTextPrimary: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});

export default CreateTrip;
