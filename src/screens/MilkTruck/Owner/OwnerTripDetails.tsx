import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { getMilkTruckTrips, getMilkTruckBMCs, getMilkTruckVehicles, getMilkTruckRoutes, getMilkTruckPricing } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Input from '../../../components/common/Input';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
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
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <LinearGradient
                colors={[colors.primary[50], '#FFFFFF']}
                style={styles.gradient}
            />

            <ScreenHeader
                title="Payment Details"
                subtitle={`Trip #${displayTripId}`}
                showBackButton
                transparent
            />

            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Status Badge & Basic Info */}
                <View style={styles.headerRow}>
                    <View style={styles.statusBadge}>
                        <View style={[styles.statusDot, { backgroundColor: colors.success[500] }]} />
                        <Text style={styles.statusText}>Completed</Text>
                    </View>
                    <Text style={styles.dateTimeText}>
                        {new Date(trip.endTime || trip.startTime).toLocaleString()}
                    </Text>
                </View>

                {/* Info Card */}
                <Card variant="elevated" style={styles.infoCard}>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>ROUTE</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>{tripRoute?.name || 'N/A'}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>VEHICLE</Text>
                            <Text style={styles.infoValue}>{vehicle?.registrationNumber || 'N/A'}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>COLLECTED</Text>
                            <Text style={styles.infoValue}>{trip.summary?.totalMilk?.toFixed(2) || '0.00'} L</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>BMCs</Text>
                            <Text style={styles.infoValue}>{bmcEntries.length}</Text>
                        </View>
                    </View>
                </Card>

                {/* Summary Section */}
                <Text style={styles.sectionTitle}>Verified Summary (At Dairy)</Text>
                <View style={styles.summaryContainer}>
                    <LinearGradient
                        colors={[colors.success[500], colors.success[600]]}
                        style={styles.mainSummaryCard}
                    >
                        <View style={styles.summaryMainTop}>
                            <Text style={styles.summaryMainLabel}>Total Verified Milk</Text>
                            <Text style={styles.summaryMainValue}>{dairyTotals.milk.toFixed(2)} L</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryMainBottom}>
                            <View style={styles.summarySubItem}>
                                <Text style={styles.summarySubLabel}>Avg Fat</Text>
                                <Text style={styles.summarySubValue}>{dairyAvgFat.toFixed(2)}%</Text>
                            </View>
                            <View style={styles.summarySubItem}>
                                <Text style={styles.summarySubLabel}>Avg SNF</Text>
                                <Text style={styles.summarySubValue}>{dairyAvgSnf.toFixed(2)}%</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Comparison Section */}
                <Text style={styles.sectionTitle}>BMC Comparison</Text>
                <Card variant="elevated" style={styles.tableCard}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderText, { width: 100, textAlign: 'left' }]}>BMC Name</Text>
                                <Text style={[styles.tableHeaderText, { width: 80 }]}>Collection</Text>
                                <Text style={[styles.tableHeaderText, { width: 80 }]}>Verified</Text>
                                <Text style={[styles.tableHeaderText, { width: 80 }]}>Variance</Text>
                            </View>
                            {bmcEntries.map((entry: any, index: number) => {
                                const bmcName = entry.bmcId?.name || bmcs.find((b: any) => (b._id || b.id) === (entry.bmcId?._id || entry.bmcId))?.name || 'Unknown';
                                const collMilk = parseFloat(entry.collectionData?.milkQuantity || 0);
                                const verifiedMilk = parseFloat((entry.dairyVerifiedData || entry.collectionData)?.milkQuantity || 0);
                                const variance = verifiedMilk - collMilk;

                                return (
                                    <View key={index} style={styles.tableRow}>
                                        <Text style={[styles.tableCellText, { width: 100, textAlign: 'left', fontWeight: 'bold' }]} numberOfLines={1}>
                                            {bmcName}
                                        </Text>
                                        <Text style={[styles.tableCellText, { width: 80 }]}>{collMilk.toFixed(2)}</Text>
                                        <Text style={[styles.tableCellText, { width: 80, color: colors.success[700] }]}>{verifiedMilk.toFixed(2)}</Text>
                                        <Text style={[styles.tableCellText, {
                                            width: 80,
                                            fontWeight: 'bold',
                                            color: variance < 0 ? colors.error[600] : variance > 0 ? colors.success[600] : colors.text.tertiary
                                        }]}>
                                            {variance !== 0 ? (variance > 0 ? '+' : '') + variance.toFixed(2) : '0.00'}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                </Card>

                {/* Calculation Card */}
                <Text style={styles.sectionTitle}>Payment Calculation</Text>
                <Card variant="elevated" style={styles.paymentCard}>
                    <View style={styles.pricingGrid}>
                        <View style={styles.priceInputItem}>
                            <Text style={styles.priceInputLabel}>Base Rate (₹/L)</Text>
                            <Input
                                value={basePricePerLiter}
                                onChangeText={setBasePricePerLiter}
                                keyboardType="numeric"
                                style={styles.compactInput}
                            />
                        </View>
                        <View style={styles.priceInputItem}>
                            <Text style={styles.priceInputLabel}>Fat Bonus (₹/%)</Text>
                            <Input
                                value={fatPricePerPercent}
                                onChangeText={setFatPricePerPercent}
                                keyboardType="numeric"
                                style={styles.compactInput}
                            />
                        </View>
                        <View style={styles.priceInputItem}>
                            <Text style={styles.priceInputLabel}>SNF Bonus (₹/%)</Text>
                            <Input
                                value={snfPricePerPercent}
                                onChangeText={setSnfPricePerPercent}
                                keyboardType="numeric"
                                style={styles.compactInput}
                            />
                        </View>
                    </View>

                    <View style={styles.calculationBox}>
                        <View style={styles.calcRow}>
                            <Text style={styles.calcLabel}>Milk Payment</Text>
                            <Text style={styles.calcValue}>₹{(parseFloat(basePricePerLiter || '0') * dairyTotals.milk).toFixed(2)}</Text>
                        </View>
                        <View style={styles.calcRow}>
                            <Text style={styles.calcLabel}>Fat Bonus</Text>
                            <Text style={styles.calcValue}>₹{(parseFloat(fatPricePerPercent || '0') * dairyAvgFat).toFixed(2)}</Text>
                        </View>
                        <View style={styles.calcRow}>
                            <Text style={styles.calcLabel}>SNF Bonus</Text>
                            <Text style={styles.calcValue}>₹{(parseFloat(snfPricePerPercent || '0') * dairyAvgSnf).toFixed(2)}</Text>
                        </View>
                        <View style={styles.calcDivider} />
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Grand Total</Text>
                            <Text style={styles.totalValue}>₹{totalPrice.toFixed(2)}</Text>
                        </View>
                    </View>
                </Card>

                <TouchableOpacity style={styles.printButton} activeOpacity={0.8}>
                    <Text style={styles.printButtonText}>Generate Payment Receipt</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 300,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: typography.fontSize.base,
        color: colors.primary[600],
    },
    scrollContainer: {
        flex: 1,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success[50],
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.success[100],
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: typography.fontWeight.bold,
        color: colors.success[700],
        textTransform: 'uppercase',
    },
    dateTimeText: {
        fontSize: 12,
        color: colors.text.tertiary,
        fontWeight: typography.fontWeight.medium,
    },
    infoCard: {
        padding: spacing.md,
        borderRadius: borderRadius.xl,
        backgroundColor: 'white',
        ...shadows.sm,
        marginBottom: spacing.xl,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    infoItem: {
        width: '50%',
        marginVertical: spacing.xs,
    },
    infoLabel: {
        fontSize: 10,
        color: colors.text.tertiary,
        fontWeight: typography.fontWeight.bold,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: typography.fontSize.sm,
        color: colors.primary[900],
        fontWeight: typography.fontWeight.bold,
    },
    sectionTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
        color: colors.primary[900],
        marginBottom: spacing.md,
    },
    summaryContainer: {
        marginBottom: spacing.xl,
    },
    mainSummaryCard: {
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        ...shadows.md,
    },
    summaryMainTop: {
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    summaryMainLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: typography.fontWeight.medium,
    },
    summaryMainValue: {
        fontSize: 36,
        color: 'white',
        fontWeight: typography.fontWeight.bold,
    },
    summaryDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginBottom: spacing.md,
    },
    summaryMainBottom: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    summarySubItem: {
        alignItems: 'center',
    },
    summarySubLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 2,
    },
    summarySubValue: {
        fontSize: 18,
        color: 'white',
        fontWeight: typography.fontWeight.bold,
    },
    tableCard: {
        padding: 0,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        marginBottom: spacing.xl,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: colors.primary[50],
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.primary[100],
    },
    tableHeaderText: {
        fontSize: 11,
        fontWeight: typography.fontWeight.bold,
        color: colors.primary[800],
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.primary[50],
        alignItems: 'center',
    },
    tableCellText: {
        fontSize: typography.fontSize.sm,
        color: colors.primary[900],
        textAlign: 'center',
    },
    paymentCard: {
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        backgroundColor: 'white',
        ...shadows.md,
        marginBottom: spacing.xl,
    },
    pricingGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    priceInputItem: {
        flex: 1,
    },
    priceInputLabel: {
        fontSize: 10,
        color: colors.text.tertiary,
        fontWeight: typography.fontWeight.bold,
        marginBottom: 6,
    },
    compactInput: {
        height: 44,
        fontSize: 14,
    },
    calculationBox: {
        backgroundColor: colors.primary[50],
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    calcRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    calcLabel: {
        fontSize: 13,
        color: colors.primary[700],
        fontWeight: typography.fontWeight.medium,
    },
    calcValue: {
        fontSize: 13,
        color: colors.primary[900],
        fontWeight: typography.fontWeight.bold,
    },
    calcDivider: {
        height: 1,
        backgroundColor: colors.primary[100],
        marginVertical: spacing.sm,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: typography.fontWeight.bold,
        color: colors.primary[900],
    },
    totalValue: {
        fontSize: 24,
        fontWeight: typography.fontWeight.bold,
        color: colors.success[600],
    },
    printButton: {
        backgroundColor: colors.primary[600],
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        ...shadows.md,
    },
    printButtonText: {
        color: 'white',
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
    },
});

export default OwnerTripDetails;
