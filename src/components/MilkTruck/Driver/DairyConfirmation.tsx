import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Input from '../../common/Input';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
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

    // Form state
    const [formData, setFormData] = useState({
        receivedMilk: '',
        receivedFat: '',
        receivedSnf: '',
        startingKm: '',
        endingKm: '',
    });

    const [variances, setVariances] = useState({
        milkDiff: 0,
        fatDiff: 0,
        snfDiff: 0,
        fatKgDiff: 0,
        snfKgDiff: 0
    });

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

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

    useEffect(() => {
        const loadRoute = async () => {
            try {
                const routes = await getMilkTruckRoutes();
                const routeId = trip.routeId?._id || trip.routeId?.id || trip.routeId;
                const foundRoute = (Array.isArray(routes) ? routes : []).find((r: any) => (r._id || r.id) === routeId);
                if (foundRoute) setRouteBMCs(foundRoute.bmcSequence || []);
            } catch (error) {
                console.error("Error loading route:", error);
            }
        };
        loadRoute();
    }, [trip]);

    const currentEntry = tripData.bmcEntries?.find((e: any) => {
        const entryBMCId = e.bmcId?._id || e.bmcId?.id || e.bmcId;
        return entryBMCId && entryBMCId.toString() === selectedBMCId.toString();
    });

    const collectionData = currentEntry?.collectionData;
    const dairyVerifiedData = currentEntry?.dairyVerifiedData;

    useEffect(() => {
        if (routeBMCs.length > 0 && !selectedBMCId) {
            const firstUnverified = routeBMCs.find((bmc: any) => {
                const entry = tripData.bmcEntries?.find((e: any) => {
                    const bmcId = e.bmcId?._id || e.bmcId?.id || e.bmcId;
                    return bmcId == (bmc._id || bmc.id);
                });
                return !entry?.dairyVerifiedData;
            });
            if (firstUnverified) setSelectedBMCId(firstUnverified._id || firstUnverified.id);
            else setSelectedBMCId(routeBMCs[0]._id || routeBMCs[0].id);
        }
    }, [routeBMCs, tripData, selectedBMCId]);

    useEffect(() => {
        if (dairyVerifiedData) {
            setFormData(prev => ({
                ...prev,
                receivedMilk: dairyVerifiedData.milkQuantity?.toString() || '',
                receivedFat: dairyVerifiedData.fatContent?.toString() || '',
                receivedSnf: dairyVerifiedData.snfContent?.toString() || '',
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                receivedMilk: '',
                receivedFat: '',
                receivedSnf: ''
            }));
        }
    }, [selectedBMCId, dairyVerifiedData]);

    useEffect(() => {
        if (collectionData && formData.receivedMilk && formData.receivedFat && formData.receivedSnf) {
            const colMilk = parseFloat(collectionData.milkQuantity) || 0;
            const recMilk = parseFloat(formData.receivedMilk) || 0;
            const recFat = parseFloat(formData.receivedFat) || 0;
            const recSnf = parseFloat(formData.receivedSnf) || 0;

            const colFatKg = (colMilk * (parseFloat(collectionData.fatContent) || 0)) / 100;
            const colSnfKg = (colMilk * (parseFloat(collectionData.snfContent) || 0)) / 100;
            const recFatKg = (recMilk * recFat) / 100;
            const recSnfKg = (recMilk * recSnf) / 100;

            setVariances({
                milkDiff: Number((recMilk - colMilk).toFixed(2)),
                fatDiff: Number((recFat - (parseFloat(collectionData.fatContent) || 0)).toFixed(2)),
                snfDiff: Number((recSnf - (parseFloat(collectionData.snfContent) || 0)).toFixed(2)),
                fatKgDiff: Number((recFatKg - colFatKg).toFixed(4)),
                snfKgDiff: Number((recSnfKg - colSnfKg).toFixed(4)),
            });
        }
    }, [formData, collectionData]);

    const handleSaveBMC = async (showSuccessAlert = true) => {
        if (!selectedBMCId || !formData.receivedMilk) return;
        setLoading(true);
        try {
            const dairyData = {
                milkQuantity: parseFloat(formData.receivedMilk),
                fatContent: parseFloat(formData.receivedFat),
                snfContent: parseFloat(formData.receivedSnf),
                verifiedAt: new Date().toISOString()
            };
            const updatedEntries = tripData.bmcEntries.map((entry: any) => {
                const entryId = entry.bmcId?._id || entry.bmcId?.id || entry.bmcId;
                if (entryId == selectedBMCId) return { ...entry, dairyVerifiedData: dairyData };
                return entry;
            });
            const result = await updateMilkTruckTrip(trip._id || trip.id, { bmcEntries: updatedEntries });
            if (result) {
                setTripData(result);

                // Check if this was the last one to verify
                const stillUnverified = routeBMCs.some((bmc: any) => {
                    const id = bmc._id || bmc.id;
                    const entry = result.bmcEntries?.find((e: any) => (e.bmcId?._id || e.bmcId?.id || e.bmcId) == id);
                    return !entry?.dairyVerifiedData;
                });

                if (!stillUnverified) {
                    // All done! Record success and move to completion
                    await handleCompleteTrip(result);
                } else {
                    if (showSuccessAlert) Alert.alert("Saved", "Verification recorded.");
                    setSelectedBMCId('');
                }
                return result;
            }
        } catch (error) {
            Alert.alert("Error", "Failed to save data.");
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteTrip = async (currentTrip: any = tripData) => {
        setLoading(true);
        try {
            let totalMilk = 0, totalFatKg = 0, totalSnfKg = 0;
            let colMilk = 0, colFatKg = 0, colSnfKg = 0;
            currentTrip.bmcEntries.forEach((e: any) => {
                if (e.dairyVerifiedData) {
                    const m = e.dairyVerifiedData.milkQuantity || 0;
                    totalMilk += m;
                    totalFatKg += (m * (e.dairyVerifiedData.fatContent || 0)) / 100;
                    totalSnfKg += (m * (e.dairyVerifiedData.snfContent || 0)) / 100;
                }
                if (e.collectionData) {
                    const cm = e.collectionData.milkQuantity || 0;
                    colMilk += cm;
                    colFatKg += (cm * (e.collectionData.fatContent || 0)) / 100;
                    colSnfKg += (cm * (e.collectionData.snfContent || 0)) / 100;
                }
            });
            const avgFat = totalMilk > 0 ? (totalFatKg / totalMilk) * 100 : 0;
            const avgSnf = totalMilk > 0 ? (totalSnfKg / totalMilk) * 100 : 0;
            const result = await updateMilkTruckTrip(trip._id || trip.id, {
                status: 'completed',
                endTime: new Date().toISOString(),
                bmcEntries: currentTrip.bmcEntries,
                dairyConfirmation: {
                    totalMilkQuantity: totalMilk,
                    averageFatContent: avgFat,
                    averageSnfContent: avgSnf,
                    confirmedAt: new Date().toISOString(),
                    collectionTotals: { milk: colMilk, fat: colFatKg, snf: colSnfKg },
                    variance: { milk: totalMilk - colMilk, fat: totalFatKg - colFatKg, snf: totalSnfKg - colSnfKg }
                },
                summary: {
                    totalMilk,
                    totalFatLiters: totalFatKg,
                    totalSnfLiters: totalSnfKg,
                    avgFat,
                    avgSnf,
                    startingKm: parseFloat(formData.startingKm) || 0,
                    endingKm: parseFloat(formData.endingKm) || 0,
                    completedAt: new Date().toISOString()
                }
            });
            if (result) onConfirm(result);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const allVerified = routeBMCs.length > 0 && routeBMCs.every((bmc: any) => {
        const entry = tripData.bmcEntries?.find((e: any) => {
            const id = e.bmcId?._id || e.bmcId?.id || e.bmcId;
            return id == (bmc._id || bmc.id);
        });
        return !!entry?.dairyVerifiedData;
    });

    const currentBMCName = routeBMCs.find((r: any) => (r._id || r.id) == selectedBMCId)?.name || 'BMC';

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            {/* Summary Banner */}
            <Card variant="elevated" style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                    <View style={styles.indicator} />
                    <Text style={styles.summaryLabel}>TRIP RECONCILIATION</Text>
                </View>
                <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.sVal}>{collectionTotals.milk.toFixed(1)}L</Text>
                        <Text style={styles.sLabel}>FROM BMCs</Text>
                    </View>
                    <View style={styles.sDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={[styles.sVal, { color: colors.primary[700] }]}>{verifiedTotals.milk.toFixed(1)}L</Text>
                        <Text style={styles.sLabel}>TO DAIRY</Text>
                    </View>
                    <View style={styles.sDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={[styles.sVal, (verifiedTotals.milk - collectionTotals.milk) < 0 ? styles.neg : styles.pos]}>
                            {(verifiedTotals.milk - collectionTotals.milk).toFixed(1)}L
                        </Text>
                        <Text style={styles.sLabel}>VARIANCE</Text>
                    </View>
                </View>
            </Card>

            {/* Chip Selection */}
            <View style={styles.chipSection}>
                <Text style={styles.sectionTitle}>SELECT POINT TO VERIFY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
                    {routeBMCs.map((bmc: any) => {
                        const id = bmc._id || bmc.id;
                        const entry = tripData.bmcEntries?.find((e: any) => (e.bmcId?._id || e.bmcId?.id || e.bmcId) == id);
                        const isVerified = !!entry?.dairyVerifiedData;
                        const isSelected = selectedBMCId === id;
                        return (
                            <TouchableOpacity
                                key={id}
                                activeOpacity={0.8}
                                style={[styles.chip, isSelected && styles.chipSelected, isVerified && styles.chipVerified]}
                                onPress={() => setSelectedBMCId(id)}
                                disabled={isVerified}
                            >
                                <Text style={[styles.chipText, isSelected && styles.chipTextSelected, isVerified && styles.chipTextVerified]}>
                                    {bmc.name} {isVerified ? '✓' : ''}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Verification Form */}
            {selectedBMCId && (
                <Card variant="elevated" style={styles.formCard}>
                    <Text style={styles.formSubject}>VERIFYING: {currentBMCName}</Text>

                    <View style={styles.formGrid}>
                        <View style={styles.formRow}>
                            <View style={styles.colLabel}><Text style={styles.labelT}>QTY (L)</Text></View>
                            <View style={styles.colCol}><Text style={styles.dataT}>{collectionData?.milkQuantity || '0'}</Text></View>
                            <View style={styles.colRec}>
                                <Input
                                    value={formData.receivedMilk}
                                    onChangeText={(t) => setFormData({ ...formData, receivedMilk: t })}
                                    placeholder="0.0"
                                    keyboardType="numeric"
                                    containerStyle={styles.compact}
                                />
                            </View>
                        </View>
                        <View style={styles.formRow}>
                            <View style={styles.colLabel}><Text style={styles.labelT}>FAT (%)</Text></View>
                            <View style={styles.colCol}><Text style={styles.dataT}>{collectionData?.fatContent || '0'}</Text></View>
                            <View style={styles.colRec}>
                                <Input
                                    value={formData.receivedFat}
                                    onChangeText={(t) => setFormData({ ...formData, receivedFat: t })}
                                    placeholder="0.0"
                                    keyboardType="numeric"
                                    containerStyle={styles.compact}
                                />
                            </View>
                        </View>
                        <View style={styles.formRow}>
                            <View style={styles.colLabel}><Text style={styles.labelT}>SNF (%)</Text></View>
                            <View style={styles.colCol}><Text style={styles.dataT}>{collectionData?.snfContent || '0'}</Text></View>
                            <View style={styles.colRec}>
                                <Input
                                    value={formData.receivedSnf}
                                    onChangeText={(t) => setFormData({ ...formData, receivedSnf: t })}
                                    placeholder="0.0"
                                    keyboardType="numeric"
                                    containerStyle={styles.compact}
                                />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.saveAction}
                        onPress={() => handleSaveBMC(true)}
                        disabled={loading}
                    >
                        <LinearGradient colors={[colors.primary[500], colors.primary[700]]} style={styles.btnFill}>
                            <Text style={styles.btnT}>RECORD DAIRY RECEIPT</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Card>
            )}

            {/* KM Tracking */}
            {allVerified && !selectedBMCId && (
                <Card variant="elevated" style={styles.formCard}>
                    <Text style={styles.formSubject}>ODOMETER READINGS (KM)</Text>
                    <View style={styles.formGrid}>
                        <View style={styles.formRow}>
                            <View style={styles.colLabel}><Text style={styles.labelT}>STARTING KM</Text></View>
                            <View style={styles.colRec}>
                                <Input
                                    value={formData.startingKm}
                                    onChangeText={(t) => setFormData({ ...formData, startingKm: t })}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    containerStyle={styles.compact}
                                />
                            </View>
                        </View>
                        <View style={styles.formRow}>
                            <View style={styles.colLabel}><Text style={styles.labelT}>ENDING KM</Text></View>
                            <View style={styles.colRec}>
                                <Input
                                    value={formData.endingKm}
                                    onChangeText={(t) => setFormData({ ...formData, endingKm: t })}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    containerStyle={styles.compact}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.finalBox}>
                        <Text style={styles.finalTitle}>Ready for Submission</Text>
                        <Text style={styles.finalSub}>Total Distance: {((parseFloat(formData.endingKm) || 0) - (parseFloat(formData.startingKm) || 0)).toFixed(1)} km</Text>
                        <TouchableOpacity
                            style={styles.completeAction}
                            onPress={() => handleCompleteTrip()}
                            disabled={loading || !formData.startingKm || !formData.endingKm}
                        >
                            <LinearGradient colors={[colors.success[500], colors.success[700]]} style={styles.btnFill}>
                                <Text style={styles.btnT}>COMPLETE & SUBMIT TRIP</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </Card>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.sm,
    },
    summaryCard: {
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    indicator: {
        width: 4,
        height: 14,
        backgroundColor: colors.primary[600],
        borderRadius: 2,
        marginRight: 8,
    },
    summaryLabel: {
        fontSize: 10,
        fontWeight: 'black',
        color: colors.text.tertiary,
        letterSpacing: 1.5,
    },
    summaryGrid: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    sVal: {
        fontSize: 16,
        fontWeight: 'black',
        color: colors.text.primary,
    },
    sLabel: {
        fontSize: 8,
        fontWeight: 'bold',
        color: colors.text.tertiary,
        marginTop: 2,
    },
    sDivider: {
        width: 1,
        height: 30,
        backgroundColor: colors.border.light,
    },
    chipSection: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'black',
        color: colors.text.tertiary,
        letterSpacing: 1,
        marginBottom: spacing.md,
        marginLeft: spacing.xs,
    },
    chipList: {
        gap: spacing.sm,
        paddingHorizontal: spacing.xs,
    },
    chip: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border.light,
        ...shadows.sm,
    },
    chipSelected: {
        borderColor: colors.primary[500],
        backgroundColor: colors.primary[50],
    },
    chipVerified: {
        borderColor: colors.success[400],
        backgroundColor: colors.success[50],
    },
    chipText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: colors.text.secondary,
    },
    chipTextSelected: {
        color: colors.primary[700],
    },
    chipTextVerified: {
        color: colors.success[700],
    },
    formCard: {
        padding: spacing.lg,
    },
    formSubject: {
        fontSize: 12,
        fontWeight: 'black',
        color: colors.text.primary,
        marginBottom: spacing.xl,
        textAlign: 'center',
    },
    formGrid: {
        marginBottom: spacing.xl,
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)',
    },
    colLabel: { flex: 1 },
    colCol: { flex: 1, alignItems: 'center' },
    colRec: { flex: 1.5 },
    labelT: { fontSize: 11, fontWeight: 'bold', color: colors.text.tertiary },
    dataT: { fontSize: 13, fontWeight: 'black', color: colors.text.secondary },
    compact: { marginBottom: 0 },
    saveAction: {
        height: 52,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        ...shadows.md,
    },
    completeAction: {
        height: 56,
        width: '100%',
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        marginTop: spacing.lg,
        ...shadows.lg,
    },
    btnFill: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnT: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: 'black',
        letterSpacing: 1.5,
    },
    finalBox: {
        padding: spacing.xl,
        backgroundColor: colors.success[50],
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.success[100],
    },
    finalTitle: {
        fontSize: 20,
        fontWeight: 'black',
        color: colors.success[800],
    },
    finalSub: {
        fontSize: 12,
        color: colors.success[600],
        textAlign: 'center',
        marginTop: 4,
    },
    pos: { color: colors.success[600] },
    neg: { color: colors.error[600] },
});

export default DairyConfirmation;
