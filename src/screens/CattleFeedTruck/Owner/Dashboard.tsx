import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';

interface DashboardStats {
  totalDrivers?: number;
  totalTrips?: number;
  completedTrips?: number;
  todayTrips?: number;
}

const CattleFeedTruckOwnerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // Note: The dashboard-stats endpoint might not exist, so we'll calculate from trips
      const [tripsResponse, driversResponse] = await Promise.all([
        cattleFeedTruckAPI.getTrips(),
        cattleFeedTruckAPI.getDrivers(),
      ]);

      const tripsData = Array.isArray(tripsResponse) ? tripsResponse : (Array.isArray(tripsResponse.data) ? tripsResponse.data : []);
      const driversData = Array.isArray(driversResponse) ? driversResponse : (Array.isArray(driversResponse.data) ? driversResponse.data : []);

      setTrips(tripsData);

      // Calculate stats from trips
      const today = new Date().toDateString();
      const todayTrips = tripsData.filter((trip: any) => {
        const tripDate = new Date(trip.date || trip.createdAt || '').toDateString();
        return tripDate === today;
      });

      setStats({
        totalDrivers: driversData.length,
        totalTrips: tripsData.length,
        completedTrips: tripsData.filter((t: any) => t.status === 'completed').length,
        todayTrips: todayTrips.length,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>Cattle Feed Truck Dashboard</Text>
            <Text style={styles.subtitle} numberOfLines={1}>Welcome back, {user?.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setShowMenu(!showMenu)}
          >
            <Text style={styles.profileIcon} allowFontScaling={false}>👤</Text>
          </TouchableOpacity>
        </View>

        {showMenu && (
          <View style={styles.menuDropdown}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); /* Navigate to Profile */ }}>
              <Text style={styles.menuText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); /* Navigate to Settings */ }}>
              <Text style={styles.menuText}>Settings</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Text style={[styles.menuText, styles.logoutText]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Card style={[styles.statCard, { backgroundColor: '#3b82f6' }] as any}>
          <View style={styles.statCardContent}>
            <View>
              <Text style={styles.statLabel}>Total Drivers</Text>
              <Text style={styles.statValue}>{stats?.totalDrivers || 0}</Text>
            </View>
            <Text style={styles.statEmoji}>👤</Text>
          </View>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: '#16a34a' }] as any}>
          <View style={styles.statCardContent}>
            <View>
              <Text style={styles.statLabel}>Total Trips</Text>
              <Text style={styles.statValue}>{stats?.totalTrips || 0}</Text>
            </View>
            <Text style={styles.statEmoji}>🚚</Text>
          </View>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: '#9333ea' }] as any}>
          <View style={styles.statCardContent}>
            <View>
              <Text style={styles.statLabel}>Completed Trips</Text>
              <Text style={styles.statValue}>{stats?.completedTrips || 0}</Text>
            </View>
            <Text style={styles.statEmoji}>✅</Text>
          </View>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: '#ea580c' }] as any}>
          <View style={styles.statCardContent}>
            <View>
              <Text style={styles.statLabel}>Today's Trips</Text>
              <Text style={styles.statValue}>{stats?.todayTrips || 0}</Text>
            </View>
            <Text style={styles.statEmoji}>📅</Text>
          </View>
        </Card>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <Button
            onPress={() => navigation.navigate('VehicleManagement')}
            style={styles.actionButton}
          >
            🚛 Vehicles
          </Button>
          <Button
            onPress={() => navigation.navigate('DriverManagement')}
            style={styles.actionButton}
          >
            👥 Drivers
          </Button>
          <Button
            onPress={() => navigation.navigate('TripManagement')}
            style={styles.actionButton}
          >
            📊 All Trips
          </Button>
        </View>
      </View>

      {/* Recent Trips */}
      <Card style={styles.recentTripsCard}>
        <Text style={styles.sectionTitle}>Recent Trips</Text>
        {trips.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No trips yet</Text>
          </View>
        ) : (
          <View style={styles.tripsList}>
            {trips.slice(0, 5).map((trip: any) => (
              <View key={trip._id} style={styles.tripItem}>
                <View style={styles.tripItemContent}>
                  <Text style={styles.tripItemTitle}>
                    Trip #{trip._id.substring(trip._id.length - 6)}
                  </Text>
                  <Text style={styles.tripItemRoute}>
                    {trip.from || 'N/A'} → {trip.to || 'N/A'}
                  </Text>
                  <Text style={styles.tripItemDate}>
                    {new Date(trip.date || trip.createdAt || '').toLocaleDateString()}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  trip.status === 'completed' ? styles.statusCompleted :
                    trip.status === 'in_transit' ? styles.statusInTransit :
                      styles.statusPending
                ]}>
                  <Text style={[
                    styles.statusText,
                    trip.status === 'completed' ? styles.statusCompletedText :
                      trip.status === 'in_transit' ? styles.statusInTransitText :
                        styles.statusPendingText
                  ]}>
                    {trip.status?.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>
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
  headerContainer: {
    zIndex: 10,
    backgroundColor: '#ffffff',
    paddingBottom: 8,
    paddingTop: 40, // Add space for status bar
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    flexShrink: 1, // Allow text to shrink/wrap
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12, // Add spacing between text and button
  },
  profileIcon: {
    fontSize: 22,
  },
  menuDropdown: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 150,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 16,
    color: '#374151',
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
  },
  statCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statEmoji: {
    fontSize: 40,
    opacity: 0.2,
  },
  actionsSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
  },
  recentTripsCard: {
    margin: 16,
    marginTop: 0,
  },
  tripsList: {
    gap: 12,
  },
  tripItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  tripItemContent: {
    flex: 1,
  },
  tripItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  tripItemRoute: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  tripItemDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusCompleted: {
    backgroundColor: '#dcfce7',
  },
  statusInTransit: {
    backgroundColor: '#f3e8ff',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusCompletedText: {
    color: '#16a34a',
  },
  statusInTransitText: {
    color: '#9333ea',
  },
  statusPendingText: {
    color: '#ca8a04',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default CattleFeedTruckOwnerDashboard;
