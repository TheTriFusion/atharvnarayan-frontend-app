import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Input from '../../common/Input';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { updateMilkTruckTrip, getMilkTruckTrip, getMilkTruckRoutes } from '../../../utils/storage';

interface DairyConfirmationProps {
    trip: any;
    onConfirm: (completedTrip: any) => void;
}

const DairyConfirmation: React.FC<DairyConfirmationProps> = ({ trip, onConfirm }) => {
    const [tripData, setTripData] = useState(trip);
    const [routeBMCs, setRouteBMCs] = useState<any[]>([]);
    const [selectedBMCId, setSelectedBMCId] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Form state for current BMC verification
    const [formData, setFormData] = useState({
        receivedMilk: '',
        receivedFat: '',
        receivedSnf: '',
    });

    // Calculate variances separately to use in render
    const [variances, setVariances] = useState({
        milkDiff: 0,
        fatDiff: 0,
        snfDiff: 0,
        milkKgDiff: 0, // Not explicitly asked but good for checking
        fatKgDiff: 0,
        snfKgDiff: 0
    });

    // Calculate Trip Totals (Collected)
    const collectionTotals = React.useMemo(() => {
        let milk = 0, fatKg = 0, snfKg = 0;
        (tripData.bmcEntries || []).forEach((e: any) => {
            if (e.collectionData) {
                const m = parseFloat(e.collectionData.milkQuantity) || 0;
                const f = parseFloat(e.collectionData.fatContent) || 0;
                const s = parseFloat(e.collectionData.snfContent) || 0;
                milk += m;
                fatKg += (m * f) / 100;
                snfKg += (m * s) / 100;
            }
        });
        const avgFat = milk > 0 ? (fatKg / milk) * 100 : 0;
        const avgSnf = milk > 0 ? (snfKg / milk) * 100 : 0;
        return { milk, fatKg, snfKg, avgFat, avgSnf };
    }, [tripData]);

    // Calculate Verified Totals (Received)
    const verifiedTotals = React.useMemo(() => {
        let milk = 0, fatKg = 0, snfKg = 0;
        (tripData.bmcEntries || []).forEach((e: any) => {
            if (e.dairyVerifiedData) {
                const m = parseFloat(e.dairyVerifiedData.milkQuantity) || 0;
                const f = parseFloat(e.dairyVerifiedData.fatContent) || 0;
                const s = parseFloat(e.dairyVerifiedData.snfContent) || 0;
                milk += m;
                fatKg += (m * f) / 100;
                snfKg += (m * s) / 100;
            }
        });
        const avgFat = milk > 0 ? (fatKg / milk) * 100 : 0;
        const avgSnf = milk > 0 ? (snfKg / milk) * 100 : 0;
        return { milk, fatKg, snfKg, avgFat, avgSnf };
    }, [tripData]);

    // Load route details to get BMC names/sequence
    useEffect(() => {
        const loadRoute = async () => {
            try {
                const routes = await getMilkTruckRoutes();
                const routeId = trip.routeId?._id || trip.routeId?.id || trip.routeId;
                const foundRoute = (Array.isArray(routes) ? routes : []).find((r: any) => (r._id || r.id) === routeId);
                if (foundRoute) {
                    setRouteBMCs(foundRoute.bmcSequence || []);
                }
            } catch (error) {
                console.error("Error loading route:", error);
            }
        };
        loadRoute();
    }, [trip]);

    // Refresh trip data logic
    const refreshTrip = useCallback(async () => {
        try {
            const updated = await getMilkTruckTrip(trip._id || trip.id);
            if (updated) {
                setTripData(updated);
            }
        } catch (error) {
            console.error('Error refreshing trip:', error);
        }
    }, [trip]);

    // Determine current BMC entry
    const currentEntry = tripData.bmcEntries?.find((e: any) => {
        const entryBMCId = e.bmcId?._id || e.bmcId?.id || e.bmcId;
        return entryBMCId && entryBMCId.toString() === selectedBMCId.toString();
    });

    const collectionData = currentEntry?.collectionData;
    const dairyVerifiedData = currentEntry?.dairyVerifiedData;

    // Auto-select first unverified BMC
    useEffect(() => {
        if (routeBMCs.length > 0 && !selectedBMCId) {
            const firstUnverified = routeBMCs.find((bmc: any) => {
                const entry = tripData.bmcEntries?.find((e: any) => {
                    const bmcId = e.bmcId?._id || e.bmcId?.id || e.bmcId;
                    return bmcId == (bmc._id || bmc.id);
                });
                return !entry?.dairyVerifiedData;
            });

            if (firstUnverified) {
                setSelectedBMCId(firstUnverified._id || firstUnverified.id);
            } else if (routeBMCs.length > 0) {
                // All verified, maybe select the first one to show completed state
                setSelectedBMCId(routeBMCs[0]._id || routeBMCs[0].id);
            }
        }
    }, [routeBMCs, tripData, selectedBMCId]);

    // Update form when selection changes
    useEffect(() => {
        if (dairyVerifiedData) {
            setFormData({
                receivedMilk: dairyVerifiedData.milkQuantity?.toString() || '',
                receivedFat: dairyVerifiedData.fatContent?.toString() || '',
                receivedSnf: dairyVerifiedData.snfContent?.toString() || '',
            });
        } else if (collectionData) {
            // Auto-fill with collection data for convenience? Or keep empty? 
            // User said "save the both value differentely", implying manual check.
            // Let's pre-fill for ease, but maybe keep empty to force check? 
            // Let's keep empty to force driver to look at the scale.
            setFormData({
                receivedMilk: '',
                receivedFat: '',
                receivedSnf: ''
            });
        }
    }, [selectedBMCId, dairyVerifiedData, collectionData]);

    // Calculate Variance Effect
    useEffect(() => {
        if (collectionData && formData.receivedMilk && formData.receivedFat && formData.receivedSnf) {
            const colMilk = parseFloat(collectionData.milkQuantity) || 0;
            const colFat = parseFloat(collectionData.fatContent) || 0;
            const colSnf = parseFloat(collectionData.snfContent) || 0;

            const recMilk = parseFloat(formData.receivedMilk) || 0;
            const recFat = parseFloat(formData.receivedFat) || 0;
            const recSnf = parseFloat(formData.receivedSnf) || 0;

            const colFatKg = (colMilk * colFat) / 100;
            const colSnfKg = (colMilk * colSnf) / 100;

            const recFatKg = (recMilk * recFat) / 100;
            const recSnfKg = (recMilk * recSnf) / 100;

            setVariances({
                milkDiff: Number((recMilk - colMilk).toFixed(2)),
                fatDiff: Number((recFat - colFat).toFixed(2)),
                snfDiff: Number((recSnf - colSnf).toFixed(2)),
                milkKgDiff: Number((recMilk - colMilk).toFixed(2)),
                fatKgDiff: Number((recFatKg - colFatKg).toFixed(4)),
                snfKgDiff: Number((recSnfKg - colSnfKg).toFixed(4)),
            });
        } else {
            setVariances({ milkDiff: 0, fatDiff: 0, snfDiff: 0, milkKgDiff: 0, fatKgDiff: 0, snfKgDiff: 0 });
        }
    }, [formData, collectionData]);


    const handleSaveBMC = async (showSuccessAlert = true) => {
        if (!selectedBMCId || !formData.receivedMilk) return;

        setLoading(true);
        try {
            // Construct new entry object
            // Construct new entry object matching Backend Schema (dairyVerifiedData)
            const dairyVerifiedData = {
                milkQuantity: parseFloat(formData.receivedMilk),
                fatContent: parseFloat(formData.receivedFat),
                snfContent: parseFloat(formData.receivedSnf),
                verifiedAt: new Date().toISOString()
            };

            // Map variances to 'differences' schema field
            const differences = {
                milkQuantity: variances.milkDiff,
                fatContent: variances.fatDiff,
                snfContent: variances.snfDiff,
                fatLiters: variances.fatKgDiff,
                snfLiters: variances.snfKgDiff
            };

            // We need to update the specific entry in the bmcEntries array
            const updatedEntries = tripData.bmcEntries.map((entry: any) => {
                const entryId = entry.bmcId?._id || entry.bmcId?.id || entry.bmcId;
                if (entryId == selectedBMCId) {
                    return {
                        ...entry,
                        dairyVerifiedData: dairyVerifiedData,
                        differences: differences
                    };
                }
                return entry;
            });

            const result = await updateMilkTruckTrip(trip._id || trip.id, {
                bmcEntries: updatedEntries
            });

            if (result) {
                setTripData(result); // Update local state
                if (showSuccessAlert) {
                    Alert.alert("Saved", "BMC Verification Saved");
                }

                // If we are not completing, clear selection
                setSelectedBMCId('');
                return result;
            }

        } catch (error) {
            console.error("Error saving verification:", error);
            Alert.alert("Error", "Failed to save data");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAndComplete = async () => {
        setLoading(true);
        try {
            // First save the current form data SILENTLY
            const savedTrip = await handleSaveBMC(false);

            // If save was successful (or valid), complete the trip using the NEW data
            if (savedTrip) {
                await handleCompleteTrip(savedTrip);
            }
        } catch (error) {
            console.error("Error in save and complete:", error);
        } finally {
            setLoading(false);
        }
    };



    const handleCompleteTrip = async (currentTrip: any = tripData) => {
        // Final completion
        setLoading(true);
        try {
            // Calculate grand totals from dairyVerifiedData
            let totalMilk = 0, totalFatKg = 0, totalSnfKg = 0;
            let colMilk = 0, colFatKg = 0, colSnfKg = 0;

            currentTrip.bmcEntries.forEach((e: any) => {
                // Verified Data
                if (e.dairyVerifiedData) {
                    const m = e.dairyVerifiedData.milkQuantity || 0;
                    const f = e.dairyVerifiedData.fatContent || 0;
                    const s = e.dairyVerifiedData.snfContent || 0;
                    totalMilk += m;
                    totalFatKg += (m * f) / 100;
                    totalSnfKg += (m * s) / 100;
                }
                // Collection Data for Dairy Confirmation Comparison
                if (e.collectionData) {
                    const cm = e.collectionData.milkQuantity || 0;
                    const cf = e.collectionData.fatContent || 0;
                    const cs = e.collectionData.snfContent || 0;
                    colMilk += cm;
                    colFatKg += (cm * cf) / 100;
                    colSnfKg += (cm * cs) / 100;
                }
            });

            const avgFat = totalMilk > 0 ? (totalFatKg / totalMilk) * 100 : 0;
            const avgSnf = totalMilk > 0 ? (totalSnfKg / totalMilk) * 100 : 0;

            const result = await updateMilkTruckTrip(trip._id || trip.id, {
                status: 'completed',
                endTime: new Date().toISOString(),
                bmcEntries: currentTrip.bmcEntries, // REQUIRED by backend validation
                // Add dairyConfirmation to satisfy backend validation
                dairyConfirmation: {
                    totalMilkQuantity: totalMilk,
                    averageFatContent: avgFat,
                    averageSnfContent: avgSnf,
                    confirmedAt: new Date().toISOString(),
                    collectionTotals: {
                        milk: colMilk,
                        fat: colFatKg,
                        snf: colSnfKg
                    },
                    variance: {
                        milk: totalMilk - colMilk,
                        fat: totalFatKg - colFatKg,
                        snf: totalSnfKg - colSnfKg
                    }
                },
                summary: {
                    totalMilk,
                    totalFatLiters: totalFatKg, // Mapping to backend schema
                    totalSnfLiters: totalSnfKg, // Mapping to backend schema
                    avgFat,
                    avgSnf,
                    completedAt: new Date().toISOString()
                }
            });

            if (result) {
                onConfirm(result);
            }
        } catch (error) {
            console.error("Error completing trip:", error);
        } finally {
            setLoading(false);
        }
    };

    // Check completion
    const allVerified = routeBMCs.length > 0 && routeBMCs.every((bmc: any) => {
        const entry = tripData.bmcEntries?.find((e: any) => {
            const id = e.bmcId?._id || e.bmcId?.id || e.bmcId;
            return id == (bmc._id || bmc.id);
        });
        return !!entry?.dairyVerifiedData;
    });

    const currentBMCName = routeBMCs.find((r: any) => (r._id || r.id) == selectedBMCId)?.name || 'BMC';

    return (
        <View style={styles.container}>
            {/* 1. Trip Summary Header (Always Visible) */}
            <Card variant="outlined" style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <View>
                        <Text style={styles.summaryLabel}>Total Collected</Text>
                        <Text style={styles.summaryValue}>
                            {collectionTotals.milk.toFixed(2)} L
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.summaryLabel}>Avg Fat</Text>
                        <Text style={styles.summaryValue}>
                            {collectionTotals.avgFat.toFixed(2)}%
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.summaryLabel}>Avg SNF</Text>
                        <Text style={styles.summaryValue}>
                            {collectionTotals.avgSnf.toFixed(2)}%
                        </Text>
                    </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                    <View>
                        <Text style={styles.summarySubLabel}>Verified (Dairy)</Text>
                        <Text style={styles.summarySubValue}>
                            {verifiedTotals.milk.toFixed(2)} L
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.summarySubLabel}>Variance</Text>
                        <Text style={[
                            styles.summarySubValue,
                            (verifiedTotals.milk - collectionTotals.milk) < 0 ? styles.neg : styles.pos
                        ]}>
                            {(verifiedTotals.milk - collectionTotals.milk) > 0 ? '+' : ''}
                            {(verifiedTotals.milk - collectionTotals.milk).toFixed(2)} L
                        </Text>
                    </View>
                </View>
            </Card>

            {/* 2. BMC List */}
            <View style={styles.listContainer}>
                <Text style={styles.label}>Select BMC to Verify</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {routeBMCs.map((bmc: any) => {
                        const id = bmc._id || bmc.id;
                        const entry = tripData.bmcEntries?.find((e: any) => {
                            const eid = e.bmcId?._id || e.bmcId?.id || e.bmcId;
                            return eid == id;
                        });
                        const isVerified = !!entry?.dairyVerifiedData;
                        const isSelected = selectedBMCId === id;

                        return (
                            <TouchableOpacity
                                key={id}
                                style={[
                                    styles.chip,
                                    isSelected && styles.chipSelected,
                                    isVerified && styles.chipVerified
                                ]}
                                onPress={() => setSelectedBMCId(id)}
                                disabled={isVerified}
                            >
                                <Text style={[
                                    styles.chipText,
                                    isSelected && styles.chipTextSelected,
                                    isVerified && styles.chipTextVerified
                                ]}>{bmc.name} {isVerified ? '✓' : ''}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {selectedBMCId && (
                <Card variant="elevated" style={styles.workCard}>
                    <Text style={styles.cardTitle}>Verify: {currentBMCName}</Text>

                    {/* Comparison Table */}
                    <View style={styles.tableContainer}>
                        <View style={styles.row}>
                            <View style={styles.colLabel}><Text style={styles.headerText}></Text></View>
                            <View style={styles.colData}><Text style={styles.headerText}>Collected</Text></View>
                            <View style={styles.colInput}><Text style={styles.headerText}>Received (Dairy)</Text></View>
                        </View>

                        {/* Milk Row */}
                        <View style={styles.row}>
                            <View style={styles.colLabel}><Text style={styles.labelText}>Milk (L)</Text></View>
                            <View style={styles.colData}><Text style={styles.dataText}>{collectionData?.milkQuantity || '-'}</Text></View>
                            <View style={styles.colInput}>
                                <Input
                                    value={formData.receivedMilk}
                                    onChangeText={(t) => setFormData({ ...formData, receivedMilk: t })}
                                    placeholder="0.0"
                                    keyboardType="numeric"
                                    containerStyle={styles.compactInput}
                                />
                            </View>
                        </View>

                        {/* Fat Row */}
                        <View style={styles.row}>
                            <View style={styles.colLabel}><Text style={styles.labelText}>Fat (%)</Text></View>
                            <View style={styles.colData}><Text style={styles.dataText}>{collectionData?.fatContent || '-'}</Text></View>
                            <View style={styles.colInput}>
                                <Input
                                    value={formData.receivedFat}
                                    onChangeText={(t) => setFormData({ ...formData, receivedFat: t })}
                                    placeholder="0.0"
                                    keyboardType="numeric"
                                    containerStyle={styles.compactInput}
                                />
                            </View>
                        </View>

                        {/* SNF Row */}
                        <View style={styles.row}>
                            <View style={styles.colLabel}><Text style={styles.labelText}>SNF (%)</Text></View>
                            <View style={styles.colData}><Text style={styles.dataText}>{collectionData?.snfContent || '-'}</Text></View>
                            <View style={styles.colInput}>
                                <Input
                                    value={formData.receivedSnf}
                                    onChangeText={(t) => setFormData({ ...formData, receivedSnf: t })}
                                    placeholder="0.0"
                                    keyboardType="numeric"
                                    containerStyle={styles.compactInput}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Variance Display */}
                    <View style={styles.varianceBox}>
                        <Text style={styles.varianceTitle}>Variance Analysis</Text>
                        <View style={styles.varianceRow}>
                            <Text style={styles.vLabel}>Milk Diff:</Text>
                            <Text style={[styles.vValue, variances.milkDiff < 0 ? styles.neg : styles.pos]}>
                                {variances.milkDiff > 0 ? '+' : ''}{variances.milkDiff} L
                            </Text>
                        </View>
                        <View style={styles.varianceRow}>
                            <Text style={styles.vLabel}>Fat Diff (Kg):</Text>
                            <Text style={[styles.vValue, variances.fatKgDiff < 0 ? styles.neg : styles.pos]}>
                                {variances.fatKgDiff > 0 ? '+' : ''}{variances.fatKgDiff} kg
                            </Text>
                        </View>
                        <View style={styles.varianceRow}>
                            <Text style={styles.vLabel}>SNF Diff (Kg):</Text>
                            <Text style={[styles.vValue, variances.snfKgDiff < 0 ? styles.neg : styles.pos]}>
                                {variances.snfKgDiff > 0 ? '+' : ''}{variances.snfKgDiff} kg
                            </Text>
                        </View>
                    </View>

                    {allVerified ? (
                        <Button
                            onPress={handleSaveAndComplete}
                            loading={loading}
                            variant="success"
                            style={styles.saveBtn}
                        >
                            Confirm & Complete Trip
                        </Button>
                    ) : (
                        <Button
                            onPress={() => handleSaveBMC(true)}
                            loading={loading}
                            variant="primary"
                            style={styles.saveBtn}
                        >
                            Save Verification
                        </Button>
                    )}
                </Card>
            )}

            {/* Only show the summary card if no specific BMC is selected (for review) */}
            {allVerified && !selectedBMCId && (
                <Card variant="elevated" style={styles.completeCard}>
                    <Text style={styles.completeTitle}>Trip Verification Complete</Text>

                    <View style={styles.finalSummaryTable}>
                        <View style={[styles.row, styles.tableHeader]}>
                            <Text style={[styles.headerText, { flex: 1 }]}>Metric</Text>
                            <Text style={[styles.headerText, { flex: 1, textAlign: 'right' }]}>Collected</Text>
                            <Text style={[styles.headerText, { flex: 1, textAlign: 'right' }]}>Dairy</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={[styles.labelText, { flex: 1 }]}>Milk (L)</Text>
                            <Text style={[styles.dataText, { flex: 1, textAlign: 'right' }]}>{collectionTotals.milk.toFixed(2)}</Text>
                            <Text style={[styles.dataText, { flex: 1, textAlign: 'right' }]}>{verifiedTotals.milk.toFixed(2)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={[styles.labelText, { flex: 1 }]}>Avg Fat %</Text>
                            <Text style={[styles.dataText, { flex: 1, textAlign: 'right' }]}>{collectionTotals.avgFat.toFixed(2)}</Text>
                            <Text style={[styles.dataText, { flex: 1, textAlign: 'right' }]}>{verifiedTotals.avgFat.toFixed(2)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={[styles.labelText, { flex: 1 }]}>Avg SNF %</Text>
                            <Text style={[styles.dataText, { flex: 1, textAlign: 'right' }]}>{collectionTotals.avgSnf.toFixed(2)}</Text>
                            <Text style={[styles.dataText, { flex: 1, textAlign: 'right' }]}>{verifiedTotals.avgSnf.toFixed(2)}</Text>
                        </View>
                    </View>

                    <View style={styles.varianceBox}>
                        <Text style={styles.varianceTitle}>Final Variance</Text>
                        <View style={styles.varianceRow}>
                            <Text style={styles.vLabel}>Total Milk Diff:</Text>
                            <Text style={[styles.vValue, (verifiedTotals.milk - collectionTotals.milk) < 0 ? styles.neg : styles.pos]}>
                                {(verifiedTotals.milk - collectionTotals.milk) > 0 ? '+' : ''}
                                {(verifiedTotals.milk - collectionTotals.milk).toFixed(2)} L
                            </Text>
                        </View>
                        <View style={styles.varianceRow}>
                            <Text style={styles.vLabel}>Total Fat Diff:</Text>
                            <Text style={[styles.vValue, (verifiedTotals.fatKg - collectionTotals.fatKg) < 0 ? styles.neg : styles.pos]}>
                                {(verifiedTotals.fatKg - collectionTotals.fatKg) > 0 ? '+' : ''}
                                {(verifiedTotals.fatKg - collectionTotals.fatKg).toFixed(2)} kg
                            </Text>
                        </View>
                        <View style={styles.varianceRow}>
                            <Text style={styles.vLabel}>Total SNF Diff:</Text>
                            <Text style={[styles.vValue, (verifiedTotals.snfKg - collectionTotals.snfKg) < 0 ? styles.neg : styles.pos]}>
                                {(verifiedTotals.snfKg - collectionTotals.snfKg) > 0 ? '+' : ''}
                                {(verifiedTotals.snfKg - collectionTotals.snfKg).toFixed(2)} kg
                            </Text>
                        </View>
                    </View>


                    <Button
                        onPress={handleCompleteTrip}
                        variant="success"
                        loading={loading}
                        style={styles.completeBtn}
                    >
                        Confirm & Complete Trip
                    </Button>
                </Card>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: spacing.md,
    },
    listContainer: {
        marginBottom: spacing.xs,
    },
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    scrollContent: {
        gap: spacing.sm,
        paddingHorizontal: spacing.xs,
    },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border.light,
        backgroundColor: colors.background.primary,
    },
    chipSelected: {
        borderColor: colors.primary[600],
        backgroundColor: colors.primary[50],
    },
    chipVerified: {
        borderColor: colors.success[500],
        backgroundColor: colors.success[50],
    },
    chipText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
    },
    chipTextSelected: {
        color: colors.primary[700],
        fontWeight: typography.fontWeight.bold,
    },
    chipTextVerified: {
        color: colors.success[700],
    },
    workCard: {
        padding: spacing.md,
    },
    cardTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        marginBottom: spacing.md,
    },
    tableContainer: {
        marginBottom: spacing.md,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    colLabel: { flex: 1.5 },
    colData: { flex: 1.5, alignItems: 'center' },
    colInput: { flex: 2 },
    headerText: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.secondary,
    },
    labelText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
    },
    dataText: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
    },
    compactInput: {
        marginBottom: 0,
    },
    varianceBox: {
        backgroundColor: colors.background.tertiary,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
    },
    varianceTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold,
        marginBottom: spacing.xs,
    },
    varianceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    vLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    },
    vValue: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold,
    },
    pos: { color: colors.success[600] },
    neg: { color: colors.error[600] },
    saveBtn: {
        marginTop: spacing.sm,
    },
    completeCard: {
        padding: spacing.lg,
        alignItems: 'center',
        backgroundColor: colors.success[50],
        borderWidth: 1,
        borderColor: colors.success[200],
    },
    completeTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        color: colors.success[700],
        marginBottom: spacing.xs,
    },
    completeSub: {
        fontSize: typography.fontSize.sm,
        color: colors.success[600],
        marginBottom: spacing.lg,
    },
    completeBtn: {
        minWidth: 200,
        marginTop: spacing.md,
    },
    summaryCard: {
        padding: spacing.md,
        backgroundColor: colors.background.secondary,
        marginBottom: spacing.xs,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        marginBottom: 2,
    },
    summaryValue: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
    },
    summarySubLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        // textAlign: 'right',
    },
    summarySubValue: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.primary[700],
    },
    divider: {
        height: 1,
        backgroundColor: colors.border.light,
        marginVertical: spacing.sm,
    },
    finalSummaryTable: {
        width: '100%',
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.light,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        backgroundColor: colors.background.primary,
    },
    tableHeader: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        paddingBottom: spacing.xs,
        marginBottom: spacing.xs,
    },
});

export default DairyConfirmation;
