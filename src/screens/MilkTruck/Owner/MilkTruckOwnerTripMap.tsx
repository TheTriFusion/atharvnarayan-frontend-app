import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, StatusBar } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import ScreenHeader from '../../../components/common/ScreenHeader';
import DriverPathMap, { Coord } from '../../../components/DriverPathMap';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

const MilkTruckOwnerTripMap: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { locationHistory, routeName, vehicleReg, tripId } = route.params || {};

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, []);

    const coordinates = (locationHistory || [])
        .map((p: any) => ({
            latitude: p.latitude ?? p.lat,
            longitude: p.longitude ?? p.lng,
        }))
        .filter((p: Coord) => typeof p.latitude === 'number' && typeof p.longitude === 'number');

    if (!locationHistory || locationHistory.length < 2) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Trip Route" showBackButton />
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No route data available for this trip.</Text>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <ScreenHeader
                title="Trip Route Map"
                subtitle={`${routeName || 'N/A'} - ${vehicleReg || 'N/A'}`}
                showBackButton
            />

            <Animated.View style={[styles.mapContainer, { opacity: fadeAnim }]}>
                <DriverPathMap
                    coordinates={coordinates}
                    followUser={false}
                    initialRegion={{
                        latitude: coordinates[0]?.latitude || 20.5937,
                        longitude: coordinates[0]?.longitude || 78.9629,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                    style={styles.map}
                />

                {/* Stats Overlay */}
                <View style={styles.statsOverlay}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Trip ID</Text>
                        <Text style={styles.statValue}>#{tripId?.substring(tripId.length - 6).toUpperCase() || 'N/A'}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Status</Text>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>COMPLETED</Text>
                        </View>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    mapContainer: {
        flex: 1,
        overflow: 'hidden',
    },
    map: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    backBtn: {
        backgroundColor: colors.primary[600],
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    backBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    statsOverlay: {
        position: 'absolute',
        bottom: spacing.lg,
        left: spacing.lg,
        right: spacing.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        ...shadows.md,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: colors.text.tertiary,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primary[900],
    },
    statDivider: {
        width: 1,
        height: '60%',
        backgroundColor: colors.border.light,
    },
    statusBadge: {
        backgroundColor: colors.success[100],
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.success[700],
    },
});

export default MilkTruckOwnerTripMap;
