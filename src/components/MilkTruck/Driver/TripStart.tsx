import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Card from '../../common/Card';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

interface TripStartProps {
    onTripStart: (tripData: any) => Promise<void>;
    vehicles: any[];
    routes: any[];
    user: any;
}

const TripStart: React.FC<TripStartProps> = ({ onTripStart, vehicles, routes, user }) => {
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [selectedRouteId, setSelectedRouteId] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleStart = async () => {
        if (!selectedVehicleId || !selectedRouteId) {
            Alert.alert('Selection Required', 'Please choose both a vehicle and a route to begin your journey.');
            return;
        }

        setLoading(true);
        try {
            const newTrip = {
                driverId: user?.id || user?._id,
                vehicleId: selectedVehicleId,
                routeId: selectedRouteId,
                startTime: new Date().toISOString(),
                status: 'in_progress',
                bmcEntries: [],
                summary: {
                    totalMilk: 0
                }
            };

            await onTripStart(newTrip);
        } catch (error) {
            console.error('Error starting trip:', error);
            Alert.alert('Error', 'We couldn\'t start the trip. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Animated.View style={{ opacity: fadeAnim }}>
            <Card variant="elevated" style={styles.card}>
                <View style={styles.headerRow}>
                    <View style={styles.iconCircle}>
                        <Text style={styles.iconText}>🚚</Text>
                    </View>
                    <View>
                        <Text style={styles.title}>New Milk Collection</Text>
                        <Text style={styles.subtitle}>Select vehicle & route to start</Text>
                    </View>
                </View>

                {/* Vehicle Selection */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIndicator} />
                        <Text style={styles.sectionLabel}>CHOOSE VEHICLE</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
                        {vehicles.length > 0 ? (
                            vehicles.map((v) => (
                                <TouchableOpacity
                                    key={v._id || v.id}
                                    activeOpacity={0.7}
                                    style={[
                                        styles.chip,
                                        selectedVehicleId === (v._id || v.id) && styles.chipSelected
                                    ]}
                                    onPress={() => setSelectedVehicleId(v._id || v.id)}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            selectedVehicleId === (v._id || v.id) && styles.chipTextSelected
                                        ]}
                                    >
                                        {v.registrationNumber}
                                    </Text>
                                    {selectedVehicleId === (v._id || v.id) && <View style={styles.selectedDot} />}
                                </TouchableOpacity>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No vehicles linked to your account.</Text>
                        )}
                    </ScrollView>
                </View>

                {/* Route Selection */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIndicator, { backgroundColor: colors.secondary[500] }]} />
                        <Text style={styles.sectionLabel}>CHOOSE ROUTE</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
                        {routes.length > 0 ? (
                            routes.map((r) => (
                                <TouchableOpacity
                                    key={r._id || r.id}
                                    activeOpacity={0.7}
                                    style={[
                                        styles.chip,
                                        selectedRouteId === (r._id || r.id) && styles.chipSelectedRoute
                                    ]}
                                    onPress={() => setSelectedRouteId(r._id || r.id)}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            selectedRouteId === (r._id || r.id) && styles.chipTextSelectedRoute
                                        ]}
                                    >
                                        {r.name}
                                    </Text>
                                    {selectedRouteId === (r._id || r.id) && <View style={[styles.selectedDot, { backgroundColor: colors.secondary[500] }]} />}
                                </TouchableOpacity>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No collection routes available.</Text>
                        )}
                    </ScrollView>
                </View>

                {/* Start Button */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.startButton, loading && styles.disabledButton]}
                    onPress={handleStart}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={[colors.primary[500], colors.primary[700]]}
                        style={styles.gradientButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Text style={styles.startButtonText}>START COLLECTION TRIP</Text>
                                <Text style={styles.startButtonIcon}>→</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </Card>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: spacing.lg,
        backgroundColor: '#FFFFFF',
        borderRadius: borderRadius.xl,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    iconText: {
        fontSize: 24,
    },
    title: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.black,
        color: colors.text.primary,
    },
    subtitle: {
        fontSize: typography.fontSize.xs,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    sectionIndicator: {
        width: 4,
        height: 14,
        backgroundColor: colors.primary[500],
        borderRadius: 2,
        marginRight: spacing.xs,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: typography.fontWeight.black,
        color: colors.text.tertiary,
        letterSpacing: 2,
    },
    chipContainer: {
        flexDirection: 'row',
    },
    chip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border.light,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipSelected: {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary[500],
    },
    chipSelectedRoute: {
        backgroundColor: colors.secondary[50],
        borderColor: colors.secondary[500],
    },
    chipText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.secondary,
    },
    chipTextSelected: {
        color: colors.primary[700],
    },
    chipTextSelectedRoute: {
        color: colors.secondary[700],
    },
    selectedDot: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary[500],
    },
    emptyText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.disabled,
        fontStyle: 'italic',
        paddingVertical: spacing.sm,
    },
    startButton: {
        marginTop: spacing.xl,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        ...shadows.lg,
    },
    gradientButton: {
        flexDirection: 'row',
        paddingVertical: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        opacity: 0.7,
    },
    startButtonText: {
        color: '#FFFFFF',
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.black,
        letterSpacing: 1.5,
    },
    startButtonIcon: {
        color: '#FFFFFF',
        fontSize: 20,
        marginLeft: spacing.sm,
        fontWeight: 'bold',
    },
});

export default TripStart;
