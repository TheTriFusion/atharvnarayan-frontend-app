import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Input from '../../common/Input';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { addBMCCollectionEntry, getMilkTruckTrip } from '../../../utils/storage';

interface BMCCollectionProps {
    trip: any;
    route: any;
    onComplete: (updatedTrip: any) => void;
}

const BMCCollection: React.FC<BMCCollectionProps> = ({ trip, route, onComplete }) => {
    const [tripData, setTripData] = useState(trip);
    const [selectedBMCId, setSelectedBMCId] = useState<string>('');
    const [formData, setFormData] = useState({
        milkQuantity: '',
        fatContent: '',
        snfContent: '',
    });
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const routeBMCs = route?.bmcSequence || [];

    // Refresh trip data to sync status
    const refreshTrip = useCallback(async () => {
        try {
            setRefreshing(true);
            const updated = await getMilkTruckTrip(trip._id || trip.id);
            if (updated) {
                setTripData(updated);
            }
        } catch (error) {
            console.error('Error refreshing trip:', error);
        } finally {
            setRefreshing(false);
        }
    }, [trip]);

    useEffect(() => {
        refreshTrip();
    }, [refreshTrip]);

    // Check if a specific BMC is collected
    const isBMCCollected = useCallback((bmcId: string) => {
        if (!bmcId || !tripData.bmcEntries) return false;

        const entry = tripData.bmcEntries.find((e: any) => {
            const entryBMCId = e.bmcId?._id || e.bmcId?.id || e.bmcId;
            return entryBMCId && entryBMCId.toString() === bmcId.toString();
        });

        return !!(entry && entry.collectionData);
    }, [tripData]);

    // Check if all BMCs are collected
    const allCollected = routeBMCs.every((bmc: any) => isBMCCollected(bmc._id || bmc.id));
    const uncollectedBMCs = routeBMCs.filter((bmc: any) => !isBMCCollected(bmc._id || bmc.id));

    // Auto-complete trip stage if all collected
    useEffect(() => {
        if (allCollected) {
            const timer = setTimeout(() => {
                onComplete(tripData);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [allCollected, tripData, onComplete]);

    // Auto-select next uncollected BMC
    useEffect(() => {
        if (uncollectedBMCs.length > 0 && !selectedBMCId) {
            const nextBMC = uncollectedBMCs[0];
            setSelectedBMCId(nextBMC._id || nextBMC.id);
        }
    }, [uncollectedBMCs, selectedBMCId]);

    const handleSelectBMC = (bmcId: string) => {
        setSelectedBMCId(bmcId);

        // Reset form
        const entry = tripData.bmcEntries?.find((e: any) => {
            const entryBMCId = e.bmcId?._id || e.bmcId?.id || e.bmcId;
            return entryBMCId && entryBMCId.toString() === bmcId.toString();
        });

        if (entry && entry.collectionData) {
            setFormData({
                milkQuantity: entry.collectionData.milkQuantity.toString(),
                fatContent: entry.collectionData.fatContent.toString(),
                snfContent: entry.collectionData.snfContent.toString(),
            });
        } else {
            setFormData({ milkQuantity: '', fatContent: '', snfContent: '' });
        }
    };

    const handleSubmit = async () => {
        if (!selectedBMCId) {
            Alert.alert('Error', 'Please select a BMC');
            return;
        }

        if (!formData.milkQuantity || !formData.fatContent || !formData.snfContent) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const collectionEntry = {
                bmcId: selectedBMCId,
                milkQuantity: parseFloat(formData.milkQuantity),
                fatContent: parseFloat(formData.fatContent),
                snfContent: parseFloat(formData.snfContent),
            };

            const tripId = trip._id || trip.id;
            const updatedTrip = await addBMCCollectionEntry(tripId, collectionEntry);

            if (updatedTrip) {
                setTripData(updatedTrip);
                Alert.alert('Success', 'Collection data saved!');

                // Clear form and selection after success
                setFormData({ milkQuantity: '', fatContent: '', snfContent: '' });
                setSelectedBMCId(''); // Triggers auto-selection of next uncollected BMC
            }
        } catch (error: any) {
            console.error('Error saving collection:', error);
            Alert.alert('Error', error.message || 'Failed to save collection data');
        } finally {
            setLoading(false);
        }
    };

    const collectedCount = tripData.bmcEntries?.filter((e: any) => e.collectionData).length || 0;
    const progress = routeBMCs.length > 0 ? collectedCount / routeBMCs.length : 0;

    const currentBMC = routeBMCs.find((b: any) => (b._id || b.id) === selectedBMCId);

    return (
        <View style={styles.container}>
            {/* Progress Card */}
            <Card variant="elevated" style={styles.card}>
                <Text style={styles.sectionTitle}>Collection Progress</Text>
                <View style={styles.progressInfo}>
                    <Text style={styles.progressText}>
                        {collectedCount} of {routeBMCs.length} collected
                    </Text>
                    <Text style={styles.progressPercent}>
                        {Math.round(progress * 100)}%
                    </Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                </View>
            </Card>

            {/* BMC List (Horizontal Scroll) */}
            <View style={styles.bmcListContainer}>
                <Text style={styles.sectionLabel}>Select BMC</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bmcScroll}>
                    {routeBMCs.map((bmc: any) => {
                        const id = bmc._id || bmc.id;
                        const isSelected = selectedBMCId === id;
                        const isCollected = isBMCCollected(id);

                        return (
                            <TouchableOpacity
                                key={id}
                                style={[
                                    styles.bmcChip,
                                    isSelected && styles.bmcChipSelected,
                                    isCollected && styles.bmcChipCollected
                                ]}
                                onPress={() => handleSelectBMC(id)}
                                disabled={isCollected}
                            >
                                <Text style={[
                                    styles.bmcChipText,
                                    isSelected && styles.bmcChipTextSelected,
                                    isCollected && styles.bmcChipTextCollected
                                ]}>
                                    {bmc.name}
                                </Text>
                                {isCollected && (
                                    <Text style={styles.checkMark}>✓</Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Data Entry Form */}
            {selectedBMCId && (
                <Card variant="elevated" style={styles.formCard}>
                    <Text style={styles.formTitle}>
                        Data for {currentBMC?.name || 'Unknown BMC'}
                    </Text>

                    <Input
                        label="Milk Quantity (L)"
                        value={formData.milkQuantity}
                        onChangeText={(text) => setFormData({ ...formData, milkQuantity: text })}
                        placeholder="e.g. 150.5"
                        keyboardType="numeric"
                    />

                    <Input
                        label="Fat Content (%)"
                        value={formData.fatContent}
                        onChangeText={(text) => setFormData({ ...formData, fatContent: text })}
                        placeholder="e.g. 4.5"
                        keyboardType="numeric"
                    />

                    <Input
                        label="SNF Content (%)"
                        value={formData.snfContent}
                        onChangeText={(text) => setFormData({ ...formData, snfContent: text })}
                        placeholder="e.g. 8.5"
                        keyboardType="numeric"
                    />

                    <Button
                        onPress={handleSubmit}
                        loading={loading}
                        disabled={loading}
                        variant="primary"
                        style={styles.submitButton}
                    >
                        {loading ? "Saving..." : "Save Collection Data"}
                    </Button>
                </Card>
            )}

            {/* All Collected Message */}
            {allCollected && !selectedBMCId && (
                <View style={styles.allCollectedContainer}>
                    <Text style={styles.allCollectedText}>✓ All collections completed!</Text>
                    <Text style={styles.redirectText}>Proceeding to Dairy Confirmation...</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: spacing.md,
    },
    card: {
        marginBottom: spacing.xs,
    },
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    progressText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    },
    progressPercent: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold,
        color: colors.primary[600],
    },
    progressBarBg: {
        height: 8,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.primary[600],
        borderRadius: borderRadius.full,
    },
    bmcListContainer: {
        marginVertical: spacing.sm,
    },
    sectionLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    bmcScroll: {
        paddingHorizontal: spacing.xs,
        gap: spacing.sm,
    },
    bmcChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.background.primary,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border.light,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minWidth: 100,
        justifyContent: 'center',
    },
    bmcChipSelected: {
        borderColor: colors.primary[600],
        backgroundColor: colors.primary[50],
    },
    bmcChipCollected: {
        borderColor: colors.success[500],
        backgroundColor: colors.success[50],
    },
    bmcChipText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
        fontWeight: typography.fontWeight.medium,
    },
    bmcChipTextSelected: {
        color: colors.primary[700],
        fontWeight: typography.fontWeight.bold,
    },
    bmcChipTextCollected: {
        color: colors.success[700],
    },
    checkMark: {
        color: colors.success[600],
        fontWeight: 'bold',
    },
    formCard: {
        padding: spacing.md,
    },
    formTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.lg,
    },
    submitButton: {
        marginTop: spacing.lg,
    },
    allCollectedContainer: {
        padding: spacing.lg,
        backgroundColor: colors.success[50],
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.success[200],
        marginTop: spacing.md,
    },
    allCollectedText: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.success[700],
        marginBottom: spacing.xs,
    },
    redirectText: {
        fontSize: typography.fontSize.sm,
        color: colors.success[600],
    },
});

export default BMCCollection;
