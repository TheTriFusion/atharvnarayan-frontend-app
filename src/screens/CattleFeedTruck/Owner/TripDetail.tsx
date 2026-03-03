import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Platform, StatusBar, Image as RNImage, Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../../contexts/AuthContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import { getImageUrl } from '../../../utils/api';
import ScreenHeader from '../../../components/common/ScreenHeader';
import DriverPathMap, { Coord } from '../../../components/DriverPathMap';
import TripReplayPlayer from '../../../components/Map/TripReplayPlayer';
import Card from '../../../components/common/Card';
import { calculateTotalDistance } from '../../../utils/distance';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';

// ─── Status helpers ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  loading: '#3B82F6',
  in_transit: '#8B5CF6',
  completed: '#10B981',
  cancelled: '#EF4444',
};
const STATUS_BG: Record<string, string> = {
  pending: '#FEF3C7',
  loading: '#DBEAFE',
  in_transit: '#EDE9FE',
  completed: '#D1FAE5',
  cancelled: '#FEE2E2',
};

// ─── Image lightbox ───────────────────────────────────────────────────────────
const ImageViewer = ({ uri, visible, onClose }: { uri: string; visible: boolean; onClose: () => void }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={imgStyles.overlay} activeOpacity={1} onPress={onClose}>
      <View style={imgStyles.box}>
        <RNImage source={{ uri }} style={imgStyles.img} resizeMode="contain" />
        <TouchableOpacity style={imgStyles.closeBtn} onPress={onClose}>
          <Text style={imgStyles.closeTxt}>✕ Close</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

const imgStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  box: { width: '92%', height: '70%', alignItems: 'center' },
  img: { width: '100%', height: '100%', borderRadius: 12 },
  closeBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 },
  closeTxt: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});

