import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, FlatList } from 'react-native';
// Force refresh
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import { getMilkTruckTrips } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

const DriverDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigation = useNavigation<any>();
    const [trips, setTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const allTrips = await getMilkTruckTrips();

            // Filter for current user
            const userId = user?.id || user?._id;
            const driverTrips = Array.isArray(allTrips) ? allTrips.filter(t => {
                const tripDriverId = t.driverId?._id || t.driverId?.id || t.driverId;
                return tripDriverId && userId && tripDriverId.toString() === userId.toString();
            }) : [];

            // Sort by date desc
            driverTrips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setTrips(driverTrips);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadDashboardData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadDashboardData();
    };

    const activeTrips = trips.filter(t => t.status === 'in_progress');
    const completedTrips = trips.filter(t => t.status !== 'in_progress');

    const renderTripItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            onPress={() => navigation.navigate('MilkTruckDriverTripDetails', { tripId: item._id || item.id })}
        >
            <Card variant="elevated" style={styles.tripCard}>
                <View style={styles.tripHeader}>
                    <Text style={styles.tripId}>#{((item._id || item.id || '').toString().substring((item._id || item.id || '').toString().length - 6))}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? colors.success[100] : colors.secondary[200] }]}>
                        <Text style={[styles.statusText, { color: item.status === 'completed' ? colors.success[700] : colors.secondary[700] }]}>
                            {item.status?.replace('_', ' ').toUpperCase() || 'N/A'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.tripDate}>{new Date(item.startTime || item.createdAt).toLocaleDateString()}</Text>
                <View style={styles.tripDetails}>
                    <Text style={styles.tripRoute}>{item.routeId?.name || 'Unknown Route'}</Text>
                    <Text style={styles.tripStats}>
                        {item.bmcEntries?.length || 0} BMCs • {(item.summary?.totalMilk || 0).toFixed(1)} L
                    </Text>
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader title="Driver Dashboard" />

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeText}>Welcome, {user?.name}</Text>
                    <Text style={styles.dateText}>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                </View>

                {/* Start Trip Button */}
                <TouchableOpacity
                    style={styles.startTripButton}
                    onPress={() => navigation.navigate('MilkTruckDriverTrip')}
                >
                    <Text style={styles.startTripButtonText}>Start New Trip 🚚</Text>
                </TouchableOpacity>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <Card style={styles.statsCard}>
                        <Text style={styles.statsValue}>{trips.length}</Text>
                        <Text style={styles.statsLabel}>Total</Text>
                    </Card>
                    <Card style={styles.statsCard}>
                        <Text style={[styles.statsValue, { color: colors.success[600] }]}>
                            {completedTrips.length}
                        </Text>
                        <Text style={styles.statsLabel}>Completed</Text>
                    </Card>
                    <Card style={styles.statsCard}>
                        <Text style={[styles.statsValue, { color: colors.warning[600] }]}>
                            {activeTrips.length}
                        </Text>
                        <Text style={styles.statsLabel}>Active</Text>
                    </Card>
                </View>

                {/* Active Trips Section */}
                {activeTrips.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Active Trips</Text>
                        {activeTrips.map(trip => (
                            <TouchableOpacity
                                key={trip._id || trip.id}
                                onPress={() => navigation.navigate('MilkTruckDriverTrip')}
                            >
                                <Card variant="elevated" style={{ ...styles.tripCard, borderColor: colors.warning[400], borderWidth: 1 }}>
                                    <View style={styles.tripHeader}>
                                        <Text style={styles.tripId}>#{((trip._id || trip.id || '').toString().substring((trip._id || trip.id || '').toString().length - 6))}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: colors.warning[100] }]}>
                                            <Text style={[styles.statusText, { color: colors.warning[700] }]}>IN PROGRESS</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.tripRoute}>{trip.routeId?.name || 'Unknown Route'}</Text>
                                    <Text style={styles.continueText}>Tap to continue trip →</Text>
                                </Card>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Recent Trips Header */}
                <Text style={styles.sectionTitle}>Recent History</Text>
                {completedTrips.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No past trips found</Text>
                    </View>
                ) : (
                    completedTrips.map(trip => (
                        <View key={trip._id || trip.id}>
                            {renderTripItem({ item: trip })}
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.secondary,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: spacing.xl * 2,
    },
    welcomeSection: {
        marginBottom: spacing.lg,
    },
    welcomeText: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
    },
    dateText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.tertiary,
        marginTop: spacing.xs,
    },
    startTripButton: {
        backgroundColor: colors.primary[600],
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginBottom: spacing.xl,
        ...shadows.md,
    },
    startTripButtonText: {
        color: '#FFFFFF',
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    statsCard: {
        flex: 1,
        alignItems: 'center',
        padding: spacing.md,
    },
    statsValue: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    statsLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.tertiary,
        textTransform: 'uppercase',
        fontWeight: typography.fontWeight.bold,
        letterSpacing: 0.5,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    tripCard: {
        marginBottom: spacing.md,
    },
    activeTripCard: {
        borderColor: colors.warning[400],
        borderWidth: 1,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    tripId: {
        fontSize: typography.fontSize.sm,
        // fontFamily: typography.fontFamily.mono,
        color: colors.text.tertiary,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs / 2,
        borderRadius: borderRadius.full,
    },
    statusText: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold,
    },
    tripDate: {
        fontSize: typography.fontSize.xs,
        color: colors.text.tertiary,
        marginBottom: spacing.xs,
    },
    tripDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tripRoute: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
    },
    tripStats: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    },
    continueText: {
        marginTop: spacing.sm,
        color: colors.warning[700],
        fontWeight: typography.fontWeight.semibold,
        fontSize: typography.fontSize.sm,
    },
    emptyState: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyStateText: {
        color: colors.text.tertiary,
        fontSize: typography.fontSize.base,
    },
});

export default DriverDashboard;
