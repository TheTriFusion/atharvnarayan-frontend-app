import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

export interface Coord {
  latitude: number;
  longitude: number;
}

interface DriverPathMapProps {
  coordinates: Coord[];
  followUser?: boolean;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  style?: object;
  distance?: number;
}

export default function DriverPathMap({
  coordinates = [],
  followUser = true,
  initialRegion,
  style,
  distance,
}: DriverPathMapProps) {
  const mapRef = useRef<MapView>(null);
  const safeCoords = Array.isArray(coordinates) ? coordinates : [];
  const lastCoord = safeCoords[safeCoords.length - 1];

  useEffect(() => {
    if (!followUser || !lastCoord || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: lastCoord.latitude,
        longitude: lastCoord.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      300
    );
  }, [lastCoord?.latitude, lastCoord?.longitude, followUser]);

  const defaultRegion = {
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 8,
    longitudeDelta: 8,
  };
  const region =
    initialRegion ??
    (lastCoord
      ? {
        latitude: lastCoord.latitude,
        longitude: lastCoord.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
      : defaultRegion);

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation
        followsUserLocation={followUser}
        showsMyLocationButton
      >
        {safeCoords.length >= 2 && (
          <Polyline
            coordinates={safeCoords}
            strokeColor="#3B82F6"
            strokeWidth={4}
          />
        )}
      </MapView>
      {distance !== undefined && (
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>{distance.toFixed(2)} km</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 200, position: 'relative' },
  distanceBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1D4ED8',
  },
});
