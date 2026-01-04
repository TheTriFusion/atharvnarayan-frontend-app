import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../../common/Card';
import BMCCollection from './BMCCollection';
import DairyConfirmation from './DairyConfirmation';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { getMilkTruckRoutes, getMilkTruckVehicles } from '../../../utils/storage';

interface ActiveTripProps {
    trip: any;
    onTripComplete: (completedTrip: any) => void;
}

const ActiveTrip: React.FC<ActiveTripProps> = ({ trip, onTripComplete }) => {
    const [currentTrip, setCurrentTrip] = useState(trip);
    const [stage, setStage] = useState<'bmc_collection' | 'dairy_confirmation'>('bmc_collection');

    const [route, setRoute] = useState<any>(null);
    const [vehicle, setVehicle] = useState<any>(null);

    useEffect(() => {
        setCurrentTrip(trip);
    }, [trip]);

    // Load Route and Vehicle details if not fully populated
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
        <View style={styles.container}>
            {/* Header Info */}
            <Card variant="elevated" style={styles.headerCard}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.label}>Vehicle</Text>
                        <Text style={styles.value}>{vehicle?.registrationNumber || 'Loading...'}</Text>
                    </View>
                    <View>
                        <Text style={styles.label}>Route</Text>
                        <Text style={styles.value}>{route?.name || 'Loading...'}</Text>
                    </View>
                    <View>
                        <Text style={styles.label}>Status</Text>
                        <Text style={[styles.value, styles.statusValue]}>
                            IN PROGRESS
                        </Text>
                    </View>
                </View>
            </Card>

            {/* Stage Indicator */}
            <View style={styles.stageIndicator}>
                <View style={[styles.stageStep, stage === 'bmc_collection' && styles.activeStep, stage === 'dairy_confirmation' && styles.completedStep]}>
                    <Text style={[styles.stepNumber, (stage === 'bmc_collection' || stage === 'dairy_confirmation') && styles.activeStepText]}>1</Text>
                    <Text style={styles.stepLabel}>BMC Collection</Text>
                </View>
                <View style={styles.stepConnector} />
                <View style={[styles.stageStep, stage === 'dairy_confirmation' && styles.activeStep]}>
                    <Text style={[styles.stepNumber, stage === 'dairy_confirmation' && styles.activeStepText]}>2</Text>
                    <Text style={styles.stepLabel}>Dairy Confirmation</Text>
                </View>
            </View>

            {/* Main Content */}
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
    );
};

const styles = StyleSheet.create({
    container: {
        gap: spacing.md,
    },
    headerCard: {
        padding: spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    value: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
    },
    statusValue: {
        color: colors.warning[600],
        textTransform: 'uppercase',
    },
    stageIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    stageStep: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        opacity: 0.5,
    },
    activeStep: {
        opacity: 1,
    },
    completedStep: {
        opacity: 1, // Still visible but maybe different style?
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.tertiary,
        textAlign: 'center',
        textAlignVertical: 'center',
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.secondary,
        lineHeight: 24, // Center vertically
    },
    activeStepText: {
        backgroundColor: colors.primary[600],
        color: '#FFFFFF',
    },
    stepLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.primary,
    },
    stepConnector: {
        flex: 1,
        height: 2,
        backgroundColor: colors.border.light,
        marginHorizontal: spacing.sm,
    },
});

export default ActiveTrip;