// ─── Main Component ───────────────────────────────────────────────────────────
const CattleFeedTruckOwnerTripDetail: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const tripId = route.params?.tripId;

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) { navigation.goBack(); return; }
    setError(null);
    const load = async () => {
      try {
        const data = await cattleFeedTruckAPI.getTrip(tripId);
        setTrip(data?.data ?? data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load trip');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tripId]);

  const pathCoordinates: Coord[] = (trip?.locationHistory ?? [])
    .map((p: any) => ({ latitude: p.latitude ?? p.lat, longitude: p.longitude ?? p.lng }))
    .filter((p: Coord) => typeof p.latitude === 'number' && typeof p.longitude === 'number');

  const totalDistance = calculateTotalDistance(pathCoordinates);

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={colors.primary[500]} />
      <Text style={s.loadingTxt}>Loading trip details...</Text>
    </View>
  );
  if (error || !trip) return (
    <View style={s.center}>
      <Text style={s.errorTxt}>{error || 'Trip not found'}</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.retryBtn}>
        <Text style={s.retryTxt}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  // Summaries
  const deliveries = trip.deliveryEntries || [];
  const completedDeliveries = deliveries.filter((d: any) => !!d.actualDelivery?.deliveredAt);
  const totalLoaded = trip.summary?.totalQuantityLoaded || trip.tripDetails?.quantity || 0;
  const totalDelivered = trip.summary?.totalQuantityDelivered || 0;
  const totalAmount = trip.summary?.totalAmount || 0;
  const totalAmountCollected = trip.summary?.totalAmountCollected || 0;
  const expenses = trip.summary?.expenses || {};

  // Collect all images with labels
  const allPhotos: { label: string; url: string }[] = [];
  deliveries.forEach((entry: any, idx: number) => {
    const loc = entry.deliveryPointId?.name || entry.notes || `Stop ${idx + 1}`;
    if (entry.actualDelivery?.signature) {
      const url = getImageUrl(entry.actualDelivery.signature);
      if (url) allPhotos.push({ label: `${loc}\nProof`, url });
    }
  });

  const statusColor = STATUS_COLORS[trip.status] || '#6B7280';
  const statusBg = STATUS_BG[trip.status] || '#F3F4F6';
  const displayId = (trip._id || trip.id || '').toString().slice(-6).toUpperCase();

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[colors.primary[700], colors.primary[500], colors.background.primary]}
        style={s.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.55 }}
      />

      <ScreenHeader
        title="Trip Detail"
        subtitle={`${trip.from || 'From'} → ${trip.to || 'To'}`}
        showBackButton
        transparent
        titleStyle={{ color: '#fff' }}
        subtitleStyle={{ color: 'rgba(255,255,255,0.85)' }}
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Status Strip ── */}
        <View style={[s.statusStrip, { backgroundColor: statusBg }]}>
          <View style={[s.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[s.statusTxt, { color: statusColor }]}>
            {trip.status?.replace(/_/g, ' ').toUpperCase()}
          </Text>
          <Text style={s.tripIdTxt}>  #TRP-{displayId}</Text>
          <View style={s.spacer} />
          <Text style={s.dateTxt}>
            {new Date(trip.date || trip.startTime || trip.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>

        {/* ── Summary Stats ── */}
        <View style={s.statsRow}>
          {[
            { label: 'Bags Loaded', value: `${totalLoaded}`, sub: 'bags', color: colors.primary[600] },
            { label: 'Delivered', value: `${totalDelivered}`, sub: 'bags', color: '#10B981' },
            { label: 'Stops', value: `${completedDeliveries.length}/${deliveries.length}`, sub: 'done', color: '#8B5CF6' },
            { label: 'Distance', value: totalDistance > 0 ? totalDistance.toFixed(1) : (trip.summary?.totalKm || trip.tripDetails?.distance || 0), sub: 'km', color: '#F59E0B' },
          ].map((stat, i) => (
            <View key={i} style={s.statCard}>
              <Text style={[s.statVal, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.statSub}>{stat.sub}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Driver & Vehicle Info ── */}
        <Card style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Driver</Text>
              <Text style={s.infoVal}>{trip.driverId?.name || '—'}</Text>
              {trip.driverId?.phoneNumber && <Text style={s.infoSub}>📞 {trip.driverId.phoneNumber}</Text>}
            </View>
            <View style={s.dividerV} />
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Vehicle</Text>
              <Text style={s.infoVal}>{trip.vehicleId?.registrationNumber || '—'}</Text>
              {trip.vehicleId?.vehicleType && <Text style={s.infoSub}>{trip.vehicleId.vehicleType}</Text>}
            </View>
          </View>
          {trip.helper?.name && (
            <View style={s.helperRow}>
              <Text style={s.helperTxt}>👤 Helper: <Text style={{ fontWeight: '700' }}>{trip.helper.name}</Text>
                {trip.helper.phoneNumber ? `  📞 ${trip.helper.phoneNumber}` : ''}
              </Text>
            </View>
          )}
        </Card>

        {/* ── Revenue Summary ── */}
        {(totalAmount > 0 || totalAmountCollected > 0) && (
          <LinearGradient colors={['#065F46', '#10B981']} style={s.revenueCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={s.revenueTitle}>💰 Revenue</Text>
            <View style={s.revenueRow}>
              <View style={s.revItem}>
                <Text style={s.revLabel}>Total Billed</Text>
                <Text style={s.revVal}>₹{totalAmount.toFixed(0)}</Text>
              </View>
              <View style={s.revDivider} />
              <View style={s.revItem}>
                <Text style={s.revLabel}>Collected</Text>
                <Text style={s.revVal}>₹{totalAmountCollected.toFixed(0)}</Text>
              </View>
              <View style={s.revDivider} />
              <View style={s.revItem}>
                <Text style={s.revLabel}>Pending</Text>
                <Text style={[s.revVal, { color: '#FDE68A' }]}>₹{(totalAmount - totalAmountCollected).toFixed(0)}</Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* ── Route Map ── */}
        <Card style={s.mapCard}>
          <Text style={s.mapTitle}>📍 Trip Route Map & Replay</Text>
          {pathCoordinates.length >= 2 ? (
            <View style={s.replayWrapper}>
              <TripReplayPlayer
                locationHistory={trip.locationHistory || []}
                driverName={trip.driverId?.name || 'Driver'}
                startTime={trip.startTime}
                endTime={trip.endTime}
              />
            </View>
          ) : (
            <View style={s.mapWrapper}>
              <DriverPathMap
                coordinates={pathCoordinates}
                followUser={false}
                initialRegion={{
                  latitude: pathCoordinates[0]?.latitude ?? 20.5937,
                  longitude: pathCoordinates[0]?.longitude ?? 78.9629,
                  latitudeDelta: 8,
                  longitudeDelta: 8,
                }}
                distance={0}
                style={s.map}
              />
              <View style={s.noPath}>
                <Text style={s.noPathTxt}>No GPS path recorded for this trip.</Text>
              </View>
            </View>
          )}
        </Card>

        {/* ── Delivery Stops ── */}
        {deliveries.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Delivery Stops ({deliveries.length})</Text>
            </View>
            {deliveries.map((entry: any, idx: number) => {
              const loc = entry.deliveryPointId?.name || entry.notes || `Stop ${idx + 1}`;
              const isDelivered = !!entry.actualDelivery?.deliveredAt;
              const actualItems = entry.actualDelivery?.feedItems || [];
              const plannedItems = entry.plannedDelivery?.feedItems || [];
              const items = actualItems.length > 0 ? actualItems : plannedItems;
              const totalQty = items.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
              const signatureUrl = entry.actualDelivery?.signature ? getImageUrl(entry.actualDelivery.signature) : null;

              return (
                <Card key={idx} style={[s.stopCard, { borderLeftWidth: 4, borderLeftColor: isDelivered ? '#10B981' : '#D1D5DB' }]}>
                  <View style={s.stopHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.stopName}>{loc}</Text>
                      {entry.deliveryPointId?.location && (
                        <Text style={s.stopAddr} numberOfLines={1}>📍 {entry.deliveryPointId.location}</Text>
                      )}
                    </View>
                    <View style={[s.stopBadge, { backgroundColor: isDelivered ? '#D1FAE5' : '#FEF3C7' }]}>
                      <Text style={[s.stopBadgeTxt, { color: isDelivered ? '#065F46' : '#92400E' }]}>
                        {isDelivered ? '✓ Done' : '⏳ Pending'}
                      </Text>
                    </View>
                  </View>

                  {/* Feed Items */}
                  {items.length > 0 && (
                    <View style={s.feedItems}>
                      {items.map((item: any, ii: number) => (
                        <View key={ii} style={s.feedRow}>
                          <Text style={s.feedName} numberOfLines={1}>{item.feedType || 'Cattle Feed'}</Text>
                          <Text style={s.feedQty}>{item.quantity} {item.unit || 'bags'}</Text>
                          {item.pricePerUnit > 0 && <Text style={s.feedPrice}>₹{(item.quantity * item.pricePerUnit).toFixed(0)}</Text>}
                        </View>
                      ))}
                      <View style={s.feedDivider} />
                      <View style={[s.feedRow, { marginTop: 2 }]}>
                        <Text style={[s.feedName, { fontWeight: '700', color: '#1F2937' }]}>Total</Text>
                        <Text style={[s.feedQty, { fontWeight: '700', color: '#1F2937' }]}>{totalQty} bags</Text>
                        {entry.actualDelivery?.totalAmount > 0 && (
                          <Text style={[s.feedPrice, { fontWeight: '700', color: '#059669' }]}>
                            ₹{entry.actualDelivery.totalAmount.toFixed(0)}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Payment Status */}
                  {entry.payment && (
                    <View style={s.payRow}>
                      <Text style={s.payLabel}>Payment:</Text>
                      <View style={[s.payBadge, {
                        backgroundColor: entry.payment.paymentStatus === 'paid' ? '#D1FAE5' :
                          entry.payment.paymentStatus === 'partial' ? '#FEF3C7' : '#FEE2E2'
                      }]}>
                        <Text style={[s.payBadgeTxt, {
                          color: entry.payment.paymentStatus === 'paid' ? '#065F46' :
                            entry.payment.paymentStatus === 'partial' ? '#92400E' : '#991B1B'
                        }]}>
                          {(entry.payment.paymentStatus || 'pending').toUpperCase()} · {entry.payment.method || 'cash'}
                        </Text>
                      </View>
                      {entry.payment.amountPaid > 0 && (
                        <Text style={s.payAmt}>₹{entry.payment.amountPaid}</Text>
                      )}
                    </View>
                  )}

                  {/* Received By + Delivery Time */}
                  {isDelivered && (
                    <View style={s.deliveredMeta}>
                      {entry.actualDelivery.receivedBy && (
                        <Text style={s.deliveredMetaTxt}>👤 Received by: {entry.actualDelivery.receivedBy}</Text>
                      )}
                      <Text style={s.deliveredMetaTxt}>
                        🕐 {new Date(entry.actualDelivery.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  )}

                  {/* Signature / Proof Image */}
                  {signatureUrl && (
                    <TouchableOpacity
                      style={s.proofRow}
                      onPress={() => setViewImage(signatureUrl)}
                      activeOpacity={0.8}
                    >
                      <RNImage source={{ uri: signatureUrl }} style={s.proofThumb} />
                      <View style={s.proofInfo}>
                        <Text style={s.proofLabel}>Delivery Proof</Text>
                        <Text style={s.proofTap}>Tap to view full image 🔍</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </Card>
              );
            })}
          </>
        )}

        {/* ── Trip Photos Gallery ── */}
        {allPhotos.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>📸 Trip Photos</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.galleryRow}
            >
              {allPhotos.map((photo, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={s.galleryItem}
                  onPress={() => setViewImage(photo.url)}
                  activeOpacity={0.85}
                >
                  <RNImage source={{ uri: photo.url }} style={s.galleryThumb} resizeMode="cover" />
                  <View style={s.galleryLabelBox}>
                    <Text style={s.galleryLabelTxt} numberOfLines={2}>{photo.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Expenses ── */}
        {expenses.totalExpenses > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>💸 Expenses</Text>
            </View>
            <Card style={s.expCard}>
              {[
                { k: 'Fuel', v: expenses.fuel },
                { k: 'Toll', v: expenses.toll },
                { k: 'Food', v: expenses.food },
                { k: 'Maintenance', v: expenses.maintenance },
                { k: 'Other', v: expenses.other },
              ].filter(e => e.v > 0).map((e, i) => (
                <View key={i} style={s.expRow}>
                  <Text style={s.expLabel}>{e.k}</Text>
                  <Text style={s.expVal}>₹{e.v.toFixed(0)}</Text>
                </View>
              ))}
              <View style={s.expDivider} />
              <View style={s.expRow}>
                <Text style={[s.expLabel, { fontWeight: '700', fontSize: 14 }]}>Total Expenses</Text>
                <Text style={[s.expVal, { fontWeight: '700', fontSize: 14, color: '#DC2626' }]}>₹{expenses.totalExpenses.toFixed(0)}</Text>
              </View>
            </Card>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Fullscreen Image Viewer */}
      <ImageViewer uri={viewImage || ''} visible={!!viewImage} onClose={() => setViewImage(null)} />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  gradient: { position: 'absolute', left: 0, right: 0, top: 0, height: 220 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  loadingTxt: { marginTop: 10, color: colors.text.secondary, fontWeight: '500' },
  errorTxt: { color: '#DC2626', textAlign: 'center', marginBottom: 14, fontWeight: '600' },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 24, backgroundColor: colors.primary[500], borderRadius: 10 },
  retryTxt: { color: '#fff', fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 40 },

  // Status strip
  statusStrip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 14,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusTxt: { fontWeight: '700', fontSize: 12 },
  tripIdTxt: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  spacer: { flex: 1 },
  dateTxt: { fontSize: 11, color: '#6B7280' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    padding: 10, alignItems: 'center',
    ...shadows.sm, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  statVal: { fontSize: 18, fontWeight: 'bold' },
  statSub: { fontSize: 9, color: '#9CA3AF', marginTop: 1 },
  statLabel: { fontSize: 9, color: '#6B7280', marginTop: 3, textAlign: 'center', fontWeight: '600' },

  // Info Card
  infoCard: { marginBottom: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoItem: { flex: 1, paddingVertical: 4 },
  infoLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  infoVal: { fontSize: 14, color: '#111827', fontWeight: '700' },
  infoSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  dividerV: { width: 1, height: 40, backgroundColor: '#E5E7EB', marginHorizontal: 12 },
  helperRow: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  helperTxt: { fontSize: 12, color: '#6B7280' },

  // Revenue
  revenueCard: { borderRadius: 16, padding: 16, marginBottom: 14, ...shadows.sm },
  revenueTitle: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 12 },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between' },
  revItem: { alignItems: 'center', flex: 1 },
  revLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase' },
  revVal: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  revDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'stretch' },

  // Map
  mapCard: { marginBottom: 14, overflow: 'hidden' },
  mapTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  mapWrapper: { height: 240, width: '100%', borderRadius: 10, overflow: 'hidden' },
  replayWrapper: { borderRadius: 10, overflow: 'hidden' },
  map: { flex: 1 },
  noPath: { alignItems: 'center', paddingVertical: 16 },
  noPathTxt: { color: '#9CA3AF', fontSize: 13 },
  mapStats: { marginTop: 8, alignItems: 'center' },
  mapStatTxt: { fontSize: 11, color: '#6B7280', fontWeight: '600' },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },

  // Delivery Stop
  stopCard: { marginBottom: 10 },
  stopHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  stopName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  stopAddr: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  stopBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  stopBadgeTxt: { fontSize: 10, fontWeight: '700' },

  // Feed items
  feedItems: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, marginBottom: 8 },
  feedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  feedName: { flex: 1, fontSize: 12, color: '#374151' },
  feedQty: { fontSize: 12, color: '#6B7280', marginHorizontal: 8, minWidth: 60, textAlign: 'right' },
  feedPrice: { fontSize: 12, color: '#059669', minWidth: 50, textAlign: 'right' },
  feedDivider: { borderTopWidth: 1, borderColor: '#E5E7EB', marginVertical: 4 },

  // Payment
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  payLabel: { fontSize: 11, color: '#6B7280' },
  payBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  payBadgeTxt: { fontSize: 10, fontWeight: '700' },
  payAmt: { fontSize: 11, color: '#374151', fontWeight: '600', marginLeft: 4 },

  // Delivered
  deliveredMeta: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  deliveredMetaTxt: { fontSize: 11, color: '#6B7280' },

  // Proof image
  proofRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 8,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  proofThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#D1FAE5' },
  proofInfo: { flex: 1 },
  proofLabel: { fontSize: 12, fontWeight: '700', color: '#065F46' },
  proofTap: { fontSize: 10, color: '#10B981', marginTop: 2 },

  // Gallery
  galleryRow: { paddingVertical: 4, paddingHorizontal: spacing.md, gap: 10, marginBottom: 14 },
  galleryItem: { width: 120, height: 100, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  galleryThumb: { width: '100%', height: '100%' },
  galleryLabelBox: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 4,
  },
  galleryLabelTxt: { fontSize: 9, color: '#fff', fontWeight: '600' },

  // Expenses
  expCard: { marginBottom: 14 },
  expRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  expLabel: { fontSize: 13, color: '#374151' },
  expVal: { fontSize: 13, color: '#1F2937', fontWeight: '600' },
  expDivider: { borderTopWidth: 1, borderColor: '#E5E7EB', marginVertical: 4 },
});

export default CattleFeedTruckOwnerTripDetail;
