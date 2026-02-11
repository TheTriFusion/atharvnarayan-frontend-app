import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Card from '../../common/Card';
import BMCCollection from './BMCCollection';
import DairyConfirmation from './DairyConfirmation';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { getMilkTruckRoutes, getMilkTruckVehicles } from '../../../utils/storage';

const { width } = Dimensions.get('window');

interface ActiveTripProps {
    trip: any;
    onTripComplete: (completedTrip: any) => void;
}

const ActiveTrip: React.FC<ActiveTripProps> = ({ trip, onTripComplete }) => {
    const [currentTrip, setCurrentTrip] = useState(trip);
    const [stage, setStage] = useState<'bmc_collection' | 'dairy_confirmation'>('bmc_collection');

    const [route, setRoute] = useState<any>(null);
    const [vehicle, setVehicle] = useState<any>(null);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        setCurrentTrip(trip);
    }, [trip]);

    // Load Route and Vehicle details
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [routesData, vehiclesData] = await Promise.all([
                    getMilkTruckRoutes(),
                    getMilkTruckVehicles()
                ]);

                const routeId = currentTrip.routeId?._id || currentTrip.routeId?.id || currentTrip.routeId;
                const vehicleId = currentTrip.vehicleId?._id || currentTrip.vehicleId?.id || currentTrip.vehicleId;

                const foundRoute = (Array.isArray(routesData) ? routesData : []).find((r: any) => (r._id || r.id) === routeId);
                const foundVehicle = (Array.isArray(vehiclesData) ? vehiclesData : []).find((v: any) => (v._id || v.id) === vehicleId);

                setRoute(foundRoute || currentTrip.routeId);
                setVehicle(foundVehicle || currentTrip.vehicleId);

                // Start animation
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }).start();
            } catch (error) {
                console.error('Error fetching trip details:', error);
            }
        };
        fetchData();
    }, [currentTrip]);

    // Determine initial stage
    useEffect(() => {
        if (route && currentTrip.bmcEntries) {
            const routeBMCs = route.bmcSequence || [];
            const isCollected = (bmcId: string) => {
                const entry = currentTrip.bmcEntries.find((e: any) => {
                    const entryId = e.bmcId?._id || e.bmcId?.id || e.bmcId;
                    return entryId && entryId.toString() === bmcId.toString();
                });
                return !!(entry && entry.collectionData);
            };

            const allCollected = routeBMCs.every((bmc: any) => isCollected(bmc._id || bmc.id));
            if (allCollected) {
                setStage('dairy_confirmation');
            } else {
                setStage('bmc_collection');
            }
        }
    }, [currentTrip, route]);

    const handleBMCComplete = (updatedTrip: any) => {
        setCurrentTrip(updatedTrip);
        setStage('dairy_confirmation');
    };

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            {/* Header Info */}
            <Card variant="elevated" style={styles.headerCard}>
                <View style={styles.headerGrid}>
                    <View style={styles.headerItem}>
                        <Text style={styles.label}>VEHICLE</Text>
                        <Text style={styles.value}>{vehicle?.registrationNumber || '...'}</Text>
                    </View>
                    <View style={styles.headerDivider} />
                    <View style={styles.headerItem}>
                        <Text style={styles.label}>ROUTE</Text>
                        <Text style={styles.value}>{route?.name || '...'}</Text>
                    </View>
                    <View style={styles.headerDivider} />
                    <View style={styles.headerItem}>
                        <Text style={styles.label}>STATUS</Text>
                        <Text style={styles.statusValue}>COLLECTING</Text>
                    </View>
                </View>
            </Card>

            {/* Stage Indicator */}
            <View style={styles.stepperWrapper}>
                <View style={styles.stepperContainer}>
                    <View style={styles.step}>
                        <View style={[
                            styles.stepCircle,
                            stage === 'bmc_collection' ? styles.stepActive : styles.stepCompleted
                        ]}>
                            {stage === 'dairy_confirmation' ? (
                                <Text style={styles.stepCheck}>✓</Text>
                            ) : (
                                <Text style={[styles.stepNumber, styles.activeStepText]}>1</Text>
                            )}
                        </View>
                        <Text style={[styles.stepLabel, stage === 'bmc_collection' && styles.activeLabel]}>BMC COLLECTION</Text>
                    </View>

                    <View style={[
                        styles.stepLine,
                        stage === 'dairy_confirmation' && styles.lineActive
                    ]} />

                    <View style={styles.step}>
                        <View style={[
                            styles.stepCircle,
                            stage === 'dairy_confirmation' ? styles.stepActive : styles.stepInactive
                        ]}>
                            <Text style={[styles.stepNumber, stage === 'dairy_confirmation' && styles.activeStepText]}>2</Text>
                        </View>
                        <Text style={[styles.stepLabel, stage === 'dairy_confirmation' && styles.activeLabel]}>DAIRY CHECK</Text>
                    </View>
                </View>
            </View>

            {/* Main Content */}
            <View style={styles.contentArea}>
                {stage === 'bmc_collection' && (
                    <BMCCollection
                        key="bmc_collection"
                        trip={currentTrip}
                        route={route}
                        onComplete={handleBMCComplete}
                    />
                )}

                {stage === 'dairy_confirmation' && (
                    <DairyConfirmation
                        key="dairy_confirmation"
                        trip={currentTrip}
                        onConfirm={onTripComplete}
                    />
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerCard: {
        padding: spacing.md,
        marginHorizontal: -4, // Counteract card margin if any
        marginBottom: spacing.xl,
    },
    headerGrid: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerItem: {
        flex: 1,
        alignItems: 'center',
    },
    headerDivider: {
        width: 1,
        height: 24,
        backgroundColor: colors.border.light,
    },
    label: {
        fontSize: 8,
        fontWeight: typography.fontWeight.black,
        color: colors.text.tertiary,
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    value: {
        fontSize: 12,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        textAlign: 'center',
    },
    statusValue: {
        fontSize: 10,
        fontWeight: typography.fontWeight.black,
        color: colors.warning[600],
        letterSpacing: 0.5,
    },
    stepperWrapper: {
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xl,
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    step: {
        alignItems: 'center',
        width: 100,
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: spacing.xs,
    },
    stepActive: {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[600],
    },
    stepCompleted: {
        backgroundColor: colors.success[500],
        borderColor: colors.success[500],
    },
    stepInactive: {
        backgroundColor: '#FFFFFF',
        borderColor: colors.border.light,
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text.tertiary,
    },
    activeStepText: {
        color: '#FFFFFF',
    },
    stepCheck: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    stepLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.text.tertiary,
        letterSpacing: 0.5,
    },
    activeLabel: {
        color: colors.text.primary,
    },
    stepLine: {
        flex: 1,
        height: 2,
        backgroundColor: colors.border.light,
        marginTop: -16, // Move up relative to circular icons
    },
    lineActive: {
        backgroundColor: colors.success[500],
    },
    contentArea: {
        flex: 1,
    },
});

export default ActiveTrip;
