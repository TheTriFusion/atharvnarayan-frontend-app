import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getMilkTruckTrips, getMilkTruckBMCs, getMilkTruckVehicles, getMilkTruckRoutes, getMilkTruckPricing } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Input from '../../../components/common/Input';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

const OwnerTripDetails: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const tripId = route.params?.tripId;

    const [trip, setTrip] = useState<any>(null);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [routes, setRoutes] = useState<any[]>([]);
    const [bmcs, setBMCs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Pricing State
    const [pricing, setPricing] = useState<any>({ basePricePerLiter: 50, fatPricePerPercent: 2, snfPricePerPercent: 1 });
    const [basePricePerLiter, setBasePricePerLiter] = useState('50');
    const [fatPricePerPercent, setFatPricePerPercent] = useState('2');
    const [snfPricePerPercent, setSnfPricePerPercent] = useState('1');

    useEffect(() => {
        if (tripId) {
            loadData();
        } else {
            navigation.goBack();
        }
    }, [tripId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [allTrips, vehiclesData, routesData, bmcsData, pricingData] = await Promise.all([
                getMilkTruckTrips(),
                getMilkTruckVehicles(),
                getMilkTruckRoutes(),
                getMilkTruckBMCs(),
                getMilkTruckPricing(),
            ]);

            const tripsArray = Array.isArray(allTrips) ? allTrips : [];
            const foundTrip = tripsArray.find(t => (t._id || t.id) === tripId);

            if (!foundTrip) {
                navigation.goBack();
                return;
            }

            setTrip(foundTrip);
            setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
            setRoutes(Array.isArray(routesData) ? routesData : []);
            setBMCs(Array.isArray(bmcsData) ? bmcsData : []);

            if (pricingData) {
                setPricing(pricingData);
                setBasePricePerLiter(pricingData.basePricePerLiter?.toString() || '50');
                setFatPricePerPercent(pricingData.fatPricePerPercent?.toString() || '2');
                setSnfPricePerPercent(pricingData.snfPricePerPercent?.toString() || '1');
            }
        } catch (error) {
            console.error('Error loading trip details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !trip) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading details...</Text>
            </View>
        );
    }

    const vehicle = vehicles.find((v: any) => (v._id || v.id) === (trip.vehicleId?._id || trip.vehicleId?.id || trip.vehicleId));
    const tripRoute = routes.find((r: any) => (r._id || r.id) === (trip.routeId?._id || trip.routeId?.id || trip.routeId));
    const bmcEntries = trip.bmcEntries || [];

    // Calculate dairy-verified (At Dairy) totals
    const dairyTotals = trip.bmcEntries?.reduce((acc: any, entry: any) => {
        const data = entry.dairyVerifiedData || entry.collectionData;
        if (!data) return acc;

        const milk = parseFloat(data.milkQuantity) || 0;
        const fat = parseFloat(data.fatContent) || 0;
        const snf = parseFloat(data.snfContent) || 0;

        acc.milk += milk;
        acc.fatKg += (milk * fat) / 100;
        acc.snfKg += (milk * snf) / 100;

        return acc;
    }, { milk: 0, fatKg: 0, snfKg: 0 }) || { milk: 0, fatKg: 0, snfKg: 0 };

    const dairyAvgFat = dairyTotals.milk > 0 ? (dairyTotals.fatKg / dairyTotals.milk) * 100 : 0;
    const dairyAvgSnf = dairyTotals.milk > 0 ? (dairyTotals.snfKg / dairyTotals.milk) * 100 : 0;

    // Calculate price
    const calculatePrice = () => {
        const basePrice = parseFloat(basePricePerLiter) || 0;
        const fatPrice = parseFloat(fatPricePerPercent) || 0;
        const snfPrice = parseFloat(snfPricePerPercent) || 0;

        const totalMilkPrice = basePrice * dairyTotals.milk;
        const totalFatPrice = fatPrice * dairyAvgFat;
        const totalSnfPrice = snfPrice * dairyAvgSnf;

        return totalMilkPrice + totalFatPrice + totalSnfPrice;
    };

    const totalPrice = calculatePrice();
    const displayTripId = (trip._id || trip.id).toString().substring((trip._id || trip.id).toString().length - 6);

    return (
        <ScrollView style={styles.container}>
            <ScreenHeader
                title="Trip Payment Details"
                subtitle={`ID: #${displayTripId}`}
                showBackButton
            />

            <View style={styles.content}>
                {/* Basic Info Card */}
                <Card variant="elevated" style={styles.sectionCard}>
                    <Text style={styles.cardTitle}>Trip Information</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Date</Text>
                            <Text style={styles.infoValue}>
                                {trip.endTime || trip.startTime ? new Date(trip.endTime || trip.startTime).toLocaleDateString() : 'N/A'}
                            </Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Time</Text>
                            <Text style={styles.infoValue}>
                                {trip.endTime || trip.startTime ? new Date(trip.endTime || trip.startTime).toLocaleTimeString() : 'N/A'}
                            </Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Route</Text>
                            <Text style={styles.infoValue}>{tripRoute?.name || 'Unknown'}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Vehicle</Text>
                            <Text style={styles.infoValue}>{vehicle?.registrationNumber || 'Unknown'}</Text>
                        </View>
                    </View>
                </Card>

                {/* Trip Summary */}
                <Card variant="elevated" style={StyleSheet.flatten([styles.summaryCard, { backgroundColor: colors.success[50] }])}>
                    <Text style={StyleSheet.flatten([styles.cardTitle, { color: colors.success[800] }])}>Verified Summary (At Dairy)</Text>
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Total Milk</Text>
                            <Text style={styles.summaryValue}>{dairyTotals.milk.toFixed(2)} L</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Avg Fat</Text>
                            <Text style={styles.summaryValue}>{dairyAvgFat.toFixed(2)}%</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Avg SNF</Text>
                            <Text style={styles.summaryValue}>{dairyAvgSnf.toFixed(2)}%</Text>
                        </View>
                    </View>
                </Card>

                {/* BMC-wise Comparison Table */}
                {bmcEntries.length > 0 && (
                    <Card variant="elevated" style={styles.sectionCard}>
                        <View style={styles.comparisonHeader}>
                            <Text style={styles.cardTitle}>📊 BMC-wise Comparison</Text>
                            <Text style={styles.comparisonSubtitle}>Collection vs Dairy Verification</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                            <View>
                                {/* Table Header */}
                                <View style={styles.tableHeaderRow}>
                                    <Text style={[styles.tableHeaderCell, { width: 100 }]}>BMC Name</Text>
                                    <Text style={[styles.tableHeaderCell, styles.greenHeader, { width: 70 }]}>Coll (L)</Text>
                                    <Text style={[styles.tableHeaderCell, styles.greenHeader, { width: 60 }]}>Fat %</Text>
                                    <Text style={[styles.tableHeaderCell, styles.greenHeader, { width: 60 }]}>SNF %</Text>
                                    <Text style={[styles.tableHeaderCell, styles.purpleHeader, { width: 70 }]}>Dairy (L)</Text>
                                    <Text style={[styles.tableHeaderCell, styles.purpleHeader, { width: 60 }]}>Fat %</Text>
                                    <Text style={[styles.tableHeaderCell, styles.purpleHeader, { width: 60 }]}>SNF %</Text>
                                    <Text style={[styles.tableHeaderCell, { width: 70 }]}>Diff (L)</Text>
                                    <Text style={[styles.tableHeaderCell, { width: 70 }]}>Fat (Kg)</Text>
                                    <Text style={[styles.tableHeaderCell, { width: 70 }]}>SNF (Kg)</Text>
                                </View>

                                {/* Table Rows */}
                                {bmcEntries.map((entry: any, index: number) => {
                                    const entryBmcId = entry.bmcId?._id || entry.bmcId?.id || entry.bmcId;
                                    const bmcName = entry.bmcId?.name || bmcs.find((b: any) => (b._id || b.id) === entryBmcId)?.name || 'Unknown BMC';

                                    const atBMC = entry.collectionData;
                                    const atDairy = entry.dairyVerifiedData || entry.collectionData;

                                    if (!atBMC) return null;

                                    const milkVar = atDairy ? (parseFloat(atDairy.milkQuantity) - parseFloat(atBMC.milkQuantity)) : 0;

                                    const atBMCFatKg = (parseFloat(atBMC.milkQuantity) * parseFloat(atBMC.fatContent)) / 100;
                                    const atBMCSnfKg = (parseFloat(atBMC.milkQuantity) * parseFloat(atBMC.snfContent)) / 100;
                                    const atDairyFatKg = atDairy ? (parseFloat(atDairy.milkQuantity) * parseFloat(atDairy.fatContent)) / 100 : 0;
                                    const atDairySnfKg = atDairy ? (parseFloat(atDairy.milkQuantity) * parseFloat(atDairy.snfContent)) / 100 : 0;
                                    const fatKgVar = atDairyFatKg - atBMCFatKg;
                                    const snfKgVar = atDairySnfKg - atBMCSnfKg;

                                    return (
                                        <View key={index} style={styles.paymentTableRow}>
                                            <Text style={[styles.paymentTableCell, styles.paymentBoldText, { width: 100 }]}>{bmcName}</Text>
                                            {/* Collection */}
                                            <Text style={[styles.paymentTableCell, styles.greenCell, { width: 70 }]}>{parseFloat(atBMC.milkQuantity).toFixed(2)}</Text>
                                            <Text style={[styles.paymentTableCell, styles.greenCell, { width: 60 }]}>{parseFloat(atBMC.fatContent).toFixed(2)}</Text>
                                            <Text style={[styles.paymentTableCell, styles.greenCell, { width: 60 }]}>{parseFloat(atBMC.snfContent).toFixed(2)}</Text>
                                            {/* Dairy */}
                                            <Text style={[styles.paymentTableCell, styles.purpleCell, { width: 70 }]}>{atDairy ? parseFloat(atDairy.milkQuantity).toFixed(2) : '-'}</Text>
                                            <Text style={[styles.paymentTableCell, styles.purpleCell, { width: 60 }]}>{atDairy ? parseFloat(atDairy.fatContent).toFixed(2) : '-'}</Text>
                                            <Text style={[styles.paymentTableCell, styles.purpleCell, { width: 60 }]}>{atDairy ? parseFloat(atDairy.snfContent).toFixed(2) : '-'}</Text>
                                            {/* Variances */}
                                            <Text style={[styles.paymentTableCell, { width: 70, color: milkVar < 0 ? colors.error[600] : milkVar > 0 ? colors.success[600] : colors.text.tertiary }]}>
                                                {milkVar !== 0 ? (milkVar > 0 ? '+' : '') + milkVar.toFixed(2) : '0.00'}
                                            </Text>
                                            <Text style={[styles.paymentTableCell, { width: 70, color: fatKgVar < 0 ? colors.error[600] : fatKgVar > 0 ? colors.success[600] : colors.text.tertiary }]}>
                                                {fatKgVar !== 0 ? (fatKgVar > 0 ? '+' : '') + fatKgVar.toFixed(2) : '0.00'}
                                            </Text>
                                            <Text style={[styles.paymentTableCell, { width: 70, color: snfKgVar < 0 ? colors.error[600] : snfKgVar > 0 ? colors.success[600] : colors.text.tertiary }]}>
                                                {snfKgVar !== 0 ? (snfKgVar > 0 ? '+' : '') + snfKgVar.toFixed(2) : '0.00'}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>
                        <View style={styles.legendContainer}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendColor, { backgroundColor: colors.success[100] }]} />
                                <Text style={styles.legendText}>Collection</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendColor, { backgroundColor: colors.secondary[100] }]} />
                                <Text style={styles.legendText}>Dairy Verified</Text>
                            </View>
                        </View>
                    </Card>
                )}

                {/* Payment Calculation */}
                <Card variant="elevated" style={StyleSheet.flatten([styles.paymentCard, { backgroundColor: colors.warning[50] }])}>
                    <Text style={StyleSheet.flatten([styles.cardTitle, { color: colors.warning[900] }])}>💰 Payment Calculation</Text>
                    <View style={styles.pricingInputs}>
                        <View style={styles.pricingInput}>
                            <Text style={styles.pricingLabel}>Base Rate (₹/L)</Text>
                            <Input
                                value={basePricePerLiter}
                                onChangeText={setBasePricePerLiter}
                                keyboardType="numeric"
                                placeholder="50"
                            />
                        </View>
                        <View style={styles.pricingInput}>
                            <Text style={styles.pricingLabel}>Fat Rate (₹/%)</Text>
                            <Input
                                value={fatPricePerPercent}
                                onChangeText={setFatPricePerPercent}
                                keyboardType="numeric"
                                placeholder="2"
                            />
                        </View>
                        <View style={styles.pricingInput}>
                            <Text style={styles.pricingLabel}>SNF Rate (₹/%)</Text>
                            <Input
                                value={snfPricePerPercent}
                                onChangeText={setSnfPricePerPercent}
                                keyboardType="numeric"
                                placeholder="1"
                            />
                        </View>
                    </View>
                    <View style={styles.calculationBreakdown}>
                        <Text style={styles.breakdownTitle}>Based on Dairy Verified Totals</Text>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Milk Payment:</Text>
                            <Text style={styles.breakdownValue}>
                                {dairyTotals.milk.toFixed(2)}L × ₹{basePricePerLiter} = ₹{(parseFloat(basePricePerLiter) * dairyTotals.milk).toFixed(2)}
                            </Text>
                        </View>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Fat Bonus:</Text>
                            <Text style={styles.breakdownValue}>
                                {dairyAvgFat.toFixed(2)}% × ₹{fatPricePerPercent} = ₹{(parseFloat(fatPricePerPercent) * dairyAvgFat).toFixed(2)}
                            </Text>
                        </View>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>SNF Bonus:</Text>
                            <Text style={styles.breakdownValue}>
                                {dairyAvgSnf.toFixed(2)}% × ₹{snfPricePerPercent} = ₹{(parseFloat(snfPricePerPercent) * dairyAvgSnf).toFixed(2)}
                            </Text>
                        </View>
                        <View style={styles.totalPaymentRow}>
                            <Text style={styles.totalPaymentLabel}>Total Payment:</Text>
                            <Text style={styles.totalPaymentValue}>₹{totalPrice.toFixed(2)}</Text>
                        </View>
                    </View>
                </Card>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.secondary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: colors.text.secondary,
    },
    content: {
        padding: spacing.md,
        gap: spacing.lg,
        paddingBottom: spacing.xl,
    },
    sectionCard: {
        marginBottom: 0,
    },
    cardTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    infoItem: {
        width: '45%',
    },
    infoLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
    },
    infoValue: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.primary,
        marginTop: 2,
    },
    summaryCard: {
        borderWidth: 1,
        borderColor: colors.success[200],
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
    },
    summaryValue: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
    },
    comparisonHeader: {
        marginBottom: spacing.md,
    },
    comparisonSubtitle: {
        fontSize: typography.fontSize.xs,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: colors.background.tertiary,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
    },
    tableHeaderCell: {
        fontSize: 11,
        fontWeight: 'bold',
        color: colors.text.secondary,
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    paymentTableRow: {
        flexDirection: 'row',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.light,
        alignItems: 'center',
    },
    paymentTableCell: {
        fontSize: 12,
        color: colors.text.primary,
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    greenHeader: { color: colors.success[700] },
    purpleHeader: { color: colors.secondary[700] },
    greenCell: { color: colors.success[700] },
    purpleCell: { color: colors.secondary[700] },
    paymentBoldText: { fontWeight: 'bold' },

    legendContainer: {
        flexDirection: 'row',
        marginTop: spacing.md,
        gap: spacing.lg,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 2,
    },
    legendText: {
        fontSize: 12,
        color: colors.text.secondary,
    },

    paymentCard: {
        borderWidth: 1,
        borderColor: colors.warning[200],
    },
    pricingInputs: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    pricingInput: {
        flex: 1,
    },
    pricingLabel: {
        fontSize: 10,
        color: colors.text.tertiary,
        marginBottom: 4,
    },
    calculationBreakdown: {
        backgroundColor: 'rgba(255,255,255,0.5)',
        padding: spacing.md,
        borderRadius: borderRadius.md,
    },
    breakdownTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.warning[900],
        marginBottom: spacing.sm,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    breakdownLabel: {
        fontSize: 12,
        color: colors.text.secondary,
    },
    breakdownValue: {
        fontSize: 12,
        fontWeight: 'medium',
        color: colors.text.primary,
    },
    totalPaymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.warning[200],
    },
    totalPaymentLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    totalPaymentValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.success[600],
    },
});

export default OwnerTripDetails;
