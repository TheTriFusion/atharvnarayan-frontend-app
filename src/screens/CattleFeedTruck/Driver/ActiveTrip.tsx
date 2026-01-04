import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';

interface Trip {
  _id: string;
  date?: string;
  createdAt?: string;
  from?: string;
  to?: string;
  status?: string;
  vehicleId?: any;
  driverId?: any;
  tripDetails?: any;
  deliveryEntries?: any[];
  summary?: any;
  startTime?: string;
}

const CattleFeedTruckDriverActiveTrip: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReceiverModal, setShowReceiverModal] = useState(false);
  const [currentDeliveryIndex, setCurrentDeliveryIndex] = useState<number>(-1);
  const [receiverName, setReceiverName] = useState('');

  useEffect(() => {
    fetchActiveTrip();

    const interval = setInterval(() => {
      fetchActiveTrip();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchActiveTrip = async () => {
    try {
      const response = await cattleFeedTruckAPI.getTrips();
      let trips = [];
      if (Array.isArray(response)) {
        trips = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        trips = response.data;
      }

      const userId = user?._id || user?.id;
      const activeTrips = trips.filter((trip: Trip) => {
        const driverId = trip.driverId?._id || trip.driverId;
        return driverId && userId && driverId.toString() === userId.toString() &&
          (trip.status === 'loading' || trip.status === 'in_transit');
      });

      if (activeTrips.length > 0) {
        const activeTrip = activeTrips.sort((a: Trip, b: Trip) => {
          const dateA = new Date(b.createdAt || b.startTime || '').getTime();
          const dateB = new Date(a.createdAt || a.startTime || '').getTime();
          return dateA - dateB;
        })[0];
        setTrip(activeTrip);
      } else {
        navigation.navigate('CattleFeedTruckDriverDashboard');
      }
    } catch (error: any) {
      console.error('Error fetching active trip:', error);
      if (error.response?.status === 401) {
        navigation.navigate('Login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const promptReceiverName = (deliveryIndex: number) => {
    if (!trip) return;
    setCurrentDeliveryIndex(deliveryIndex);
    setReceiverName('');
    setShowReceiverModal(true);
  };

  const handleMarkDelivered = async () => {
    if (!trip || currentDeliveryIndex === -1) return;

    const entry = trip.deliveryEntries![currentDeliveryIndex];
    const location = entry.notes || entry.location || `Location ${currentDeliveryIndex + 1}`;
    const plannedItems = entry.plannedDelivery?.feedItems || [];
    const bags = plannedItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

    try {
      const actualDelivery = {
        feedItems: plannedItems.map((item: any) => ({
          feedType: item.feedType || 'Cattle Feed',
          quantity: item.quantity || 0,
          unit: item.unit || 'bags',
          pricePerUnit: item.pricePerUnit || 0,
        })),
        totalAmount: entry.plannedDelivery?.totalAmount || 0,
        deliveredAt: new Date(),
        receivedBy: receiverName || undefined,
      };

      const response = await cattleFeedTruckAPI.updateDelivery(
        trip._id,
        currentDeliveryIndex.toString(),
        { actualDelivery }
      );

      sendNotificationToOwner(trip, location, bags, receiverName);

      setTrip(response.data);

      const updatedTrip = response.data;
      const allDelivered = updatedTrip.deliveryEntries?.every((e: any) => e.actualDelivery?.deliveredAt);

      if (allDelivered && updatedTrip.deliveryEntries.length > 0) {
        setTimeout(async () => {
          try {
            await cattleFeedTruckAPI.updateTrip(trip._id, { status: 'completed', endTime: new Date() });
            sendNotificationToOwner(trip, 'All Locations', 0, '', 'trip_completed');
            toast.success('All deliveries completed! Trip marked as completed.');
            navigation.navigate('CattleFeedTruckDriverDashboard');
          } catch (error) {
            console.error('Error completing trip:', error);
          }
        }, 1000);
      }

      setShowReceiverModal(false);
      toast.success(`Delivery marked as completed for ${location}!`);
    } catch (error: any) {
      console.error('Error marking delivery:', error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const sendNotificationToOwner = async (trip: Trip, location: string, bags: number, receiverName: string = '', type: string = 'delivery') => {
    try {
      const notificationsJson = await AsyncStorage.getItem('cattleFeedTruckOwnerNotifications');
      const notifications = notificationsJson ? JSON.parse(notificationsJson) : [];

      let message;
      if (type === 'trip_completed') {
        message = `Trip #${trip._id.substring(trip._id.length - 6)} completed! All deliveries finished.`;
      } else {
        message = `Delivery completed at ${location}: ${bags} bags${receiverName ? ` (Received by: ${receiverName})` : ''}`;
      }

      notifications.unshift({
        id: `notif-${Date.now()}-${Math.random()}`,
        type: type,
        tripId: trip._id,
        tripNumber: trip._id.substring(trip._id.length - 6),
        location: location,
        bags: bags,
        receiverName: receiverName,
        message: message,
        timestamp: new Date().toISOString(),
        driverName: trip.driverId?.name || 'Driver',
      });

      await AsyncStorage.setItem('cattleFeedTruckOwnerNotifications', JSON.stringify(notifications.slice(0, 100)));
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  };

  const handleCompleteTrip = async () => {
    if (!trip) return;

    const deliveredBags = trip.deliveryEntries?.reduce((sum, entry) => {
      const actualDelivery = entry.actualDelivery;
      if (actualDelivery && actualDelivery.feedItems) {
        return sum + actualDelivery.feedItems.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
      }
      return sum;
    }, 0) || 0;
    const totalBags = trip.summary?.totalQuantityLoaded || trip.tripDetails?.totalBags || 0;

    if (deliveredBags < totalBags) {
      Alert.alert(
        'Complete Trip',
        `You've delivered ${deliveredBags}/${totalBags} bags. Complete trip anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete',
            onPress: async () => {
              try {
                await cattleFeedTruckAPI.updateTrip(trip._id, { status: 'completed', endTime: new Date() });
                sendNotificationToOwner(trip, 'All Locations', 0, '', 'trip_completed');
                toast.success('Trip completed!');
                navigation.navigate('CattleFeedTruckDriverDashboard');
              } catch (error: any) {
                console.error('Error completing trip:', error);
                toast.error('Error completing trip');
              }
            },
          },
        ]
      );
    } else {
      try {
        await cattleFeedTruckAPI.updateTrip(trip._id, { status: 'completed', endTime: new Date() });
        sendNotificationToOwner(trip, 'All Locations', 0, '', 'trip_completed');
        toast.success('Trip completed!');
        navigation.navigate('CattleFeedTruckDriverDashboard');
      } catch (error: any) {
        console.error('Error completing trip:', error);
        toast.error('Error completing trip');
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActiveTrip();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.container}>
        <Card>
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🚚</Text>
            <Text style={styles.emptyText}>No active trip</Text>
            <Text style={styles.emptySubtext}>Redirecting to dashboard...</Text>
          </View>
        </Card>
      </View>
    );
  }

  const deliveredBags = trip.deliveryEntries?.reduce((sum, entry) => {
    const actualDelivery = entry.actualDelivery;
    if (actualDelivery && actualDelivery.feedItems) {
      return sum + actualDelivery.feedItems.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
    }
    return sum;
  }, 0) || 0;
  const totalBags = trip.summary?.totalQuantityLoaded || trip.tripDetails?.totalBags || 0;
  const deliveryEntries = trip.deliveryEntries || [];
  const allDelivered = deliveryEntries.length > 0 && deliveryEntries.every(entry => entry.actualDelivery?.deliveredAt);
  const deliveredCount = deliveryEntries.filter(e => e.actualDelivery?.deliveredAt).length;
  const remainingBags = totalBags - deliveredBags;
  const progressPercentage = totalBags > 0 ? Math.min((deliveredBags / totalBags) * 100, 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Active Trip</Text>
          <Text style={styles.subtitle}>Trip #{trip._id.substring(trip._id.length - 6)}</Text>
        </View>
        <View style={styles.headerButtons}>
          <Button
            onPress={handleRefresh}
            variant="secondary"
            disabled={refreshing}
            style={styles.headerButton}
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </Button>
          <Button
            onPress={() => navigation.navigate('CattleFeedTruckDriverDashboard')}
            variant="secondary"
            style={styles.headerButton}
          >
            ← Back
          </Button>
        </View>
      </View>

      {/* Trip Overview Card */}
      <Card style={styles.overviewCard}>
        <View style={styles.overviewGrid}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Date</Text>
            <Text style={styles.overviewValue}>
              {new Date(trip.date || trip.createdAt || '').toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Route</Text>
            <Text style={styles.overviewValue}>
              {trip.from || 'N/A'} → {trip.to || 'N/A'}
            </Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Vehicle</Text>
            <Text style={styles.overviewValue}>
              {trip.vehicleId?.registrationNumber || 'N/A'}
            </Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Status</Text>
            <View style={[
              styles.statusBadge,
              trip.status === 'in_transit' ? styles.statusInTransit : styles.statusLoading
            ]}>
              <Text style={[
                styles.statusText,
                trip.status === 'in_transit' ? styles.statusInTransitText : styles.statusLoadingText
              ]}>
                {trip.status === 'in_transit' ? 'In Transit' : 'Loading'}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Progress Card */}
      <Card style={styles.progressCard}>
        <Text style={styles.sectionTitle}>Delivery Progress</Text>
        <View style={styles.progressStats}>
          <View style={[styles.progressStat, { backgroundColor: '#dbeafe' }]}>
            <Text style={styles.progressStatLabel}>Total Bags</Text>
            <Text style={[styles.progressStatValue, { color: '#2563eb' }]}>{totalBags}</Text>
          </View>
          <View style={[styles.progressStat, { backgroundColor: '#dcfce7' }]}>
            <Text style={styles.progressStatLabel}>Delivered</Text>
            <Text style={[styles.progressStatValue, { color: '#16a34a' }]}>{deliveredBags}</Text>
          </View>
          <View style={[styles.progressStat, { backgroundColor: '#fed7aa' }]}>
            <Text style={styles.progressStatLabel}>Remaining</Text>
            <Text style={[styles.progressStatValue, { color: '#ea580c' }]}>{remainingBags}</Text>
          </View>
        </View>
        {totalBags > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressPercentage}%`,
                    backgroundColor: deliveredBags >= totalBags ? '#16a34a' : '#2563eb',
                  },
                ]}
              />
            </View>
          </View>
        )}
        <Text style={styles.progressText}>
          {deliveredCount} of {deliveryEntries.length} locations delivered
        </Text>
      </Card>

      {/* Delivery Locations */}
      <Card style={styles.deliveriesCard}>
        <View style={styles.deliveriesHeader}>
          <Text style={styles.sectionTitle}>
            Delivery Locations ({deliveryEntries.length})
          </Text>
          {allDelivered && (
            <Button onPress={handleCompleteTrip} variant="success">
              ✓ Complete Trip
            </Button>
          )}
        </View>

        {deliveryEntries.length > 0 ? (
          <View style={styles.deliveriesList}>
            {deliveryEntries.map((entry, index) => {
              const plannedItems = entry.plannedDelivery?.feedItems || [];
              const actualItems = entry.actualDelivery?.feedItems || [];
              const plannedBags = plannedItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
              const actualBags = actualItems.length > 0
                ? actualItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
                : plannedBags;
              const location = entry.deliveryPointId?.name
                ? `${entry.deliveryPointId.name} ${entry.location ? `(${entry.location})` : ''}`
                : (entry.notes || entry.location || `Location ${index + 1}`);
              const isDelivered = !!entry.actualDelivery?.deliveredAt;

              return (
                <View
                  key={index}
                  style={[
                    styles.deliveryItem,
                    isDelivered ? styles.deliveryItemDelivered : styles.deliveryItemPending,
                  ]}
                >
                  <View style={styles.deliveryItemContent}>
                    <View style={styles.deliveryItemHeader}>
                      <Text style={styles.deliveryItemNumber}>{index + 1}.</Text>
                      <Text style={styles.deliveryItemLocation}>{location}</Text>
                      {isDelivered && (
                        <View style={styles.deliveredBadge}>
                          <Text style={styles.deliveredBadgeText}>✓ Delivered</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.feedItems}>
                      {plannedItems.map((item: any, itemIndex: number) => (
                        <Text key={itemIndex} style={styles.feedItem}>
                          <Text style={styles.feedItemLabel}>{item.feedType || 'Cattle Feed'}:</Text>
                          <Text style={styles.feedItemValue}> {actualBags} {item.unit || 'bags'}</Text>
                        </Text>
                      ))}
                    </View>

                    {isDelivered && entry.actualDelivery && (
                      <View style={styles.deliveryInfo}>
                        {entry.actualDelivery.receivedBy && (
                          <Text style={styles.deliveryInfoText}>
                            <Text style={styles.deliveryInfoLabel}>Received by:</Text> {entry.actualDelivery.receivedBy}
                          </Text>
                        )}
                        {entry.actualDelivery.deliveredAt && (
                          <Text style={styles.deliveryInfoText}>
                            <Text style={styles.deliveryInfoLabel}>Delivered at:</Text>{' '}
                            {new Date(entry.actualDelivery.deliveredAt).toLocaleString()}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  {!isDelivered && (
                    <Button
                      onPress={() => promptReceiverName(index)}
                      variant="success"
                      style={styles.markDeliveredButton}
                    >
                      ✓ Mark as Delivered
                    </Button>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyDeliveries}>
            <Text style={styles.emptyDeliveriesText}>No delivery locations added yet</Text>
          </View>
        )}
      </Card>

      {/* Receiver Name Modal */}
      <Modal
        visible={showReceiverModal}
        onClose={() => {
          setShowReceiverModal(false);
          setReceiverName('');
        }}
        title="Enter Receiver Name"
      >
        <Input
          label="Receiver Name (optional)"
          value={receiverName}
          onChangeText={setReceiverName}
          placeholder="Enter receiver name"
        />
        <View style={styles.modalActions}>
          <Button
            onPress={() => {
              setShowReceiverModal(false);
              setReceiverName('');
            }}
            variant="secondary"
            style={styles.modalButton}
          >
            Cancel
          </Button>
          <Button onPress={handleMarkDelivered} style={styles.modalButton}>
            Mark Delivered
          </Button>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  overviewCard: {
    margin: 16,
    marginTop: 0,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  overviewItem: {
    flex: 1,
    minWidth: '45%',
  },
  overviewLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusInTransit: {
    backgroundColor: '#f3e8ff',
  },
  statusLoading: {
    backgroundColor: '#dbeafe',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusInTransitText: {
    color: '#9333ea',
  },
  statusLoadingText: {
    color: '#2563eb',
  },
  progressCard: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  progressStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  progressStat: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  progressStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  progressStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 16,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  deliveriesCard: {
    margin: 16,
    marginTop: 0,
  },
  deliveriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deliveriesList: {
    gap: 16,
  },
  deliveryItem: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 16,
  },
  deliveryItemPending: {
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  deliveryItemDelivered: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  deliveryItemContent: {
    flex: 1,
  },
  deliveryItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  deliveryItemNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginRight: 8,
  },
  deliveryItemLocation: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  deliveredBadge: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  deliveredBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  feedItems: {
    marginBottom: 12,
  },
  feedItem: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  feedItemLabel: {
    fontWeight: '600',
  },
  feedItemValue: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 18,
  },
  deliveryInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#86efac',
  },
  deliveryInfoText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  deliveryInfoLabel: {
    fontWeight: '600',
  },
  markDeliveredButton: {
    marginTop: 12,
    minWidth: 180,
  },
  emptyDeliveries: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyDeliveriesText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
  },
});

export default CattleFeedTruckDriverActiveTrip;
