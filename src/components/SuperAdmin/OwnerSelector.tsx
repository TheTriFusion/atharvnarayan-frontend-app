import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useOwner } from '../../contexts/OwnerContext';
import { getCattleFeedOwners, getMilkTruckOwners } from '../../utils/storage';
import Select from '../common/Select';
import Button from '../common/Button';
import Card from '../common/Card';

interface OwnerSelectorProps {
  systemType?: 'both' | 'cattleFeed' | 'milkTruck' | 'cattleFeedTruck';
}

const OwnerSelector: React.FC<OwnerSelectorProps> = ({ systemType = 'both' }) => {
  const { selectedOwnerId, selectedOwnerData, ownerType, selectOwner, clearOwner } = useOwner();
  const [cattleFeedOwners, setCattleFeedOwners] = useState<any[]>([]);
  const [milkTruckOwners, setMilkTruckOwners] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<'cattleFeed' | 'milkTruck' | 'cattleFeedTruck'>(ownerType || 'cattleFeed');
  const [selectedId, setSelectedId] = useState<string>(selectedOwnerId || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOwners();
  }, []);

  const loadOwners = async () => {
    setLoading(true);
    try {
      const [cfOwners, mtOwners] = await Promise.all([
        getCattleFeedOwners(),
        getMilkTruckOwners(),
      ]);
      setCattleFeedOwners(Array.isArray(cfOwners) ? cfOwners : []);
      setMilkTruckOwners(Array.isArray(mtOwners) ? mtOwners : []);
    } catch (error) {
      console.error('Error loading owners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!selectedId) {
      clearOwner();
      return;
    }

    const owners = selectedType === 'cattleFeed' ? cattleFeedOwners : milkTruckOwners;
    const owner = owners.find((o) => (o._id || o.id) === selectedId);
    
    if (owner) {
      selectOwner(selectedId, owner, selectedType);
    }
  };

  const handleClear = () => {
    setSelectedId('');
    setSelectedType('cattleFeed');
    clearOwner();
  };

  const currentOwners = selectedType === 'cattleFeed' ? cattleFeedOwners : milkTruckOwners;
  const ownerOptions = currentOwners.map((owner) => ({
    value: owner._id || owner.id,
    label: `${owner.name || 'Unknown'} - ${owner.phoneNumber || 'N/A'}`,
  }));

  return (
    <Card style={styles.container}>
      <View style={styles.content}>
        <View style={styles.typeSelector}>
          <Text style={styles.label}>System Type</Text>
          <View style={styles.buttonRow}>
            {(systemType === 'both' || systemType === 'cattleFeed') && (
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'cattleFeed' && styles.activeTypeButton]}
                onPress={() => {
                  setSelectedType('cattleFeed');
                  setSelectedId('');
                }}
              >
                <Text style={[styles.typeButtonText, selectedType === 'cattleFeed' && styles.activeTypeButtonText]}>
                  Cattle Feed
                </Text>
              </TouchableOpacity>
            )}
            {(systemType === 'both' || systemType === 'milkTruck') && (
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'milkTruck' && styles.activeTypeButton]}
                onPress={() => {
                  setSelectedType('milkTruck');
                  setSelectedId('');
                }}
              >
                <Text style={[styles.typeButtonText, selectedType === 'milkTruck' && styles.activeTypeButtonText]}>
                  Milk Truck
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.selectContainer}>
          <Select
            label="Select Owner"
            value={selectedId}
            onChange={(value) => setSelectedId(value as string)}
            options={ownerOptions}
            containerStyle={styles.select}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button variant="primary" onPress={handleApply} style={styles.button}>
            Apply Filter
          </Button>
          {selectedOwnerId && (
            <Button variant="secondary" onPress={handleClear} style={styles.button}>
              Clear Filter
            </Button>
          )}
        </View>
      </View>

      {selectedOwnerData && (
        <View style={styles.selectedInfo}>
          <Text style={styles.infoLabel}>Currently Managing:</Text>
          <Text style={styles.infoName}>
            {selectedOwnerData.name} ({ownerType === 'cattleFeed' ? 'Cattle Feed' : 'Milk Truck'})
          </Text>
          <Text style={styles.infoPhone}>{selectedOwnerData.phoneNumber}</Text>
        </View>
      )}

      {!selectedOwnerId && (
        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>
            <Text style={styles.noteBold}>Note:</Text> Select an owner to view and manage their specific data. When no owner is selected, you'll see aggregated data from all owners.
          </Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  content: {
    gap: 12,
  },
  typeSelector: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  activeTypeButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  activeTypeButtonText: {
    color: '#ffffff',
  },
  selectContainer: {
    flex: 1,
  },
  select: {
    marginBottom: 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
  },
  selectedInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  infoName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  infoPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  noteContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
  },
  noteText: {
    fontSize: 14,
    color: '#6b7280',
  },
  noteBold: {
    fontWeight: '600',
  },
});

export default OwnerSelector;

