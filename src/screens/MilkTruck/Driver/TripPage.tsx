import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
// Force refresh
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import {
    getMilkTruckTrips,
    getMilkTruckVehicles,
    getMilkTruckRoutes,
    addMilkTruckTrip
} from '../../../utils/storage';
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

