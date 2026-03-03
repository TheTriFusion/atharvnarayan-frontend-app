/**
 * offlineLocationCache.ts
 *
 * When the network is down during an active trip, GPS points that fail to
 * reach the backend are stored here (keyed by tripId).
 * A background sync loop watches for network recovery and flushes the queue
 * to the backend's batch endpoint, preserving every location with its original
 * timestamp → zero GPS gaps in the replay.
 *
 * Usage:
 *   cacheLocation(tripId, lat, lng, 'milk_truck')   // call instead of API on failure
 *   startOfflineSyncLoop(tripId, token, 'milk_truck') // call once when trip starts
 *   stopOfflineSyncLoop()                            // call when trip ends
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config/api';
import { syncNativeOfflineQueue } from './tripLocationService';

// ─── Types ────────────────────────────────────────────────────────────────────
export type TripType = 'milk_truck' | 'cattle_feed_truck';

interface CachedPoint {
    latitude: number;
    longitude: number;
    timestamp: string; // ISO string – preserves original time
}

// ─── AsyncStorage key ─────────────────────────────────────────────────────────
const storageKey = (tripId: string) => `@offline_loc_${tripId}`;

// ─── Cache a single point ─────────────────────────────────────────────────────
export async function cacheLocation(
    tripId: string,
    latitude: number,
    longitude: number
): Promise<void> {
    try {
        const key = storageKey(tripId);
        const raw = await AsyncStorage.getItem(key);
        const points: CachedPoint[] = raw ? JSON.parse(raw) : [];
        points.push({ latitude, longitude, timestamp: new Date().toISOString() });
        await AsyncStorage.setItem(key, JSON.stringify(points));
        console.log(`[OfflineCache] Cached point #${points.length} for trip ${tripId}`);
    } catch (e) {
        console.warn('[OfflineCache] Failed to cache point:', e);
    }
}

// ─── Flush cached points to backend (batch endpoint) ─────────────────────────
export async function flushCache(
    tripId: string,
    token: string,
    tripType: TripType
): Promise<boolean> {
    try {
        const key = storageKey(tripId);
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return true; // nothing to flush

        const points: CachedPoint[] = JSON.parse(raw);
        if (points.length === 0) return true;

        const routePrefix = tripType === 'milk_truck' ? 'milk-truck' : 'cattle-feed-truck';
        const url = `${API_BASE_URL}/${routePrefix}/trips/${tripId}/location/batch`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ points }),
        });

        if (res.ok) {
            await AsyncStorage.removeItem(key); // clear only on success
            console.log(`[OfflineCache] Flushed ${points.length} points for trip ${tripId}`);
            return true;
        }
        return false;
    } catch (e) {
        // Network still down – keep trying
        return false;
    }
}

// ─── Flush native offline queue (Android Service cache) ──────────────────────
export async function flushNativeCache(
    tripId: string,
    token: string,
    tripType: TripType
): Promise<boolean> {
    try {
        const nativeStr = await syncNativeOfflineQueue(tripId);
        if (!nativeStr || nativeStr === '[]') return true;

        const points: CachedPoint[] = JSON.parse(nativeStr);
        if (points.length === 0) return true;

        const routePrefix = tripType === 'milk_truck' ? 'milk-truck' : 'cattle-feed-truck';
        const url = `${API_BASE_URL}/${routePrefix}/trips/${tripId}/location/batch`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ points }),
        });

        if (res.ok) {
            console.log(`[OfflineCache] Flushed ${points.length} NATIVE background points for trip ${tripId}`);
            return true;
        } else {
            // Native queue is already cleared when read. If it fails, dump them into JS queue so we don't lose them
            const raw = await AsyncStorage.getItem(storageKey(tripId));
            const existingPoints: CachedPoint[] = raw ? JSON.parse(raw) : [];
            existingPoints.push(...points);
            await AsyncStorage.setItem(storageKey(tripId), JSON.stringify(existingPoints));
            return false;
        }
    } catch (e) {
        console.warn('Native cache flush failed', e);
        return false;
    }
}

// ─── Pending cache count (for UI badge) ──────────────────────────────────────
export async function getCachedCount(tripId: string): Promise<number> {
    try {
        const raw = await AsyncStorage.getItem(storageKey(tripId));
        if (!raw) return 0;
        return (JSON.parse(raw) as CachedPoint[]).length;
    } catch {
        return 0;
    }
}

// ─── Sync loop ────────────────────────────────────────────────────────────────
let syncInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start a periodic loop that checks for cached points and tries to flush them.
 * Should be called once when the trip starts.
 */
export function startOfflineSyncLoop(
    tripId: string,
    token: string,
    tripType: TripType,
    intervalMs = 15000 // retry every 15 s
): void {
    stopOfflineSyncLoop(); // clear any previous loop
    syncInterval = setInterval(async () => {
        // First sync native background queue if any
        await flushNativeCache(tripId, token, tripType);

        // Then sync JS queue
        const count = await getCachedCount(tripId);
        if (count > 0) {
            console.log(`[OfflineCache] Sync loop: ${count} cached points, attempting flush…`);
            await flushCache(tripId, token, tripType);
        }
    }, intervalMs);
}

/**
 * Stop the sync loop. Call when the trip completes or the component unmounts.
 */
export function stopOfflineSyncLoop(): void {
    if (syncInterval !== null) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

/**
 * Smart send: try the single-point endpoint; on failure, cache locally.
 * Returns true if sent online, false if cached offline.
 */
export async function smartSendLocation(
    tripId: string,
    latitude: number,
    longitude: number,
    token: string,
    tripType: TripType
): Promise<boolean> {
    const routePrefix = tripType === 'milk_truck' ? 'milk-truck' : 'cattle-feed-truck';
    const url = `${API_BASE_URL}/${routePrefix}/trips/${tripId}/location`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ latitude, longitude }),
        });
        if (res.ok) return true;
        // Server responded with error → cache locally
        await cacheLocation(tripId, latitude, longitude);
        return false;
    } catch {
        // Network unreachable → cache locally
        await cacheLocation(tripId, latitude, longitude);
        return false;
    }
}
