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
