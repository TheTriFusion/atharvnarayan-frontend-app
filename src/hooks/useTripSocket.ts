import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';

const EMIT_INTERVAL_METERS = 10;
const METERS_PER_DEGREE_APPROX = 111320;

function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = (lat2 - lat1) * METERS_PER_DEGREE_APPROX;
  const dLng =
    (lng2 - lng1) *
    (METERS_PER_DEGREE_APPROX * Math.cos((lat1 * Math.PI) / 180));
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export function useTripSocket(tripId: string | null, enabled: boolean) {
  const { socket, connected } = useSocket();
  const lastEmittedRef = useRef<{ lat: number; lng: number } | null>(null);

  const joinTripRoom = useCallback((roomTripId: string) => {
    if (socket && connected) {
      socket.emit('join_trip_room', { tripId: roomTripId });
    }
  }, [socket, connected]);

  const emitLocation = useCallback(
    (lat: number, lng: number, driverId?: string) => {
      if (!socket || !connected || !tripId) return;

      const last = lastEmittedRef.current;
      if (
        last &&
        getDistanceMeters(last.lat, last.lng, lat, lng) < EMIT_INTERVAL_METERS
      ) {
        return;
      }

      lastEmittedRef.current = { lat, lng };
      socket.emit('driver_location', { tripId, lat, lng, driverId });
    },
    [socket, connected, tripId]
  );

  useEffect(() => {
    if (!enabled || !tripId || !socket || !connected) return;

    joinTripRoom(tripId);

    return () => {
      lastEmittedRef.current = null;
    };
  }, [enabled, tripId, socket, connected, joinTripRoom]);

  return { joinTripRoom, emitLocation, socket };
}
