import BackgroundService from 'react-native-background-actions';
import Geolocation from '@react-native-community/geolocation';
import { cattleFeedTruckAPI, milkTruckAPI, gpsAPI } from './api';

const sleep = (time: number) => new Promise<void>((resolve) => {
    setTimeout(() => resolve(), time);
});

interface BackgroundTaskData {
    tripId?: string;
    tripType?: 'cattle_feed_truck' | 'milk_truck';
}

const locationTask = async (taskData?: BackgroundTaskData) => {
    // If no trip data, it's general fleet tracking
    const { tripId, tripType } = taskData || {};

    // This loop runs in the background
    while (BackgroundService.isRunning()) {
        Geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    if (tripId && tripType) {
                        // Trip-specific update
                        if (tripType === 'milk_truck') {
                            await milkTruckAPI.sendTripLocation(tripId, latitude, longitude);
                        } else {
                            await cattleFeedTruckAPI.sendTripLocation(tripId, latitude, longitude);
                        }
                    } else {
                        // General fleet status update
                        await gpsAPI.updateUserLocation(latitude, longitude);
                    }
                    console.log(`[Background] Location Sent:`, latitude, longitude);
                } catch (err) {
                    console.error(`[Background] Failed to send location:`, err);
                }
            },
            (error) => console.log(`[Background] Location Error:`, error),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );

        // Wait for 1 minute before next update (can be more frequent if needed)
        await sleep(60000);
    }
};

const options = {
    taskName: 'TripLocation',
    taskTitle: 'Trip In Progress',
    taskDesc: 'Your location is being shared with the owner.',
    taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
    },
    color: '#2baf2b', // Greenish color
    linkingURI: 'milktruck://dashboard', // Open app on tap
    parameters: {
        delay: 60000,
    },
    // Android specific configurations
    taskPriority: 'high', // Run with high priority
    addTaskToStickyNotifications: true, // Prevent notification removal
};

/**
 * Start background location service.
 * @param tripId - The ID of the active trip
 * @param tripType - 'cattle_feed_truck' or 'milk_truck'
 */
export const startBackgroundLocation = async (
    tripId: string,
    tripType: 'cattle_feed_truck' | 'milk_truck' = 'cattle_feed_truck'
) => {
    // If it's already running, stop and restart to ensure we use the tripId parameters
    if (BackgroundService.isRunning()) {
        await BackgroundService.stop();
    }

    try {
        await BackgroundService.start(locationTask as any, {
            ...options,
            parameters: { tripId, tripType }
        });
        console.log(`[Background] Service started for ${tripType} trip: ${tripId}`);
    } catch (e) {
        console.error('[Background] Error starting service:', e);
    }
};

/**
 * Start background location service for general fleet tracking.
 */
export const startGeneralFleetTracking = async () => {
    // If it's already running (likely for a trip), don't disturb it.
    if (BackgroundService.isRunning()) return;

    try {
        await BackgroundService.start(locationTask as any, {
            ...options,
            taskTitle: 'Live Fleet Tracking',
            taskDesc: 'Your location is shared with the owner for live tracking.',
            parameters: {} // Empty parameters triggers general user update
        });
        console.log('[Background] General fleet tracking service started');
    } catch (e) {
        console.error('[Background] Error starting service:', e);
    }
};

/**
 * Stop background location service.
 */
export const stopBackgroundLocation = async () => {
    if (BackgroundService.isRunning()) {
        await BackgroundService.stop();
        console.log('[Background] Service stopped');
    }
};
