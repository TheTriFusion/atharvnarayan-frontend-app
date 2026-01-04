import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useToast } from '../../../contexts/ToastContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Modal from '../../../components/common/Modal';
import Select from '../../../components/common/Select';

interface Trip {
  _id: string;
  date?: string;
  createdAt?: string;
  from?: string;
  to?: string;
  status?: string;
  driverId?: any;
  vehicleId?: any;
  routeId?: any;
  tripDetails?: any;
  deliveryEntries?: any[];
  summary?: any;
  startTime?: string;
  endTime?: string;
}

const TripManagement: React.FC = () => {
  const toast = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    from: '',
    to: '',
    presentKm: '',
    kmAverage: '',
    distance: '',
    quantity: '',
    oilDiesel: '',
    driverId: '',
    vehicleId: '',
    helper: '',
    other: '',
    advancePayment: '',
  });

  useEffect(() => {
    fetchData();
    loadNotifications();

    let interval: ReturnType<typeof setInterval> | undefined;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchData();
        loadNotifications();
      }, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadNotifications = async () => {
    try {
      const notifsJson = await AsyncStorage.getItem('cattleFeedTruckOwnerNotifications');
      const notifs = notifsJson ? JSON.parse(notifsJson) : [];
      setNotifications(notifs.slice(0, 20));
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const clearNotifications = async () => {
    try {
      await AsyncStorage.removeItem('cattleFeedTruckOwnerNotifications');
      setNotifications([]);
      toast.success('Notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [tripsRes, driversRes, vehiclesRes] = await Promise.all([
        cattleFeedTruckAPI.getTrips(),
        cattleFeedTruckAPI.getDrivers(),
        cattleFeedTruckAPI.getVehicles(),
      ]);
      setTrips(Array.isArray(tripsRes) ? tripsRes : (Array.isArray(tripsRes.data) ? tripsRes.data : []));
      setDrivers(Array.isArray(driversRes) ? driversRes : (Array.isArray(driversRes.data) ? driversRes.data : []));
      setVehicles(Array.isArray(vehiclesRes) ? vehiclesRes : (Array.isArray(vehiclesRes.data) ? vehiclesRes.data : []));
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateTrip = async () => {
    try {
      const tripData = {
        ...formData,
        status: 'pending',
        tripDetails: {
          presentKm: parseFloat(formData.presentKm) || 0,
          kmAverage: parseFloat(formData.kmAverage) || 0,
          distance: parseFloat(formData.distance) || 0,
          totalBags: parseFloat(formData.quantity) || 0,
          oilDiesel: parseFloat(formData.oilDiesel) || 0,
          helper: formData.helper,
          other: formData.other,
          advancePayment: parseFloat(formData.advancePayment) || 0,
        },
      };

      await cattleFeedTruckAPI.createTrip(tripData);
      setShowCreateModal(false);
      resetForm();
      fetchData();
      toast.success('Trip created successfully!');
    } catch (error: any) {
      console.error('Error creating trip:', error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      from: '',
      to: '',
      presentKm: '',
      kmAverage: '',
      distance: '',
      quantity: '',
      oilDiesel: '',
      driverId: '',
      vehicleId: '',
      helper: '',
      other: '',
      advancePayment: '',
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#fef3c7', text: '#ca8a04' };
      case 'loading':
        return { bg: '#dbeafe', text: '#2563eb' };
      case 'in_transit':
        return { bg: '#f3e8ff', text: '#9333ea' };
      case 'completed':
        return { bg: '#dcfce7', text: '#16a34a' };
      case 'cancelled':
        return { bg: '#fee2e2', text: '#dc2626' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const calculateDeliveredBags = (trip: Trip) => {
    if (trip.deliveryEntries && trip.deliveryEntries.length > 0) {
      return trip.deliveryEntries.reduce((sum, entry) => {
        const actualDelivery = entry.actualDelivery;
        if (actualDelivery && actualDelivery.feedItems) {
          return sum + actualDelivery.feedItems.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
        }
        const plannedDelivery = entry.plannedDelivery;
        if (plannedDelivery && plannedDelivery.feedItems) {
          return sum + plannedDelivery.feedItems.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
        }
        return sum;
      }, 0);
    }
    return 0;
  };

  const getTotalBags = (trip: Trip) => {
    return trip.summary?.totalQuantityLoaded || trip.tripDetails?.totalBags || 0;
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

  const filteredTrips = trips.filter(trip => {
    if (filter === 'all') return true;
    return trip.status === filter;
  });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={fetchData} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Trip Management</Text>
          <Text style={styles.subtitle}>
            {autoRefresh ? '🟢 Live Updates Enabled' : '⚪ Live Updates Disabled'}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <Button
            onPress={() => setShowNotifications(!showNotifications)}
            variant="secondary"
            style={styles.headerButton}
          >
            🔔 {notifications.length > 0 && `(${notifications.length})`}
          </Button>
          <Button
            onPress={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'success' : 'secondary'}
            style={styles.headerButton}
          >
            {autoRefresh ? '⏸️ Pause' : '▶️ Enable'}
          </Button>
          <Button onPress={fetchData} variant="secondary" style={styles.headerButton}>
            🔄
          </Button>
          <Button onPress={() => setShowCreateModal(true)} style={styles.headerButton}>
            🚀 New
          </Button>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <Select
          label="Filter by Status"
          value={filter}
          onChange={(value) => setFilter(value as string)}
          options={[
            { label: 'All Trips', value: 'all' },
            { label: 'Pending', value: 'pending' },
            { label: 'Loading', value: 'loading' },
            { label: 'In Transit', value: 'in_transit' },
            { label: 'Completed', value: 'completed' },
            { label: 'Cancelled', value: 'cancelled' },
          ]}
        />
      </View>

      {/* Notifications Panel */}
      {showNotifications && (
        <Card style={styles.notificationsCard}>
          <View style={styles.notificationsHeader}>
            <Text style={styles.sectionTitle}>Delivery Notifications</Text>
            <Button onPress={clearNotifications} variant="secondary" style={styles.smallButton}>
              Clear All
            </Button>
          </View>
          {notifications.length === 0 ? (
            <Text style={styles.emptyText}>No notifications yet</Text>
          ) : (
            <View style={styles.notificationsList}>
              {notifications.map((notif) => (
                <View
                  key={notif.id}
                  style={[
                    styles.notificationItem,
                    notif.type === 'trip_completed' ? styles.notificationCompleted : styles.notificationDelivery,
                  ]}
                >
                  <Text style={styles.notificationMessage}>{notif.message}</Text>
                  <Text style={styles.notificationMeta}>
                    Driver: {notif.driverName} | Trip #{notif.tripNumber}
                  </Text>
                  {notif.location && notif.bags > 0 && (
                    <Text style={styles.notificationMeta}>
                      Location: {notif.location} | {notif.bags} bags
                    </Text>
                  )}
                  <Text style={styles.notificationTime}>
                    {new Date(notif.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* Trips List */}
      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
      ) : (
        <Card style={styles.tripsCard}>
          {filteredTrips.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No trips found{filter !== 'all' ? ` with status "${filter}"` : ''}. Click "New" to create one.
              </Text>
            </View>
          ) : (
            <View style={styles.tripsList}>
              {filteredTrips.map((trip) => {
                const deliveredBags = calculateDeliveredBags(trip);
                const totalBags = getTotalBags(trip);
                const deliveryCount = trip.deliveryEntries?.length || 0;
                const isExpanded = expandedTrips.has(trip._id);
                const statusColor = getStatusColor(trip.status);
                const progressPercentage = totalBags > 0 ? Math.min((deliveredBags / totalBags) * 100, 100) : 0;

                return (
                  <View key={trip._id} style={styles.tripCard}>
                    <TouchableOpacity onPress={() => toggleTripExpansion(trip._id)}>
                      <View style={styles.tripHeader}>
                        <View style={styles.tripMainInfo}>
                          <Text style={styles.tripDate}>
                            {new Date(trip.date || trip.createdAt || '').toLocaleDateString()}
                          </Text>
                          <Text style={styles.tripDriver}>
                            {trip.driverId?.name || 'N/A'}
                          </Text>
                          <Text style={styles.tripVehicle}>
                            {trip.vehicleId?.registrationNumber || 'N/A'}
                          </Text>
                          <Text style={styles.tripRoute}>
                            {trip.from && trip.to ? `${trip.from} → ${trip.to}` : trip.routeId?.name || 'N/A'}
                          </Text>
                        </View>
                        <View style={styles.tripStats}>
                          <View style={styles.bagsContainer}>
                            <Text style={styles.bagsText}>
                              {deliveredBags} / {totalBags}
                            </Text>
                            <Text style={styles.bagsLabel}>bags</Text>
                            {deliveredBags > 0 && (
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
                          </View>
                          <Text style={styles.deliveryCount}>
                            {deliveryCount} location{deliveryCount !== 1 ? 's' : ''}
                          </Text>
                          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                            <Text style={[styles.statusText, { color: statusColor.text }]}>
                              {trip.status?.replace('_', ' ').toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.tripExpanded}>
                        <View style={styles.expandedSection}>
                          <Text style={styles.expandedTitle}>Trip Information</Text>
                          <Text style={styles.expandedText}>
                            <Text style={styles.expandedLabel}>Trip ID:</Text> {trip._id.substring(trip._id.length - 8)}
                          </Text>
                          <Text style={styles.expandedText}>
                            <Text style={styles.expandedLabel}>Start Time:</Text>{' '}
                            {trip.startTime ? new Date(trip.startTime).toLocaleString() : 'N/A'}
                          </Text>
                          <Text style={styles.expandedText}>
                            <Text style={styles.expandedLabel}>End Time:</Text>{' '}
                            {trip.endTime ? new Date(trip.endTime).toLocaleString() : 'N/A'}
                          </Text>
                          <Text style={styles.expandedText}>
                            <Text style={styles.expandedLabel}>Distance:</Text>{' '}
                            {trip.summary?.totalKm || trip.tripDetails?.distance || 'N/A'} km
                          </Text>
                        </View>

                        <View style={styles.expandedSection}>
                          <Text style={styles.expandedTitle}>Summary</Text>
                          <Text style={styles.expandedText}>
                            <Text style={styles.expandedLabel}>Total Loaded:</Text>{' '}
                            {trip.summary?.totalQuantityLoaded || 0} bags
                          </Text>
                          <Text style={styles.expandedText}>
                            <Text style={styles.expandedLabel}>Total Delivered:</Text>{' '}
                            <Text style={styles.deliveredText}>{trip.summary?.totalQuantityDelivered || deliveredBags} bags</Text>
                          </Text>
                          <Text style={styles.expandedText}>
                            <Text style={styles.expandedLabel}>Completed Deliveries:</Text>{' '}
                            {trip.summary?.numberOfCompletedDeliveries || 0} / {deliveryCount}
                          </Text>
                        </View>

                        {trip.deliveryEntries && trip.deliveryEntries.length > 0 && (
                          <View style={styles.expandedSection}>
                            <Text style={styles.expandedTitle}>
                              Delivery Locations ({trip.deliveryEntries.length})
                            </Text>
                            <ScrollView style={styles.deliveriesScroll}>
                              {trip.deliveryEntries.map((entry, index) => {
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
                                      styles.deliveryEntry,
                                      isDelivered ? styles.deliveryEntryDelivered : styles.deliveryEntryPending,
                                    ]}
                                  >
                                    <View style={styles.deliveryEntryHeader}>
                                      <Text style={styles.deliveryEntryLocation}>
                                        {index + 1}. {location}
                                      </Text>
                                      {isDelivered && (
                                        <View style={styles.deliveredBadge}>
                                          <Text style={styles.deliveredBadgeText}>✓ Delivered</Text>
                                        </View>
                                      )}
                                    </View>
                                    <Text style={styles.deliveryEntryBags}>
                                      Bags: {actualBags} {plannedItems[0]?.unit || 'bags'}
                                      {actualBags !== plannedBags && actualBags > 0 && (
                                        <Text style={styles.plannedBags}> (Planned: {plannedBags})</Text>
                                      )}
                                    </Text>
                                    {isDelivered && entry.actualDelivery && (
                                      <View style={styles.deliveryInfo}>
                                        {entry.actualDelivery.receivedBy && (
                                          <Text style={styles.deliveryInfoText}>
                                            Received by: {entry.actualDelivery.receivedBy}
                                          </Text>
                                        )}
                                        {entry.actualDelivery.deliveredAt && (
                                          <Text style={styles.deliveryInfoText}>
                                            Delivered: {new Date(entry.actualDelivery.deliveredAt).toLocaleString()}
                                          </Text>
                                        )}
                                      </View>
                                    )}
                                  </View>
                                );
                              })}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      )}

      {/* Create Trip Modal */}
      <Modal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Start New Trip"
      >
        <ScrollView>
          <Input
            label="Date"
            value={formData.date}
            onChangeText={(text) => setFormData({ ...formData, date: text })}
          />

          <View style={styles.formRow}>
            <Input
              label="From"
              value={formData.from}
              onChangeText={(text) => setFormData({ ...formData, from: text })}
              containerStyle={styles.halfInput}
            />
            <Input
              label="To"
              value={formData.to}
              onChangeText={(text) => setFormData({ ...formData, to: text })}
              containerStyle={styles.halfInput}
            />
          </View>
          <Select
            label="Driver *"
            value={formData.driverId}
            onChange={(value) => setFormData({ ...formData, driverId: value as string })}
            options={[
              { label: 'Select Driver', value: '' },
              ...drivers.map(d => ({ label: `${d.name || 'Driver'} (${d.phoneNumber || ''})`, value: d._id })),
            ]}
            required
          />
          <Select
            label="Vehicle *"
            value={formData.vehicleId}
            onChange={(value) => setFormData({ ...formData, vehicleId: value as string })}
            options={[
              { label: 'Select Vehicle', value: '' },
              ...vehicles.map(v => ({ label: `${v.registrationNumber} ${v.vehicleType ? `(${v.vehicleType})` : ''}`, value: v._id })),
            ]}
            required
          />
          <View style={styles.formRow}>
            <Input
              label="Present KM"
              value={formData.presentKm}
              onChangeText={(text) => setFormData({ ...formData, presentKm: text })}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
            <Input
              label="KM Average"
              value={formData.kmAverage}
              onChangeText={(text) => setFormData({ ...formData, kmAverage: text })}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
          </View>
          <Input
            label="Distance (km)"
            value={formData.distance}
            onChangeText={(text) => setFormData({ ...formData, distance: text })}
            keyboardType="numeric"
          />
          <Input
            label="Total Quantity (bags)"
            value={formData.quantity}
            onChangeText={(text) => setFormData({ ...formData, quantity: text })}
            keyboardType="numeric"
          />
          <View style={styles.formRow}>
            <Input
              label="Oil/Diesel (L)"
              value={formData.oilDiesel}
              onChangeText={(text) => setFormData({ ...formData, oilDiesel: text })}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
            <Input
              label="Advance Payment"
              value={formData.advancePayment}
              onChangeText={(text) => setFormData({ ...formData, advancePayment: text })}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
            />
          </View>
          <Input
            label="Helper Name"
            value={formData.helper}
            onChangeText={(text) => setFormData({ ...formData, helper: text })}
          />
          <Input
            label="Other"
            value={formData.other}
            onChangeText={(text) => setFormData({ ...formData, other: text })}
          />
          <View style={styles.modalActions}>
            <Button
              onPress={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              variant="secondary"
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button onPress={handleCreateTrip} style={styles.modalButton}>
              Create Trip
            </Button>
          </View>
        </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  smallButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterContainer: {
    padding: 16,
    paddingTop: 0,
  },
  notificationsCard: {
    margin: 16,
    marginTop: 0,
  },
  notificationsHeader: {
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
  notificationsList: {
    gap: 12,
    maxHeight: 300,
  },
  notificationItem: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  notificationCompleted: {
    backgroundColor: '#f0fdf4',
    borderLeftColor: '#16a34a',
  },
  notificationDelivery: {
    backgroundColor: '#dbeafe',
    borderLeftColor: '#2563eb',
  },
  notificationMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  notificationMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  loader: {
    marginVertical: 32,
  },
  tripsCard: {
    margin: 16,
    marginTop: 0,
  },
  tripsList: {
    gap: 12,
  },
  tripCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  tripHeader: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  tripMainInfo: {
    flex: 1,
  },
  tripDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  tripDriver: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  tripVehicle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  tripRoute: {
    fontSize: 12,
    color: '#6b7280',
  },
  tripStats: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  bagsContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  bagsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  bagsLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  progressBarContainer: {
    width: 80,
    marginTop: 4,
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  deliveryCount: {
    fontSize: 12,
    color: '#6b7280',
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
  expandIcon: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 8,
  },
  tripExpanded: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  expandedSection: {
    marginBottom: 16,
  },
  expandedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  expandedText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  expandedLabel: {
    fontWeight: '600',
    color: '#6b7280',
  },
  deliveredText: {
    color: '#16a34a',
    fontWeight: '600',
  },
  deliveriesScroll: {
    maxHeight: 200,
  },
  deliveryEntry: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  deliveryEntryPending: {
    backgroundColor: '#ffffff',
    borderLeftColor: '#d1d5db',
  },
  deliveryEntryDelivered: {
    backgroundColor: '#f0fdf4',
    borderLeftColor: '#16a34a',
  },
  deliveryEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deliveryEntryLocation: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  deliveredBadge: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  deliveredBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  deliveryEntryBags: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  plannedBags: {
    fontSize: 11,
    color: '#9ca3af',
  },
  deliveryInfo: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#86efac',
  },
  deliveryInfoText: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default TripManagement;
