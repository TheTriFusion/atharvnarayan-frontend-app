import { useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';

export interface OwnerNotificationPayload {
  tripId: string;
  driverName: string;
  stopId: string | null;
  tripType?: string;
  at: string;
}

interface UseOwnerTripSocketOptions {
  activeTripIds: string[];
  ownerId: string | null;
  onDriverLocation: (lat: number, lng: number, driverId?: string, tripId?: string) => void;
  onOwnerNotification?: (payload: OwnerNotificationPayload) => void;
  enabled?: boolean;
}

/**
 * Use the global socket to join trip rooms and listen for updates.
 */
export function useOwnerTripSocket({
  activeTripIds,
  ownerId,
  onDriverLocation,
  onOwnerNotification,
  enabled = true,
}: UseOwnerTripSocketOptions) {
  const { socket, connected } = useSocket();
  const onDriverLocationRef = useRef(onDriverLocation);
  const onOwnerNotificationRef = useRef(onOwnerNotification);

  onDriverLocationRef.current = onDriverLocation;
  onOwnerNotificationRef.current = onOwnerNotification ?? (() => { });

  useEffect(() => {
    if (!socket || !connected || !enabled) return;

    // Join rooms
    activeTripIds.forEach((tripId) => {
      if (tripId) socket.emit('join_trip_room', { tripId });
    });
    if (ownerId) {
      socket.emit('join_owner_room', { ownerId });
    }

    // Listen for location updates
    const handleLocation = (data: any) => {
      const { lat, lng, driverId, tripId } = data ?? {};
      if (typeof lat === 'number' && typeof lng === 'number') {
        onDriverLocationRef.current(lat, lng, driverId, tripId);
      }
    };

    // Listen for notifications
    const handleNotification = (payload: OwnerNotificationPayload) => {
      if (onOwnerNotificationRef.current) {
        onOwnerNotificationRef.current(payload);
      }
    };

    socket.on('driver_location', handleLocation);
    socket.on('owner_notification', handleNotification);

    return () => {
      socket.off('driver_location', handleLocation);
      socket.off('owner_notification', handleNotification);
    };
  }, [socket, connected, enabled, ownerId, activeTripIds.join(',')]);
}
