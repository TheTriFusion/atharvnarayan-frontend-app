import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import Select from '../../../components/common/Select';
import ProfileMenu from '../../../components/common/ProfileMenu';

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
  deliveries?: any[];
  summary?: any;
  endTime?: string;
  updatedAt?: string;
  distance?: number | string;
}

interface Vehicle {
  _id: string;
  registrationNumber: string;
  vehicleType?: string;
}

interface Delivery {
  location: string;
  bags: string;
  receiverName: string;
  receiverPhone: string;
  feedType: string;
}

const CattleFeedTruckDriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReceiverModal, setShowReceiverModal] = useState(false);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [currentDeliveryIndex, setCurrentDeliveryIndex] = useState<number>(-1);
  const [receiverName, setReceiverName] = useState('');
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());


  useEffect(() => {
    fetchData();
  }, []);

  // Auto-redirect to active trip if one exists
  useFocusEffect(
    React.useCallback(() => {
      const checkActiveTrip = async () => {
        try {
          const tripsRes = await cattleFeedTruckAPI.getTrips();
          const tripsArray = Array.isArray(tripsRes) ? tripsRes : (Array.isArray(tripsRes?.data) ? tripsRes.data : []);
          const userId = user?._id || user?.id;

          const activeTrip = tripsArray.find((trip: Trip) => {
            const driverId = trip.driverId?._id || trip.driverId;
            return driverId && userId && driverId.toString() === userId.toString() &&
              (trip.status === 'loading' || trip.status === 'in_transit');
          });

          if (activeTrip) {
            navigation.replace('CattleFeedTruckDriverActiveTrip');
          }
        } catch (error) {
          console.error('Error checking active trip:', error);
        }
      };

      if (user) {
        checkActiveTrip();
      }
    }, [user, navigation])
  );

  const fetchData = async () => {
    try {
      const [tripsRes, vehiclesRes] = await Promise.all([
        cattleFeedTruckAPI.getTrips(),
        cattleFeedTruckAPI.getVehicles(),
      ]);

      const tripsData = Array.isArray(tripsRes) ? tripsRes : (Array.isArray(tripsRes?.data) ? tripsRes.data : []);
      const vehiclesData = Array.isArray(vehiclesRes) ? vehiclesRes : (Array.isArray(vehiclesRes?.data) ? vehiclesRes.data : []);

      setTrips(tripsData);
      setVehicles(vehiclesData);

      if (vehiclesData.length === 0) {
        console.warn('No vehicles found');
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 400) {
        toast.error(error.response.data?.message || 'Unable to fetch vehicles. Please contact your owner.');
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigation.navigate('Login');
      } else {
        toast.error('Error loading data. Please refresh.');
      }
    } finally {
      setLoading(false);
    }
  };





  const handleStartTrip = async (tripId: string) => {
    Alert.alert('Start Trip', 'Start this trip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start',
        onPress: async () => {
          try {
            await cattleFeedTruckAPI.updateTrip(tripId, { status: 'in_transit' });
            fetchData();
            toast.success('Trip started! You can now mark deliveries.');
          } catch (error: any) {
            console.error('Error starting trip:', error);
            toast.error('Error starting trip');
          }
        },
      },
    ]);
  };

  const promptReceiverName = (tripId: string, deliveryIndex: number) => {
    const trip = trips.find(t => t._id === tripId);
    if (!trip || !trip.deliveryEntries || !trip.deliveryEntries[deliveryIndex]) {
      toast.error('Delivery entry not found');
      return;
    }

    const entry = trip.deliveryEntries[deliveryIndex];
    const location = entry.notes || entry.location || `Location ${deliveryIndex + 1}`;
    setCurrentTrip(trip);
    setCurrentDeliveryIndex(deliveryIndex);
    setReceiverName('');
    setShowReceiverModal(true);
  };

  const handleMarkDelivered = async () => {
    if (!currentTrip || currentDeliveryIndex === -1) return;

    const entry = currentTrip.deliveryEntries![currentDeliveryIndex];
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
        currentTrip._id,
        currentDeliveryIndex.toString(),
        { actualDelivery }
      );

      sendNotificationToOwner(currentTrip, location, bags, receiverName);

      const updatedTrip = response.data;
      const allDelivered = updatedTrip.deliveryEntries?.every((e: any) => e.actualDelivery?.deliveredAt);

      if (allDelivered && updatedTrip.deliveryEntries.length > 0) {
        setTimeout(async () => {
          try {
            await cattleFeedTruckAPI.updateTrip(currentTrip._id, { status: 'completed', endTime: new Date() });
            sendNotificationToOwner(currentTrip, 'All Locations', 0, '', 'trip_completed');
            fetchData();
            toast.success('All deliveries completed! Trip marked as completed.');
          } catch (error) {
            console.error('Error completing trip:', error);
          }
        }, 1000);
      }

      setShowReceiverModal(false);
      fetchData();
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



  const handleCompleteTrip = async (tripId: string) => {
    const trip = trips.find(t => t._id === tripId);
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
                await cattleFeedTruckAPI.updateTrip(tripId, { status: 'completed', endTime: new Date() });
                sendNotificationToOwner(trip, 'All Locations', 0, '', 'trip_completed');
                fetchData();
                toast.success('Trip completed!');
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
        await cattleFeedTruckAPI.updateTrip(tripId, { status: 'completed', endTime: new Date() });
        sendNotificationToOwner(trip, 'All Locations', 0, '', 'trip_completed');
        fetchData();
        toast.success('Trip completed!');
      } catch (error: any) {
        console.error('Error completing trip:', error);
        toast.error('Error completing trip');
      }
    }
  };



  const userId = user?._id || user?.id;
  const myTrips = trips.filter(trip => {
    if (!userId) return false;
    const driverIdObj = trip.driverId?._id;
    const driverIdStr = trip.driverId;
    const driverId = driverIdObj || driverIdStr;
    if (!driverId) return false;
    return driverId.toString() === userId.toString();
  });

  const pendingTrips = myTrips.filter(t => t.status === 'pending');
  const activeTrips = myTrips.filter(t => {
    const status = t.status;
    return status === 'loading' || status === 'in_transit';
  });
  const completedTrips = myTrips.filter(t => t.status === 'completed').sort((a, b) => {
    const dateA = new Date(a.endTime || a.updatedAt || a.createdAt || '').getTime();
    const dateB = new Date(b.endTime || b.updatedAt || b.createdAt || '').getTime();
    return dateB - dateA;
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return { bg: '#dcfce7', text: '#16a34a' };
      case 'in_transit':
        return { bg: '#f3e8ff', text: '#9333ea' };
      case 'loading':
        return { bg: '#dbeafe', text: '#2563eb' };
      case 'pending':
        return { bg: '#fef3c7', text: '#ca8a04' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const toggleTripExpansion = (tripId: string) => {
    setExpandedTrips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tripId)) {
        newSet.delete(tripId);
      } else {
        newSet.add(tripId);
      }
      return newSet;
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Delivery Driver Dashboard</Text>
            <Text style={styles.subtitle}>Welcome back, {user?.name}</Text>
          </View>
          <ProfileMenu style={styles.profileMenu} />
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Card style={[styles.statCard, { backgroundColor: '#3b82f6' }] as any}>
          <Text style={styles.statLabel}>Total Trips</Text>
          <Text style={styles.statValue}>{myTrips.length}</Text>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: '#16a34a' }] as any}>
          <Text style={styles.statLabel}>Completed Trips</Text>
          <Text style={styles.statValue}>{completedTrips.length}</Text>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: '#ea580c' }] as any}>
          <Text style={styles.statLabel}>Today's Trips</Text>
          <Text style={styles.statValue}>
            {myTrips.filter(t => {
              const tripDate = new Date(t.date || t.createdAt || '').toDateString();
              const today = new Date().toDateString();
              return tripDate === today;
            }).length}
          </Text>
        </Card>
      </View>

      {/* Action Button */}
      <View style={styles.actionButton}>
        <Button onPress={() => navigation.navigate('CattleFeedTruckDriverCreateTrip')}>
          🚀 Create New Trip
        </Button>
      </View>

      {/* Pending Trips */}
      {pendingTrips.length > 0 && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pending Trips</Text>
          {pendingTrips.map((trip) => (
            <View key={trip._id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <Text style={styles.tripTitle}>Trip #{trip._id.substring(trip._id.length - 6)}</Text>
                <Button onPress={() => handleStartTrip(trip._id)} style={styles.smallButton}>
                  Start Trip
                </Button>
              </View>
              <View style={styles.tripDetails}>
                <Text style={styles.tripDetailText}>
                  <Text style={styles.tripDetailLabel}>Date:</Text> {new Date(trip.date || trip.createdAt || '').toLocaleDateString()}
                </Text>
                <Text style={styles.tripDetailText}>
                  <Text style={styles.tripDetailLabel}>From:</Text> {trip.from || 'N/A'}
                </Text>
                <Text style={styles.tripDetailText}>
                  <Text style={styles.tripDetailLabel}>To:</Text> {trip.to || 'N/A'}
                </Text>
                <Text style={styles.tripDetailText}>
                  <Text style={styles.tripDetailLabel}>Vehicle:</Text> {trip.vehicleId?.registrationNumber || 'N/A'}
                </Text>
                <Text style={styles.tripDetailText}>
                  <Text style={styles.tripDetailLabel}>Total Bags:</Text> {trip.tripDetails?.totalBags || 0}
                </Text>
                <Text style={styles.tripDetailText}>
                  <Text style={styles.tripDetailLabel}>Distance:</Text> {trip.tripDetails?.distance || trip.distance} km
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Active Trip Button */}
      {activeTrips.length > 0 && (
        <Card style={[styles.activeTripCard, { backgroundColor: '#3b82f6' }] as any}>
          <View style={styles.activeTripContent}>
            <View style={styles.activeTripText}>
              <Text style={styles.activeTripTitle}>Active Trip in Progress</Text>
              <Text style={styles.activeTripSubtitle}>
                You have {activeTrips.length} active trip(s). Click to view and manage deliveries.
              </Text>
            </View>
            <Button
              onPress={() => navigation.navigate('CattleFeedTruckDriverActiveTrip')}
              variant="secondary"
            >
              View Active Trip →
            </Button>
          </View>
        </Card>
      )}

      {/* Completed Trips */}
      {completedTrips.length > 0 && (
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Completed Trips ({completedTrips.length})</Text>
            <Text style={styles.completedBadge}>✓ Finished</Text>
          </View>
          {completedTrips.slice(0, 5).map((trip) => {
            const deliveredBags = trip.deliveryEntries?.reduce((sum, entry) => {
              const actualDelivery = entry.actualDelivery;
              if (actualDelivery && actualDelivery.feedItems) {
                return sum + actualDelivery.feedItems.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
              }
              return sum;
            }, 0) || 0;
            const totalBags = trip.summary?.totalQuantityLoaded || trip.tripDetails?.totalBags || 0;
            const deliveryCount = trip.deliveryEntries?.length || 0;

            return (
              <View key={trip._id} style={styles.completedTripCard}>
                <View style={styles.completedTripHeader}>
                  <Text style={styles.tripTitle}>Trip #{trip._id.substring(trip._id.length - 6)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                    <Text style={[styles.statusText, { color: '#16a34a' }]}>✓ Completed</Text>
                  </View>
                </View>
                <View style={styles.tripDetails}>
                  <Text style={styles.tripDetailText}>
                    <Text style={styles.tripDetailLabel}>Date:</Text> {new Date(trip.date || trip.createdAt || '').toLocaleDateString()}
                  </Text>
                  <Text style={styles.tripDetailText}>
                    <Text style={styles.tripDetailLabel}>Route:</Text> {trip.from} → {trip.to}
                  </Text>
                  <Text style={styles.tripDetailText}>
                    <Text style={styles.tripDetailLabel}>Bags:</Text> <Text style={styles.boldText}>{deliveredBags} / {totalBags}</Text>
                  </Text>
                  <Text style={styles.tripDetailText}>
                    <Text style={styles.tripDetailLabel}>Locations:</Text> {deliveryCount} delivered
                  </Text>
                  {trip.endTime && (
                    <Text style={styles.completedTime}>
                      Completed: {new Date(trip.endTime).toLocaleString()}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* All Trips */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Trips</Text>
          <Button onPress={fetchData} variant="secondary" style={styles.refreshButton}>
            🔄 Refresh
          </Button>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
        ) : myTrips.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>No trips yet</Text>
            <Text style={styles.emptySubtext}>Create your first trip to get started</Text>
          </View>
        ) : (
          <FlatList
            data={myTrips.slice(0, 10)}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            renderItem={({ item: trip }) => {
              const deliveredBags = trip.deliveryEntries?.reduce((sum, entry) => {
                const actualDelivery = entry.actualDelivery;
                if (actualDelivery && actualDelivery.feedItems) {
                  return sum + actualDelivery.feedItems.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
                }
                return sum;
              }, 0) || trip.deliveries?.reduce((sum: number, d: any) => sum + (d.bags || 0), 0) || 0;
              const totalBags = trip.summary?.totalQuantityLoaded || trip.tripDetails?.totalBags || 0;
              const deliveryCount = trip.deliveryEntries?.length || trip.deliveries?.length || 0;
              const statusColor = getStatusColor(trip.status);
              const isExpanded = expandedTrips.has(trip._id);

              return (
                <View style={styles.tripCard}>
                  <TouchableOpacity onPress={() => toggleTripExpansion(trip._id)}>
                    <View style={styles.tripHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tripRowText}>
                          {new Date(trip.date || trip.createdAt || '').toLocaleDateString()}
                        </Text>
                        <Text style={styles.tripRowText}>
                          {trip.from} → {trip.to}
                        </Text>
                        <Text style={styles.tripRowText}>
                          {trip.vehicleId?.registrationNumber || 'N/A'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.tripRowText}>
                          {deliveredBags} / {totalBags} bags
                        </Text>
                        <Text style={styles.tripRowText}>
                          {deliveryCount} locs
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg, marginTop: 4 }]}>
                          <Text style={[styles.statusText, { color: statusColor.text }]}>
                            {trip.status?.replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                      <Text style={{ fontWeight: 'bold', marginBottom: 8, color: '#374151' }}>Trip Details</Text>
                      {trip?.deliveryEntries && trip.deliveryEntries.length > 0 ? (
                        trip.deliveryEntries.map((entry, idx) => (
                          <View key={idx} style={{ marginBottom: 12, paddingBottom: 12, borderBottomWidth: idx < (trip.deliveryEntries?.length || 0) - 1 ? 1 : 0, borderBottomColor: '#f3f4f6' }}>
                            <Text style={{ fontWeight: '600', color: '#111827' }}>
                              {entry?.deliveryPointId?.name
                                ? `${entry.deliveryPointId.name} ${entry.location ? `(${entry.location})` : ''}`
                                : (entry?.location || entry?.notes || `Location ${idx + 1}`)}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>
                              Bags: {entry?.actualDelivery?.feedItems?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0} / {entry?.plannedDelivery?.feedItems?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0}
                            </Text>
                            <Text style={{ fontSize: 12, color: entry?.actualDelivery?.deliveredAt ? '#16a34a' : '#ca8a04' }}>
                              {entry?.actualDelivery?.deliveredAt ? `✓ Delivered: ${new Date(entry.actualDelivery.deliveredAt).toLocaleString()}` : 'Pending'}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={{ color: '#9ca3af', fontStyle: 'italic' }}>No detailed delivery info available.</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            }}
          />
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
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  profileMenu: {
    marginLeft: 8,
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionCard: {
    margin: 16,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tripCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tripDetails: {
    gap: 4,
  },
  tripDetailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  tripDetailLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  activeTripCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
  },
  activeTripContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeTripText: {
    flex: 1,
    marginRight: 12,
  },
  activeTripTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  activeTripSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  completedBadge: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
  },
  completedTripCard: {
    borderWidth: 1,
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  completedTripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  completedTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#16a34a',
  },
  loader: {
    marginVertical: 32,
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
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  tripRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexWrap: 'wrap',
    gap: 8,
  },
  tripRowText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
    minWidth: 80,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
  deliverySection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  deliverySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  addDeliveryForm: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButton: {
    marginTop: 8,
  },
  deliveriesList: {
    marginTop: 8,
  },
  deliveriesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  deliveryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  deliveryItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  deliveryItemLocation: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  deliveryItemBags: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
    marginRight: 8,
  },
  deliveryItemReceiver: {
    fontSize: 12,
    color: '#6b7280',
  },
  removeButton: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '600',
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

export default CattleFeedTruckDriverDashboard;
