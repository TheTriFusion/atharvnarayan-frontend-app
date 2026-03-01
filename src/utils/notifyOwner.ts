import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const notifiedForTripStop = new Map<string, boolean>();

function key(tripId: string, stopId: string) {
  return `${tripId}:${stopId}`;
}

/**
 * Notify owner when driver enters collection point (geofence).
 * Throttled: only one request per trip + stopId so owner is not spammed.
 */
export async function notifyOwnerAtCollection(
  tripId: string,
  driverName: string,
  stopId: string
): Promise<void> {
  const k = key(tripId, stopId);
  if (notifiedForTripStop.get(k)) return;

  try {
    await api.post('/notify-owner', { tripId, driverName, stopId });
    notifiedForTripStop.set(k, true);
  } catch (e) {
    console.warn('notify-owner failed', e);
  }
}

export function clearNotifyOwnerThrottle(tripId: string) {
  for (const k of notifiedForTripStop.keys()) {
    if (k.startsWith(`${tripId}:`)) notifiedForTripStop.delete(k);
  }
}

/** Distance in meters between two lat/lng points (Haversine approximation). */
export function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const METERS_PER_DEGREE_APPROX = 111320;
  const dLat = (lat2 - lat1) * METERS_PER_DEGREE_APPROX;
  const dLng =
    (lng2 - lng1) *
    (METERS_PER_DEGREE_APPROX * Math.cos((lat1 * Math.PI) / 180));
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export interface CollectionPoint {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}

const DEFAULT_RADIUS_METERS = 150;

/**
 * Check if (lat, lng) is inside any collection point and call notifyOwnerAtCollection
 * once per point (throttled).
 */
export function checkGeofenceAndNotify(
  tripId: string,
  driverName: string,
  lat: number,
  lng: number,
  collectionPoints: CollectionPoint[]
) {
  for (const point of collectionPoints) {
    const radius = point.radiusMeters ?? DEFAULT_RADIUS_METERS;
    const dist = getDistanceMeters(lat, lng, point.latitude, point.longitude);
    if (dist <= radius) {
      notifyOwnerAtCollection(tripId, driverName, point.id);
    }
  }
}
