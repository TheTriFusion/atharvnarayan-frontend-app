import { NativeModules, Platform } from 'react-native';
import API_BASE_URL from '../config/api';

const { TripLocationModule } = NativeModules;

export type TripType = 'cattle_feed_truck' | 'milk_truck';

/**
 * Start background location service (Android only).
 * Location keeps sending to backend while trip is active, even when app is closed or screen is off.
 * @param tripType - 'cattle_feed_truck' | 'milk_truck'
 */
export function startTripLocationService(
  tripId: string,
  authToken: string,
  tripType: TripType = 'cattle_feed_truck'
): void {
  if (Platform.OS !== 'android' || !TripLocationModule) return;
  try {
    TripLocationModule.startTripLocationService(tripId, authToken, API_BASE_URL, tripType);
  } catch (e) {
    console.warn('startTripLocationService error', e);
  }
}

/**
 * Stop background location service (Android only).
 */
export function stopTripLocationService(): void {
  if (Platform.OS !== 'android' || !TripLocationModule) return;
  try {
    TripLocationModule.stopTripLocationService();
  } catch (e) {
    console.warn('stopTripLocationService error', e);
  }
}

/**
 * Retrieves and clears the locally cached GPS points from the native foreground service (Android only)
 * so they can be synced to the backend by the JS background loop.
 */
export async function syncNativeOfflineQueue(tripId: string): Promise<string> {
  if (Platform.OS !== 'android' || !TripLocationModule) return '[]';
  try {
    return await TripLocationModule.syncNativeOfflineQueue(tripId);
  } catch (e) {
    console.warn('syncNativeOfflineQueue error', e);
    return '[]';
  }
}
