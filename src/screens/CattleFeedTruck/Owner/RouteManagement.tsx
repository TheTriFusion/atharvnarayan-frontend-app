import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Animated, RefreshControl, StatusBar, Platform, TextInput } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';

interface Route {
  _id: string;
  name: string;
  startPoint?: string;
  deliveryPoints?: any[];
  estimatedDistance?: string;
}

const RouteManagement: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Refresh when focused
  useFocusEffect(
    React.useCallback(() => {
      fetchRoutes();
    }, [])
  );

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRoutes(routes);
    } else {
      const filtered = routes.filter(route =>
        route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.startPoint?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRoutes(filtered);
    }
  }, [searchQuery, routes]);

  const fetchRoutes = async () => {
    try {
      const response = await cattleFeedTruckAPI.getRoutes(user?.id);
      const data = Array.isArray(response) ? response : (Array.isArray(response.data) ? response.data : []);
      setRoutes(data);
      setFilteredRoutes(data);
    } catch (error: any) {
      console.error('Error fetching routes:', error);
      toast.error('Error loading routes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchRoutes();
  }, []);

  const handleAdd = () => {
    navigation.navigate('ManageRoute');
  };

  const handleEdit = (route: Route) => {
    navigation.navigate('ManageRoute', { route });
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Route',
      'Are you sure you want to delete this route?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await cattleFeedTruckAPI.deleteRoute(id);
              toast.success('Route deleted successfully!');
              fetchRoutes();
            } catch (error: any) {
              console.error('Error deleting route:', error);
              toast.error('Error deleting route');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing && routes.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading Routes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={[colors.primary[600], colors.primary[400], colors.background.primary]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
      />

      <View style={styles.headerSpacer} />

      <ScreenHeader
        title="Route Management"
        subtitle="Manage distribution paths"
        transparent
        titleStyle={{ color: '#fff' }}
        subtitleStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAdd}
          >
            <Text style={styles.addButtonText}>+ New</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search by route name or start point..."
            placeholderTextColor={colors.text.tertiary}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {filteredRoutes.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Text style={styles.emptyIcon}>🗺️</Text>
              </View>
              <Text style={styles.emptyTitle}>No Routes Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? `No results match "${searchQuery}"` : "You haven't designed any distribution routes yet."}
              </Text>
              <Button
                onPress={() => searchQuery ? setSearchQuery('') : handleAdd()}
                variant="outline"
                style={styles.emptyButton}
              >
                {searchQuery ? "Clear Search" : "Add Route"}
              </Button>
            </View>
          ) : (
            <View style={styles.list}>
              {filteredRoutes.map((route) => (
                <Card key={route._id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.iconContainer}>
                      <Text style={styles.iconEmoji}>🛣️</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.routeName}>{route.name}</Text>
                      <View style={styles.startBox}>
                        <Text style={styles.startLabel}>FROM: </Text>
                        <Text style={styles.startValue}>{route.startPoint || 'Primary Source'}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.details}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Stops</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{route.deliveryPoints?.length || 0} POINTS</Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Est. Distance</Text>
                      <Text style={styles.detailValue}>{route.estimatedDistance ? `${route.estimatedDistance} KM` : 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.editBtn]}
                      onPress={() => handleEdit(route)}
                    >
                      <Text style={styles.editBtnText}>Edit Route</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => handleDelete(route._id)}
                    >
                      <Text style={styles.deleteBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          )}
          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  headerSpacer: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: colors.primary[600],
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    height: 48,
    ...shadows.md,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
  },
  clearIcon: {
    fontSize: 14,
    color: colors.text.tertiary,
    padding: 4,
  },
  list: {
    gap: 16,
    marginTop: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: '#fff',
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  startBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.tertiary,
  },
  startValue: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 12,
  },
  details: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary[600],
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: '#fff',
    borderColor: colors.primary[600],
  },
  editBtnText: {
    color: colors.primary[600],
    fontWeight: '600',
    fontSize: 14,
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  deleteBtnText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyButton: {
    width: 160,
  },
});


export default RouteManagement;
