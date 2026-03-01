import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export interface FleetMember {
    id: string;
    name: string;
    inTrip: boolean;
    location: {
        latitude: number;
        longitude: number;
        updatedAt?: string;
    } | null;
    phone?: string;
}

interface FleetMapProps {
    members: FleetMember[];
    style?: object;
    initialRegion?: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
}

function getTimeAgo(dateString?: string) {
    if (!dateString) return 'Unknown';
    try {
        const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(dateString).toLocaleDateString();
    } catch (e) {
        return 'Recently';
    }
}

export default function FleetMap({
    members = [],
    style,
    initialRegion,
}: FleetMapProps) {
    const mapRef = useRef<MapView>(null);

    // Filter members with valid locations
    const membersWithLocation = members.filter(
        (m) => m.location && typeof m.location.latitude === 'number' && typeof m.location.longitude === 'number'
    );

    useEffect(() => {
        if (membersWithLocation.length > 0 && mapRef.current) {
            const coords = membersWithLocation.map((m) => ({
                latitude: m.location!.latitude,
                longitude: m.location!.longitude,
            }));

            // If we have markers, fit to them
            if (coords.length > 0) {
                mapRef.current.fitToCoordinates(coords, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                });
            }
        }
    }, [membersWithLocation.length]);

    const defaultRegion = {
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 8,
        longitudeDelta: 8,
    };

    return (
        <View style={[styles.container, style]}>
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion || defaultRegion}
                showsUserLocation
                showsMyLocationButton
            >
                {membersWithLocation.map((member) => (
                    <Marker
                        key={member.id}
                        coordinate={{
                            latitude: member.location!.latitude,
                            longitude: member.location!.longitude,
                        }}
                        title={member.name}
                        description={member.inTrip ? 'In Trip' : 'Available'}
                        pinColor={member.inTrip ? '#10B981' : '#F59E0B'} // Green if in trip, Orange if available
                    >
                        <View style={styles.markerContainer}>
                            <View style={[
                                styles.markerDot,
                                { backgroundColor: member.inTrip ? '#10B981' : '#F59E0B' }
                            ]} />
                            <View style={styles.bubble}>
                                <Text style={styles.nameText}>{member.name}</Text>
                                <Text style={styles.statusText}>{member.inTrip ? '🚛 IN TRIP' : '🅿️ READY'}</Text>
                                <Text style={styles.timeText}>🕒 {getTimeAgo(member.location!.updatedAt)}</Text>
                            </View>
                        </View>
                    </Marker>
                ))}
            </MapView>
            {membersWithLocation.length === 0 && (
                <View style={styles.emptyOverlay}>
                    <Text style={styles.emptyText}>No active locations found</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, minHeight: 300, position: 'relative', borderRadius: 12, overflow: 'hidden' },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: 'white',
        zIndex: 2,
    },
    bubble: {
        backgroundColor: 'white',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    nameText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#374151',
        textAlign: 'center',
    },
    statusText: {
        fontSize: 8,
        color: '#6B7280',
        textAlign: 'center',
    },
    timeText: {
        fontSize: 7,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 2,
    },
    emptyOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '500',
    }
});
