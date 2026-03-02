import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, PermissionsAndroid } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import { useAuth } from '../../../contexts/AuthContext';
import { milkTruckAPI } from '../../../utils/api';
import {
    getMilkTruckTrips,
    getMilkTruckVehicles,
    getMilkTruckRoutes,
    addMilkTruckTrip
} from '../../../utils/storage';
import { startTripLocationService, stopTripLocationService } from '../../../utils/tripLocationService';
import { useTripSocket } from '../../../hooks/useTripSocket';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import TripStart from '../../../components/MilkTruck/Driver/TripStart';
import ActiveTrip from '../../../components/MilkTruck/Driver/ActiveTrip';

const TripPage: React.FC = () => {
    const { user } = useAuth();
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);
    const [activeTrip, setActiveTrip] = useState<any>(null);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [routes, setRoutes] = useState<any[]>([]);
    const watchIdRef = useRef<number | null>(null);

    // Socket.io for real-time location emission to owner
    const isOnTrip = !!activeTrip && activeTrip.status === 'in_progress';
    const { emitLocation } = useTripSocket(activeTrip?._id ?? null, isOnTrip);

    // Ref to always use latest emitLocation in watchPosition callback (survives socket reconnects)
    const emitLocationRef = useRef(emitLocation);
    useEffect(() => {
        emitLocationRef.current = emitLocation;
    }, [emitLocation]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [allTrips, allVehicles, allRoutes] = await Promise.all([
                getMilkTruckTrips(),
                getMilkTruckVehicles(),
                getMilkTruckRoutes(),
            ]);

            // Check for active trip for this driver
            const userId = user?.id || user?._id;
            const driverTrips = Array.isArray(allTrips) ? allTrips.filter(t => {
                const tripDriverId = t.driverId?._id || t.driverId?.id || t.driverId;
                return tripDriverId && userId && tripDriverId.toString() === userId.toString();
            }) : [];

            // Find incomplete trip
            const currentTrip = driverTrips.find(t => t.status === 'in_progress');
            setActiveTrip(currentTrip || null);

            setVehicles(Array.isArray(allVehicles) ? allVehicles : []);
            setRoutes(Array.isArray(allRoutes) ? allRoutes : []);
        } catch (error) {
            console.error('Error loading trip data:', error);
            Alert.alert('Error', 'Failed to load trip data');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const handleTripStart = async (newTripData: any) => {
        try {
            const createdTrip = await addMilkTruckTrip(newTripData);
            if (createdTrip) {
                setActiveTrip(createdTrip);
                Alert.alert('Success', 'Trip started successfully!');
            }
        } catch (error) {
            console.error('Error starting trip:', error);
            Alert.alert('Error', 'Failed to start trip');
            throw error; // Re-throw for child component to handle loading state/error display
        }
    };

    // ============================================================
    // LOCATION TRACKING — runs while trip is active
    // 1) Native Android foreground service for background reliability
    // 2) JS watchPosition for real-time Socket.io emission to owner
    // ============================================================
    useEffect(() => {
        if (!activeTrip?._id) {
            // No active trip → stop everything
            stopTripLocationService();
            if (watchIdRef.current != null) {
                Geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            return;
        }

        let mounted = true;
        const tripId = activeTrip._id;

        const startAllTracking = async () => {
            // --- Permissions ---
            if (Platform.OS === 'android') {
                try {
                    if (Number(Platform.Version) >= 33) {
                        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
                    }
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                        {
                            title: 'Location for trip route',
                            message: 'Allow location so your trip route can be shared with the owner.',
                            buttonNeutral: 'Later',
                            buttonPositive: 'OK',
                        }
                    );
                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
                    // Request background location for Android 10+
                    if (Number(Platform.Version) >= 29) {
                        await PermissionsAndroid.request(
                            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
                            {
                                title: 'Background location',
                                message: 'Allow background location so the trip route is recorded even when the app is closed.',
                                buttonNeutral: 'Later',
                                buttonPositive: 'OK',
                            }
                        );
                    }
                } catch (_) { }
            }

            // --- Send first location immediately ---
            Geolocation.getCurrentPosition(
                (pos) => {
                    if (!mounted) return;
                    const { latitude, longitude } = pos.coords;
                    milkTruckAPI.sendTripLocation(tripId, latitude, longitude).catch(() => { });
                    emitLocationRef.current(latitude, longitude, user?.id || user?._id);
                },
                () => { },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
            );

            // --- Start native Android foreground service (reliable in background / screen off) ---
            try {
                const token = await AsyncStorage.getItem('token');
                if (token) {
                    startTripLocationService(tripId, token, 'milk_truck');
                }
            } catch (e) {
                console.warn('Failed to start native location service:', e);
            }

            // --- Start JS watchPosition for real-time Socket.io updates to owner ---
            const watchId = Geolocation.watchPosition(
                (position) => {
                    if (!mounted) return;
                    const { latitude, longitude } = position.coords;
                    // Emit via socket so owner sees live movement on FleetMap
                    emitLocationRef.current(latitude, longitude, user?.id || user?._id);
                },
                (err) => console.warn('Trip location watch error:', err),
                {
                    enableHighAccuracy: true,
                    distanceFilter: 10,
                    interval: 5000,
                    fastestInterval: 2000,
                }
            );
            watchIdRef.current = watchId;
        };

        startAllTracking();

        return () => {
            mounted = false;
            stopTripLocationService();
            if (watchIdRef.current != null) {
                Geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [activeTrip?._id]);

    const handleTripComplete = async (completedTrip: any) => {
        setActiveTrip(null);
        Alert.alert(
            "Trip Completed",
            "Collection logs have been submitted successfully.",
            [
                {
                    text: "Done",
                    onPress: () => navigation.navigate('MilkTruckDriverDashboard')
                }
            ]
        );
    };

    if (loading && !activeTrip && vehicles.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary[600]} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader title={activeTrip ? "Active Trip" : "Start New Trip"} showBackButton />

            <ScrollView contentContainerStyle={styles.content}>
                {activeTrip ? (
                    <ActiveTrip
                        trip={activeTrip}
                        onTripComplete={handleTripComplete}
                    />
                ) : (
                    <TripStart
                        onTripStart={handleTripStart}
                        vehicles={vehicles}
                        routes={routes}
                        user={user}
                    />
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: spacing.xl * 2,
    },
});

export default TripPage;

