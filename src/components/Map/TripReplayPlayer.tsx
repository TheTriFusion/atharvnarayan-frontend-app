import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export interface TripReplayPlayerProps {
    locationHistory: { latitude: number; longitude: number; timestamp: string }[];
    driverName?: string;
    startTime?: string;
    endTime?: string;
}

export default function TripReplayPlayer({
    locationHistory = [],
    driverName = 'Driver',
    startTime,
    endTime,
}: TripReplayPlayerProps) {
    const mapRef = useRef<MapView>(null);
    const [frameIndex, setFrameIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(2);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const safePoints = locationHistory
        .filter(p => p.latitude && p.longitude)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const totalFrames = safePoints.length;
    const currentPoint = safePoints[frameIndex] || null;

    useEffect(() => {
        if (safePoints.length >= 2 && mapRef.current) {
            mapRef.current.fitToCoordinates(safePoints, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
    }, [safePoints.length]);

    useEffect(() => {
        if (playing && totalFrames > 0) {
            const computeDelay = () => {
                if (frameIndex >= totalFrames - 1) return 500;
                const a = new Date(safePoints[frameIndex].timestamp).getTime();
                const b = new Date(safePoints[frameIndex + 1].timestamp).getTime();
                const realGapMs = b - a;
                // compress time, limit max delay so it doesn't freeze
                return Math.max(30, Math.min(1500, realGapMs / (speed * 10)));
            };

            intervalRef.current = setTimeout(() => {
                setFrameIndex(prev => {
                    if (prev >= totalFrames - 1) {
                        setPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, computeDelay());
        }

        return () => {
            if (intervalRef.current) clearTimeout(intervalRef.current);
        };
    }, [playing, frameIndex, speed, totalFrames, safePoints]);

    // Animate map when marker moves
    useEffect(() => {
        if (playing && currentPoint && mapRef.current) {
            mapRef.current.animateCamera({
                center: { latitude: currentPoint.latitude, longitude: currentPoint.longitude },
                zoom: 15,
            }, { duration: Math.max(30, 1000 / speed) });
        }
    }, [currentPoint, playing, speed]);

    const handlePlayPause = () => {
        if (frameIndex >= totalFrames - 1) {
            setFrameIndex(0);
            setTimeout(() => setPlaying(true), 100);
        } else {
            setPlaying(!playing);
        }
    };

    const cycleSpeed = () => {
        const speeds = [1, 2, 4, 8];
        const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
        setSpeed(speeds[nextIdx]);
    };

    if (totalFrames < 2) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Not enough GPS points for replay ({totalFrames})</Text>
            </View>
        );
    }

    const formatTime = (iso: string) => {
        if (!iso) return '--:--';
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const diffMins = startTime && endTime
        ? (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000
        : null;

    const coordsForMap = safePoints.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
    const traveledCoords = safePoints.slice(0, frameIndex + 1).map(p => ({ latitude: p.latitude, longitude: p.longitude }));
    const notTraveledCoords = safePoints.slice(frameIndex).map(p => ({ latitude: p.latitude, longitude: p.longitude }));

    return (
        <View style={styles.container}>
            <View style={styles.mapWrapper}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={{
                        latitude: safePoints[0].latitude,
                        longitude: safePoints[0].longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                >
                    {/* Untraveled Path (Gray / Dashed) */}
                    {notTraveledCoords.length >= 2 && (
                        <Polyline coordinates={notTraveledCoords} strokeColor="#D1D5DB" strokeWidth={3} lineDashPattern={[6, 4]} />
                    )}
                    {/* Traveled Path (Blue / Solid) */}
                    {traveledCoords.length >= 2 && (
                        <Polyline coordinates={traveledCoords} strokeColor="#3B82F6" strokeWidth={5} />
                    )}

                    {/* Start/End Markers */}
                    <Marker coordinate={coordsForMap[0]} pinColor="#10B981" title={`Start: ${formatTime(safePoints[0].timestamp)}`} />
                    <Marker coordinate={coordsForMap[totalFrames - 1]} pinColor="#EF4444" title={`End: ${formatTime(safePoints[totalFrames - 1].timestamp)}`} />

                    {/* Live Truck Marker */}
                    {currentPoint && (
                        <Marker coordinate={{ latitude: currentPoint.latitude, longitude: currentPoint.longitude }} anchor={{ x: 0.5, y: 0.5 }}>
                            <View style={styles.truckMarker}>
                                <Text style={{ fontSize: 16 }}>🚛</Text>
                            </View>
                        </Marker>
                    )}
                </MapView>

                {/* Overlays */}
                {currentPoint && (
                    <View style={styles.timeOverlay}>
                        <Text style={styles.timeOverlayLabel}>Current Time</Text>
                        <Text style={styles.timeOverlayValue}>{formatTime(currentPoint.timestamp)}</Text>
                    </View>
                )}
                <View style={styles.progressOverlay}>
                    <Text style={styles.progressOverlayText}>{frameIndex + 1}/{totalFrames}</Text>
                </View>
            </View>

            {/* Controls */}
            <View style={styles.controlsContainer}>
                {/* Progress Bar */}
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${(frameIndex / (totalFrames - 1)) * 100}%` }]} />
                </View>

                <View style={styles.controlsRow}>
                    <View style={styles.leftControls}>
                        <TouchableOpacity onPress={() => { setFrameIndex(0); setPlaying(false); }} style={styles.iconBtn}>
                            <Icon name="skip-backward" size={24} color="#9CA3AF" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handlePlayPause} style={styles.playBtn}>
                            <Icon name={playing ? "pause" : "play"} size={28} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={cycleSpeed} style={styles.speedBtn}>
                            <Text style={styles.speedBtnText}>{speed}x</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.rightStats}>
                        <Text style={styles.statText} numberOfLines={1}>🚛 {driverName}</Text>
                        {diffMins !== null && (
                            <Text style={styles.statText}>⏱ {Math.floor(diffMins)}m</Text>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 20,
    },
    mapWrapper: {
        height: 250,
        position: 'relative',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    emptyContainer: {
        height: 250,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    emptyText: {
        color: '#6B7280',
        fontWeight: '500',
    },
    truckMarker: {
        width: 36,
        height: 36,
        backgroundColor: '#3B82F6',
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    timeOverlay: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        elevation: 2,
    },
    timeOverlayLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#6B7280',
        textTransform: 'uppercase',
    },
    timeOverlayValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1D4ED8',
    },
    progressOverlay: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        elevation: 2,
    },
    progressOverlayText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6D28D9',
    },
    controlsContainer: {
        backgroundColor: '#111827',
        padding: 12,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#374151',
        borderRadius: 2,
        marginBottom: 12,
    },
    progressBarFill: {
        height: 4,
        backgroundColor: '#3B82F6',
        borderRadius: 2,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconBtn: {
        padding: 4,
    },
    playBtn: {
        width: 44,
        height: 44,
        backgroundColor: '#2563EB',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    speedBtn: {
        backgroundColor: '#374151',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    speedBtnText: {
        color: '#D1D5DB',
        fontWeight: 'bold',
        fontSize: 12,
    },
    rightStats: {
        alignItems: 'flex-end',
    },
    statText: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '500',
        maxWidth: 100,
    },
});
