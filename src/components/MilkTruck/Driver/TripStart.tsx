import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
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

    const handleStart = async () => {
        if (!selectedVehicleId || !selectedRouteId) {
            Alert.alert('Error', 'Please select both a vehicle and a route to start the trip.');
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
            Alert.alert('Error', 'Failed to start trip. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card variant="elevated" style={styles.card}>
            <Text style={styles.title}>Start New Trip</Text>

            <Text style={styles.sectionLabel}>Select Vehicle</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
                {vehicles.length > 0 ? (
                    vehicles.map((v) => (
                        <TouchableOpacity
                            key={v._id || v.id}
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
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No vehicles available</Text>
                )}
            </ScrollView>

            <Text style={styles.sectionLabel}>Select Route</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
                {routes.length > 0 ? (
                    routes.map((r) => (
                        <TouchableOpacity
                            key={r._id || r.id}
                            style={[
                                styles.chip,
                                selectedRouteId === (r._id || r.id) && styles.chipSelected
                            ]}
                            onPress={() => setSelectedRouteId(r._id || r.id)}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    selectedRouteId === (r._id || r.id) && styles.chipTextSelected
                                ]}
                            >
                                {r.name}
                            </Text>
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No routes available</Text>
                )}
            </ScrollView>

            <TouchableOpacity
                style={[styles.startButton, loading && styles.disabledButton]}
                onPress={handleStart}
                disabled={loading}
            >
                <Text style={styles.startButtonText}>
                    {loading ? 'Starting...' : 'Start Trip 🚚'}
                </Text>
            </TouchableOpacity>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: spacing.lg,
    },
    title: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.lg,
    },
    sectionLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    scrollContainer: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.background.primary,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border.light,
        marginRight: spacing.sm,
    },
    chipSelected: {
        backgroundColor: colors.primary[100],
        borderColor: colors.primary[600],
    },
    chipText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
    },
    chipTextSelected: {
        color: colors.primary[700],
        fontWeight: typography.fontWeight.bold,
    },
    emptyText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.disabled,
        fontStyle: 'italic',
    },
    startButton: {
        backgroundColor: colors.primary[600],
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.xl,
        ...shadows.md,
    },
    disabledButton: {
        opacity: 0.7,
    },
    startButtonText: {
        color: '#FFFFFF',
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
    },
});

export default TripStart;
