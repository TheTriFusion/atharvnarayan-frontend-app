import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getMilkTruckTrips, getMilkTruckBMCs, getMilkTruckVehicles, getMilkTruckDrivers, getMilkTruckRoutes, getMilkTruckPricing } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Select from '../../../components/common/Select';
import Modal from '../../../components/common/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { useOwner } from '../../../contexts/OwnerContext';
import OwnerSelector from '../../../components/SuperAdmin/OwnerSelector';
import { useToast } from '../../../contexts/ToastContext';

const Reports: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { selectedOwnerId } = useOwner();
  const navigation = useNavigation<any>();
  const { error: showError } = useToast();
  const [trips, setTrips] = useState<any[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    vehicleId: '',
    driverId: '',
  });
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [bmcs, setBMCs] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, [selectedOwnerId]);

  useEffect(() => {
    applyFilters();
  }, [filters, trips]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const ownerId = isSuperAdmin ? selectedOwnerId : null;
      const [tripsData, vehiclesData, driversData, routesData, bmcsData, pricingData] = await Promise.all([
        getMilkTruckTrips(ownerId),
        getMilkTruckVehicles(ownerId),
        getMilkTruckDrivers(ownerId),
        getMilkTruckRoutes(ownerId),
        getMilkTruckBMCs(ownerId),
        getMilkTruckPricing(),
      ]);

      const tripsArray = Array.isArray(tripsData) ? tripsData : [];
      const completedTrips = tripsArray.filter(t => t.status === 'completed');
      
      setTrips(completedTrips);
      setFilteredTrips(completedTrips);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setDrivers(Array.isArray(driversData) ? driversData : []);
      setRoutes(Array.isArray(routesData) ? routesData : []);
      setBMCs(Array.isArray(bmcsData) ? bmcsData : []);
      setPricing(pricingData || { basePricePerLiter: 50, fatPricePerPercent: 2, snfPricePerPercent: 1 });
    } catch (error: any) {
      console.error('Error loading reports data:', error);
      showError(error.message || 'Failed to load reports');
      setPricing({ basePricePerLiter: 50, fatPricePerPercent: 2, snfPricePerPercent: 1 });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...trips];

    if (filters.startDate) {
      filtered = filtered.filter(t => 
        new Date(t.startTime) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(t => 
        new Date(t.startTime) <= new Date(filters.endDate)
      );
    }

    if (filters.vehicleId) {
      filtered = filtered.filter(t => (t.vehicleId?._id || t.vehicleId?.id || t.vehicleId) === filters.vehicleId);
    }

    if (filters.driverId) {
      filtered = filtered.filter(t => (t.driverId?._id || t.driverId?.id || t.driverId) === filters.driverId);
    }

    setFilteredTrips(filtered);
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const calculateTripPayment = (trip: any) => {
    if (!trip.dairyConfirmation || !pricing) return 0;

    const { totalMilkQuantity, fatContent, snfContent } = trip.dairyConfirmation;
    const baseAmount = pricing.basePricePerLiter * totalMilkQuantity;
    const fatAmount = pricing.fatPricePerPercent * fatContent * totalMilkQuantity;
    const snfAmount = pricing.snfPricePerPercent * snfContent * totalMilkQuantity;

    return baseAmount + fatAmount + snfAmount;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading reports data...</Text>
      </View>
    );
  }

  const vehicleOptions = [
    { value: '', label: 'All Vehicles' },
    ...vehicles.map(v => ({ value: v._id || v.id, label: v.registrationNumber })),
  ];

  const driverOptions = [
    { value: '', label: 'All Drivers' },
    ...drivers.map(d => ({ value: d._id || d.id, label: d.name })),
  ];

  return (
    <ScrollView style={styles.container}>
      {isSuperAdmin && <OwnerSelector systemType="milkTruck" />}
      
      <Text style={styles.title}>Reports</Text>

      <Card title="Filters">
        <View style={styles.filters}>
          <Input
            label="Start Date"
            value={filters.startDate}
            onChangeText={(value) => handleFilterChange('startDate', value)}
            placeholder="YYYY-MM-DD"
          />
          <Input
            label="End Date"
            value={filters.endDate}
            onChangeText={(value) => handleFilterChange('endDate', value)}
            placeholder="YYYY-MM-DD"
          />
          <Select
            label="Vehicle"
            value={filters.vehicleId}
            onChange={(value) => handleFilterChange('vehicleId', value as string)}
            options={vehicleOptions}
          />
          <Select
            label="Driver"
            value={filters.driverId}
            onChange={(value) => handleFilterChange('driverId', value as string)}
            options={driverOptions}
          />
        </View>
      </Card>

      <Card title={`Completed Trips (${filteredTrips.length})`}>
        {filteredTrips.length === 0 ? (
          <Text style={styles.emptyText}>No completed trips found</Text>
        ) : (
          <View style={styles.tripsList}>
            {filteredTrips.map((trip) => {
              const vehicle = Array.isArray(vehicles) ? vehicles.find(v => (v._id || v.id) === (trip.vehicleId?._id || trip.vehicleId?.id || trip.vehicleId)) : null;
              const driver = Array.isArray(drivers) ? drivers.find(d => (d._id || d.id) === (trip.driverId?._id || trip.driverId?.id || trip.driverId)) : null;
              const payment = calculateTripPayment(trip);
              
              return (
                <View key={trip._id || trip.id} style={styles.tripItem}>
                  <View style={styles.tripItemContent}>
                    <Text style={styles.tripId}>Trip ID: {trip._id || trip.id}</Text>
                    <Text style={styles.tripDetail}>🚚 {vehicle?.registrationNumber || 'N/A'}</Text>
                    <Text style={styles.tripDetail}>👤 {driver?.name || 'N/A'}</Text>
                    <Text style={styles.tripDetail}>
                      📅 {new Date(trip.endTime || trip.startTime).toLocaleDateString()}
                    </Text>
                    <Text style={styles.tripDetail}>
                      🥛 {trip.dairyConfirmation?.totalMilkQuantity?.toFixed(2) || 'N/A'} L
                    </Text>
                    <Text style={styles.tripPayment}>💰 ₹{payment.toFixed(2)}</Text>
                  </View>
                  <Button
                    variant="secondary"
                    onPress={() => {
                      navigation.navigate('MilkTruckDriverTripDetails', { tripId: trip._id || trip.id });
                    }}
                    style={styles.viewButton}
                  >
                    View Details
                  </Button>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      <Modal
        visible={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
        title="Trip Details"
      >
        {selectedTrip && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.tripDetails}>
              <Text style={styles.detailLabel}>Trip ID</Text>
              <Text style={styles.detailValue}>{selectedTrip._id || selectedTrip.id}</Text>
              
              <Text style={styles.detailLabel}>Vehicle</Text>
              <Text style={styles.detailValue}>
                {(Array.isArray(vehicles) ? vehicles.find(v => (v._id || v.id) === (selectedTrip.vehicleId?._id || selectedTrip.vehicleId?.id || selectedTrip.vehicleId)) : null)?.registrationNumber || 'N/A'}
              </Text>
              
              <Text style={styles.detailLabel}>Driver</Text>
              <Text style={styles.detailValue}>
                {(Array.isArray(drivers) ? drivers.find(d => (d._id || d.id) === (selectedTrip.driverId?._id || selectedTrip.driverId?.id || selectedTrip.driverId)) : null)?.name || 'N/A'}
              </Text>
              
              <Text style={styles.detailLabel}>Start Time</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedTrip.startTime).toLocaleString()}
              </Text>
              
              <Text style={styles.detailLabel}>End Time</Text>
              <Text style={styles.detailValue}>
                {selectedTrip.endTime ? new Date(selectedTrip.endTime).toLocaleString() : 'N/A'}
              </Text>

              {selectedTrip.dairyConfirmation && (
                <>
                  <Text style={styles.detailLabel}>Total Milk Quantity</Text>
                  <Text style={styles.detailValue}>
                    {selectedTrip.dairyConfirmation.totalMilkQuantity.toFixed(2)} L
                  </Text>
                  
                  <Text style={styles.detailLabel}>Fat Content</Text>
                  <Text style={styles.detailValue}>
                    {selectedTrip.dairyConfirmation.fatContent.toFixed(2)}%
                  </Text>
                  
                  <Text style={styles.detailLabel}>SNF Content</Text>
                  <Text style={styles.detailValue}>
                    {selectedTrip.dairyConfirmation.snfContent.toFixed(2)}%
                  </Text>
                  
                  <Text style={styles.detailLabel}>Payment</Text>
                  <Text style={[styles.detailValue, styles.paymentValue]}>
                    ₹{calculateTripPayment(selectedTrip).toFixed(2)}
                  </Text>
                </>
              )}
            </View>
          </ScrollView>
        )}
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6b7280',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  filters: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#6b7280',
  },
  tripsList: {
    gap: 12,
  },
  tripItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  tripItemContent: {
    marginBottom: 12,
  },
  tripId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  tripDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  tripPayment: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginTop: 4,
  },
  viewButton: {
    marginTop: 8,
  },
  modalContent: {
    maxHeight: 500,
  },
  tripDetails: {
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
  },
  paymentValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
  },
});

export default Reports;
