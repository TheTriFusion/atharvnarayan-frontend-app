import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../../contexts/AuthContext';
import { getMilkTruckTrips } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

import ProfileMenu from '../../../components/common/ProfileMenu';

const { width } = Dimensions.get('window');

const DriverDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigation = useNavigation<any>();
    const [trips, setTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scrollY = useRef(new Animated.Value(0)).current;

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

            // Start entry animation
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fadeAnim.setValue(0);
            loadDashboardData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadDashboardData();
    };

    const activeTrips = trips.filter(t => t.status === 'in_progress');
    const completedTrips = trips.filter(t => t.status !== 'in_progress');

    const renderTripItem = (item: any, index: number) => {
        const itemFade = fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
        });

        const itemTranslateY = fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20 + index * 10, 0],
        });

        return (
            <Animated.View
                key={item._id || item.id}
                style={{
                    opacity: itemFade,
                    transform: [{ translateY: itemTranslateY }]
                }}
            >
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('MilkTruckDriverTripDetails', { tripId: item._id || item.id })}
                >
                    <Card variant="elevated" style={styles.tripCard}>
                        <View style={styles.tripCardContent}>
                            <View style={styles.tripInfoSection}>
                                <View style={styles.tripHeaderRow}>
                                    <Text style={styles.tripIdText}>
                                        #{((item._id || item.id || '').toString().substring((item._id || item.id || '').toString().length - 6))}
                                    </Text>
                                    <View style={[
                                        styles.statusBadge,
                                        { backgroundColor: item.status === 'completed' ? colors.success[50] : colors.primary[50] }
                                    ]}>
                                        <Text style={[
                                            styles.statusBadgeText,
                                            { color: item.status === 'completed' ? colors.success[700] : colors.primary[700] }
                                        ]}>
                                            {item.status?.replace('_', ' ').toUpperCase()}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.tripRouteText}>{item.routeId?.name || 'Local Route'}</Text>
                                <Text style={styles.tripDateText}>
                                    📅 {new Date(item.startTime || item.createdAt).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </Text>
                            </View>

                            <View style={styles.tripStatsSection}>
                                <View style={styles.statChip}>
                                    <Text style={styles.statChipText}>🥛 {(item.summary?.totalMilk || 0).toFixed(0)}L</Text>
                                </View>
                                <View style={styles.statChip}>
                                    <Text style={styles.statChipText}>📍 {item.bmcEntries?.length || 0} BMCs</Text>
                                </View>
                            </View>
                        </View>
                    </Card>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const headerHeight = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [200, 140],
        extrapolate: 'clamp',
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [1, 0.9],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
            {/* Custom Premium Header */}
            <Animated.View style={[styles.headerContainer, { height: headerHeight, opacity: headerOpacity }]}>
                <LinearGradient
                    colors={[colors.primary[700], colors.primary[500]]}
                    style={styles.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.headerWelcomeLabel}>GOOD DAY,</Text>
                            <Text style={styles.headerWelcomeValue}>{user?.name?.toUpperCase()}</Text>
                        </View>
                        <ProfileMenu style={styles.profileButton} />
                    </View>

                    <View style={styles.headerBottom}>
                        <View style={styles.dateContainer}>
                            <Text style={styles.headerDateText}>
                                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>

            <Animated.ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary[500]}
                        colors={[colors.primary[500]]}
                    />
                }
            >
                {/* Dashboard Stats */}
                <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ scale: fadeAnim }] }]}>
                    <Card style={styles.statBox}>
                        <Text style={styles.statValue}>{trips.length}</Text>
                        <Text style={styles.statLabel}>TOTAL TRIPS</Text>
                    </Card>
                    <Card style={styles.statBoxActive}>
                        <Text style={[styles.statValue, { color: colors.warning[600] }]}>{activeTrips.length}</Text>
                        <Text style={styles.statLabel}>ACTIVE</Text>
                    </Card>
                    <Card style={styles.statBox}>
                        <Text style={[styles.statValue, { color: colors.success[600] }]}>{completedTrips.length}</Text>
                        <Text style={styles.statLabel}>COMPLETED</Text>
                    </Card>
                </Animated.View>

                {/* Main Action Button */}
                <Animated.View style={{
                    opacity: fadeAnim,
                    transform: [{
                        translateY: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0]
                        })
                    }]
                }}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.primaryActionButton}
                        onPress={() => navigation.navigate('MilkTruckDriverTrip')}
                    >
                        <LinearGradient
                            colors={[colors.success[500], colors.success[700]]}
                            style={styles.actionGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.actionButtonIcon}>🚛</Text>
                            <Text style={styles.actionButtonText}>START NEW COLLECTION TRIP</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

                {/* Active Trips Section */}
                {activeTrips.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIndicator} />
                            <Text style={styles.sectionTitle}>ACTIVE TRIPS</Text>
                        </View>
                        {activeTrips.map((trip, idx) => (
                            <TouchableOpacity
                                key={trip._id || trip.id}
                                activeOpacity={0.9}
                                onPress={() => navigation.navigate('MilkTruckDriverTrip')}
                            >
                                <Card variant="elevated" style={styles.activeTripCard}>
                                    <View style={styles.activeTripHeader}>
                                        <View style={styles.activeIndicator} />
                                        <Text style={styles.activeTripTitle}>Trip in progress</Text>
                                    </View>
                                    <Text style={styles.activeTripId}>#{((trip._id || trip.id || '').toString().substring((trip._id || trip.id || '').toString().length - 6))}</Text>
                                    <Text style={styles.activeTripRoute}>{trip.routeId?.name || 'In-Progress Route'}</Text>
                                    <View style={styles.activeTripFooter}>
                                        <Text style={styles.tapToContinue}>Tap to resume collection →</Text>
                                    </View>
                                </Card>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Recent History */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIndicator, { backgroundColor: colors.secondary[400] }]} />
                        <Text style={styles.sectionTitle}>RECENT HISTORY</Text>
                    </View>

                    {completedTrips.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Text style={styles.emptyIcon}>📂</Text>
                            </View>
                            <Text style={styles.emptyTitle}>No Trips Yet</Text>
                            <Text style={styles.emptySubtitle}>Your completed collection trips will appear here.</Text>
                        </View>
                    ) : (
                        completedTrips.slice(0, 10).map((trip, index) => renderTripItem(trip, index))
                    )}
                </View>

                <View style={styles.footerSpacing} />
            </Animated.ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.secondary,
    },
    headerContainer: {
        width: '100%',
        position: 'absolute',
        top: 0,
        zIndex: 10,
    },
    headerGradient: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
        borderBottomLeftRadius: borderRadius.xl,
        borderBottomRightRadius: borderRadius.xl,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    headerWelcomeLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 2,
    },
    headerWelcomeValue: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.bold,
        color: '#FFFFFF',
    },
    profileButton: {
        borderRadius: borderRadius.full,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        padding: 4,
    },
    profileAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarLetter: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.primary[600],
    },
    headerBottom: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateContainer: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.md,
    },
    headerDateText: {
        color: '#FFFFFF',
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 210, // Must be > initial header height
        paddingHorizontal: spacing.lg,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
        backgroundColor: '#FFFFFF',
    },
    statBoxActive: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
        backgroundColor: '#FFFFFF',
        borderColor: colors.warning[300],
        borderWidth: 1.5,
    },
    statValue: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
    },
    statLabel: {
        fontSize: 8,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.tertiary,
        letterSpacing: 0.5,
        marginTop: 2,
    },
    primaryActionButton: {
        width: '100%',
        marginBottom: spacing.xl,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        ...shadows.lg,
    },
    actionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
    },
    actionButtonIcon: {
        fontSize: 24,
        marginRight: spacing.sm,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
        letterSpacing: 0.5,
    },
    sectionContainer: {
        marginBottom: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
        paddingLeft: spacing.xs,
    },
    sectionIndicator: {
        width: 4,
        height: 16,
        backgroundColor: colors.primary[500],
        borderRadius: 2,
        marginRight: spacing.sm,
    },
    sectionTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.tertiary,
        letterSpacing: 1.5,
    },
    activeTripCard: {
        backgroundColor: '#FFFFFF',
        borderColor: colors.warning[400],
        borderWidth: 1,
        padding: spacing.lg,
    },
    activeTripHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    activeIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.warning[500],
        marginRight: spacing.xs,
    },
    activeTripTitle: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold,
        color: colors.warning[700],
        textTransform: 'uppercase',
    },
    activeTripId: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
    },
    activeTripRoute: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        marginTop: 2,
    },
    activeTripFooter: {
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border.light,
    },
    tapToContinue: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold,
        color: colors.primary[600],
    },
    tripCard: {
        marginBottom: spacing.md,
        padding: 0,
        overflow: 'hidden',
    },
    tripCardContent: {
        padding: spacing.lg,
    },
    tripInfoSection: {
        flex: 1,
    },
    tripHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    tripIdText: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.tertiary,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: typography.fontWeight.bold,
    },
    tripRouteText: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
    },
    tripDateText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    tripStatsSection: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    statChip: {
        backgroundColor: colors.background.tertiary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    statChipText: {
        fontSize: 11,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.secondary,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xl * 2,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.background.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    emptyIcon: {
        fontSize: 40,
    },
    emptyTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
    },
    emptySubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.tertiary,
        textAlign: 'center',
        marginTop: spacing.xs,
        paddingHorizontal: spacing.xl,
    },
    footerSpacing: {
        height: 100,
    },
});

export default DriverDashboard;

