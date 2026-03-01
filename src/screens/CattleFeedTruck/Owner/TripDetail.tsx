import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../../contexts/AuthContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import ScreenHeader from '../../../components/common/ScreenHeader';
import DriverPathMap, { Coord } from '../../../components/DriverPathMap';
import Card from '../../../components/common/Card';
import { calculateTotalDistance } from '../../../utils/distance';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';

const CattleFeedTruckOwnerTripDetail: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const tripId = route.params?.tripId;

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      navigation.goBack();
      return;
    }
    setError(null);
    const load = async () => {
      try {
        const data = await cattleFeedTruckAPI.getTrip(tripId);
        setTrip(data?.data ?? data);
      } catch (e: any) {
        console.error('Trip detail load error:', e);
        setError(e?.message || 'Failed to load trip');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tripId, navigation]);

  const pathCoordinates: Coord[] = (trip?.locationHistory ?? [])
    .map((p: any) => ({
      latitude: p.latitude ?? p.lat,
      longitude: p.longitude ?? p.lng,
    }))
    .filter((p: Coord) => typeof p.latitude === 'number' && typeof p.longitude === 'number');

  const totalDistance = calculateTotalDistance(pathCoordinates);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading trip...</Text>
      </View>
    );
  }
  if (error || !trip) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error || 'Trip not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[colors.primary[600], colors.primary[400], colors.background.primary]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
      />
      <ScreenHeader
        title="Trip path"
        subtitle={`${trip.from || 'Source'} → ${trip.to || 'Destination'}`}
        showBackButton
        transparent
        titleStyle={{ color: '#fff' }}
        subtitleStyle={{ color: 'rgba(255,255,255,0.9)' }}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.mapCard}>
          <Text style={styles.mapTitle}>Driver path (history)</Text>
          <View style={styles.mapWrapper}>
            <DriverPathMap
              coordinates={pathCoordinates}
              followUser={false}
              initialRegion={{
                latitude: pathCoordinates[0]?.latitude ?? 20.5937,
                longitude: pathCoordinates[0]?.longitude ?? 78.9629,
                latitudeDelta: pathCoordinates.length >= 2 ? 0.05 : 8,
                longitudeDelta: pathCoordinates.length >= 2 ? 0.05 : 8,
              }}
              distance={totalDistance}
              style={styles.map}
            />
          </View>
          {pathCoordinates.length === 0 && (
            <Text style={styles.noPath}>No path recorded for this trip.</Text>
          )}
        </Card>
        <View style={styles.meta}>
          <Text style={styles.metaText}>Status: {trip.status ?? '—'}</Text>
          <Text style={styles.metaText}>Points: {pathCoordinates.length}</Text>
          <Text style={[styles.metaText, styles.distanceText]}>Distance: {totalDistance.toFixed(2)} km</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  gradient: { position: 'absolute', left: 0, right: 0, top: 0, height: 200 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  loadingText: { marginTop: 8, color: colors.text.secondary },
  errorText: { color: colors.error?.[600] || '#b91c1c', textAlign: 'center', marginBottom: 12 },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.primary[500], borderRadius: 8 },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },
  mapCard: { overflow: 'hidden', borderRadius: borderRadius.lg },
  mapTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: colors.text.primary },
  mapWrapper: { height: 280, width: '100%' },
  map: { flex: 1, width: '100%', height: '100%', borderRadius: borderRadius.md },
  noPath: { padding: spacing.md, color: colors.text.tertiary, textAlign: 'center' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  metaText: { fontSize: 13, color: colors.text.tertiary, fontWeight: '500' },
  distanceText: { color: colors.primary[600], fontWeight: 'bold' },
});

export default CattleFeedTruckOwnerTripDetail;
