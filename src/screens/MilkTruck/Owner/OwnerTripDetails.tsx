import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar, Animated, ActivityIndicator, KeyboardAvoidingView, Modal, Image as RNImage } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { getMilkTruckTrips, getMilkTruckBMCs, getMilkTruckVehicles, getMilkTruckRoutes, getMilkTruckPricing } from '../../../utils/storage';
import Card from '../../../components/common/Card';
import Input from '../../../components/common/Input';
import ScreenHeader from '../../../components/common/ScreenHeader';
import DriverPathMap, { Coord } from '../../../components/DriverPathMap';
import { BASE_URL } from '../../../config/api';
import { calculateTotalDistance } from '../../../utils/distance';
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
    const [isImageModalVisible, setIsImageModalVisible] = useState(false);
    const [selectedEntryImage, setSelectedEntryImage] = useState<string | null>(null);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;

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

            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        } catch (error) {
            console.error('Error loading trip details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !trip) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary[600]} size="large" />
                <Text style={styles.loadingText}>Loading settlement data...</Text>
            </View>
        );
    }

    const vehicle = vehicles.find((v: any) => (v._id || v.id) === (trip.vehicleId?._id || trip.vehicleId?.id || trip.vehicleId));
    const tripRoute = routes.find((r: any) => (r._id || r.id) === (trip.routeId?._id || trip.routeId?.id || trip.routeId));
    const bmcEntries = trip.bmcEntries || [];

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

    // Unified Totals & Variance Calculation
    const collectionTotals = trip.bmcEntries?.reduce((acc: any, entry: any) => {
        const data = entry.collectionData;
        if (!data) return acc;
        const milk = parseFloat(data.milkQuantity) || 0;
        const fat = parseFloat(data.fatContent) || 0;
        const snf = parseFloat(data.snfContent) || 0;
        acc.milk += milk;
        acc.fatKg += (milk * fat) / 100;
        acc.snfKg += (milk * snf) / 100;
        return acc;
    }, { milk: 0, fatKg: 0, snfKg: 0 }) || { milk: 0, fatKg: 0, snfKg: 0 };

    const calculateSettlement = () => {
        const basePrice = parseFloat(basePricePerLiter) || 0;
        const fatPrice = parseFloat(fatPricePerPercent) || 0;
        const snfPrice = parseFloat(snfPricePerPercent) || 0;

        // Physical Variances
        const milkVar = dairyTotals.milk - collectionTotals.milk;
        const fatKgVar = dairyTotals.fatKg - collectionTotals.fatKg;
        const snfKgVar = dairyTotals.snfKg - collectionTotals.snfKg;

        // Monetary Values
        // Note: For Fat/SNF, the price is per %, so we convert KG variance back to % context for consistency or price per KG if applicable.
        // In the existing calc: fatPrice * dairyAvgFat. 
        // dairyAvgFat = (fatKg / milk) * 100.
        // So fatPrice * (fatKg / milk) * 100.

        const milkPayment = basePrice * dairyTotals.milk;
        const fatBonus = fatPrice * dairyAvgFat;
        const snfBonus = snfPrice * dairyAvgSnf;

        // Variance Monetary Impact
        // If the user adds price, we calculate how much money was lost/gained relative to what was collected
        const milkVarValue = milkVar * basePrice;

        // For Fat/SNF we use the shift in percentage points vs volume collected? 
        // Usually, variance is simpler: (DairyTotal - CollTotal) * Rate.
        // If Rate is based on Fat%... it's complicated. Let's use the Base Price for Milk Variance.

        const milkVarImpact = milkVar * basePrice;
        const fatVarImpact = fatKgVar * fatPrice;
        const snfVarImpact = snfKgVar * snfPrice;

        return {
            milkPrice: basePrice * dairyTotals.milk,
            fatPrice: fatPrice * dairyAvgFat,
            snfPrice: snfPrice * dairyAvgSnf,
            totalVariancePrice: milkVarImpact + fatVarImpact + snfVarImpact,
            variances: {
                milk: milkVar,
                fatKg: fatKgVar,
                snfKg: snfKgVar,
                milkImpact: milkVarImpact,
                fatImpact: fatVarImpact,
                snfImpact: snfVarImpact,
            }
        };
    };

    const settlement = calculateSettlement();
    const displayTripId = (trip._id || trip.id).toString().substring((trip._id || trip.id).toString().length - 6).toUpperCase();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <LinearGradient
                colors={['#F0FDF4', '#FFFFFF']}
                style={styles.headerGradient}
            />

            <ScreenHeader
                title="Settlement Detail"
                subtitle={`Trip #${displayTripId}`}
                showBackButton
                transparent
                style={styles.customHeader}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <Card style={styles.pathCard}>
                            <View style={styles.pathHeaderRow}>
                                <View style={styles.pathIconBox}>
                                    <Text style={styles.pathIconEmoji}>🗺️</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.pathCardTitle}>Trip Playback History</Text>
                                    <Text style={styles.pathCardSubtitle}>
                                        {trip.locationHistory && trip.locationHistory.length >= 2
                                            ? `${calculateTotalDistance((trip.locationHistory || []).map((p: any) => ({
                                                latitude: p.latitude ?? p.lat,
                                                longitude: p.longitude ?? p.lng,
                                            })).filter((p: Coord) => typeof p.latitude === 'number' && typeof p.longitude === 'number')).toFixed(2)} km route recorded`
                                            : 'No route data available'
                                        }
                                    </Text>
                                </View>
                            </View>

                            {(trip.locationHistory && trip.locationHistory.length >= 2) ? (
                                <TouchableOpacity
                                    style={styles.viewMapButton}
                                    activeOpacity={0.8}
                                    onPress={() => navigation.navigate('MilkTruckOwnerTripMap', {
                                        locationHistory: trip.locationHistory,
                                        routeName: tripRoute?.name,
                                        vehicleReg: vehicle?.registrationNumber,
                                        tripId: trip._id || trip.id
                                    })}
                                >
                                    <LinearGradient
                                        colors={[colors.primary[600], colors.primary[700]]}
                                        style={styles.viewMapGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Text style={styles.viewMapText}>View Full Trip Path</Text>
                                        <Text style={styles.viewMapIcon}>🗺️</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.noPathContainer}>
                                    <Text style={styles.noPathText}>No path recorded for this trip.</Text>
                                    <View style={styles.hintBox}>
                                        <Text style={styles.hintText}>💡 Tip: Ensure drivers keep the app active to record route data.</Text>
                                    </View>
                                </View>
                            )}
                        </Card>
                        {/* Status & Date */}
                        <View style={styles.metaRow}>
                            <View style={styles.statusChip}>
                                <Text style={styles.statusChipText}>VERIFIED</Text>
                            </View>
                            <Text style={styles.dateText}>
                                {new Date(trip.endTime || trip.startTime).toLocaleDateString(undefined, {
                                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </Text>
                        </View>

                        {/* Mission Overview */}
                        <View style={styles.overviewGrid}>
                            <View style={styles.overviewCard}>
                                <Text style={styles.ovLabel}>ROUTE</Text>
                                <Text style={styles.ovValue} numberOfLines={1}>{tripRoute?.name || 'N/A'}</Text>
                            </View>
                            <View style={styles.overviewCard}>
                                <Text style={styles.ovLabel}>VEHICLE</Text>
                                <Text style={styles.ovValue}>{vehicle?.registrationNumber || 'N/A'}</Text>
                            </View>
                        </View>

                        {/* Hero Verification Card */}
                        <LinearGradient
                            colors={[colors.success[600], colors.success[400]]}
                            style={styles.heroSummaryCard}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.heroTop}>
                                <Text style={styles.heroLabel}>Verified Milk Intake</Text>
                                <Text style={styles.heroValue}>{dairyTotals.milk.toFixed(2)} <Text style={styles.unit}>Ltrs</Text></Text>
                            </View>
                            <View style={styles.heroBottom}>
                                <View style={styles.heroStat}>
                                    <Text style={styles.hsLabel}>Avg Fat</Text>
                                    <Text style={styles.hsValue}>{dairyAvgFat.toFixed(2)}%</Text>
                                </View>
                                <View style={styles.heroDivider} />
                                <View style={styles.heroStat}>
                                    <Text style={styles.hsLabel}>Avg SNF</Text>
                                    <Text style={styles.hsValue}>{dairyAvgSnf.toFixed(2)}%</Text>
                                </View>
                            </View>

                            {/* Trip Variance Summary */}
                            <View style={styles.varianceSummaryRow}>
                                <View style={styles.varianceSummaryItem}>
                                    <Text style={styles.varianceSummaryLabel}>Milk:</Text>
                                    <Text style={[styles.varianceSummaryValue, {
                                        color: settlement.variances.milk < 0 ? '#FECACA' : settlement.variances.milk > 0 ? '#BBF7D0' : 'rgba(255,255,255,0.6)'
                                    }]}>
                                        {settlement.variances.milk > 0 ? '+' : ''}{settlement.variances.milk.toFixed(2)}L
                                    </Text>
                                </View>
                                <View style={styles.varianceSummaryItem}>
                                    <Text style={styles.varianceSummaryLabel}>Fat KG:</Text>
                                    <Text style={[styles.varianceSummaryValue, {
                                        color: settlement.variances.fatKg < 0 ? '#FECACA' : settlement.variances.fatKg > 0 ? '#BBF7D0' : 'rgba(255,255,255,0.6)'
                                    }]}>
                                        {settlement.variances.fatKg > 0 ? '+' : ''}{settlement.variances.fatKg.toFixed(2)}kg
                                    </Text>
                                </View>
                                <View style={styles.varianceSummaryItem}>
                                    <Text style={styles.varianceSummaryLabel}>SNF KG:</Text>
                                    <Text style={[styles.varianceSummaryValue, {
                                        color: settlement.variances.snfKg < 0 ? '#FECACA' : settlement.variances.snfKg > 0 ? '#BBF7D0' : 'rgba(255,255,255,0.6)'
                                    }]}>
                                        {settlement.variances.snfKg > 0 ? '+' : ''}{settlement.variances.snfKg.toFixed(2)}kg
                                    </Text>
                                </View>
                            </View>
                        </LinearGradient>

                        {/* BMC Audit Section */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Collection Audit</Text>
                            <View style={styles.sectionIcon}>
                                <Text style={styles.siText}>📍</Text>
                            </View>
                        </View>

                        <Card style={styles.auditCard}>
                            {bmcEntries.map((entry: any, index: number) => {
                                const bmcId = entry.bmcId?._id || entry.bmcId;
                                const bmcName = entry.bmcId?.name || bmcs.find((b: any) => (b._id || b.id) === bmcId)?.name || 'Unknown';
                                const collMilk = parseFloat(entry.collectionData?.milkQuantity || 0);
                                const collFat = parseFloat(entry.collectionData?.fatContent || 0);
                                const collSnf = parseFloat(entry.collectionData?.snfContent || 0);

                                const verifiedData = entry.dairyVerifiedData || entry.collectionData;
                                const verifiedMilk = parseFloat(verifiedData?.milkQuantity || 0);
                                const verifiedFat = parseFloat(verifiedData?.fatContent || 0);
                                const verifiedSnf = parseFloat(verifiedData?.snfContent || 0);

                                const milkVar = verifiedMilk - collMilk;
                                const collFatKg = (collMilk * collFat) / 100;
                                const verifiedFatKg = (verifiedMilk * verifiedFat) / 100;
                                const fatVarKg = verifiedFatKg - collFatKg;

                                const collSnfKg = (collMilk * collSnf) / 100;
                                const verifiedSnfKg = (verifiedMilk * verifiedSnf) / 100;
                                const snfVarKg = verifiedSnfKg - collSnfKg;

                                const getVarColor = (val: number) => val < 0 ? colors.error[600] : val > 0 ? colors.success[600] : colors.text.tertiary;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.auditRow, index === bmcEntries.length - 1 && { borderBottomWidth: 0 }]}
                                        onPress={() => navigation.navigate('MilkTruckOwnerBMCs', { bmcId })}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.auditHeader}>
                                            <View style={styles.auditHeaderMain}>
                                                <View>
                                                    <Text style={styles.auditName}>{bmcName}</Text>
                                                    <Text style={styles.auditActionHint}>Tap to view performance analytics 📊</Text>
                                                </View>
                                                {entry.collectionData?.image && (
                                                    <TouchableOpacity
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedEntryImage(`${BASE_URL}${entry.collectionData.image}`);
                                                            setIsImageModalVisible(true);
                                                        }}
                                                        style={styles.thumbnailContainer}
                                                    >
                                                        <RNImage
                                                            source={{ uri: `${BASE_URL}${entry.collectionData.image}` }}
                                                            style={styles.thumbnail}
                                                        />
                                                        <View style={styles.zoomIconBg}>
                                                            <Text style={styles.zoomText}>🔍</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                            <View style={styles.auditStatusBadge}>
                                                <Text style={styles.verifiedText}>Verified: {verifiedMilk.toFixed(1)}L</Text>
                                            </View>
                                        </View>

                                        <View style={styles.auditDetailGrid}>
                                            {/* Milk Metric */}
                                            <View style={styles.metricItem}>
                                                <Text style={styles.metricLabel}>Milk (L)</Text>
                                                <View style={styles.metricValueRow}>
                                                    <Text style={styles.collValue}>{collMilk.toFixed(1)}</Text>
                                                    <Text style={styles.arrowIcon}>→</Text>
                                                    <Text style={[styles.varValue, { color: getVarColor(milkVar) }]}>
                                                        {milkVar > 0 ? '+' : ''}{milkVar.toFixed(1)}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Fat Metric */}
                                            <View style={styles.metricItem}>
                                                <Text style={styles.metricLabel}>Fat (kg)</Text>
                                                <View style={styles.metricValueRow}>
                                                    <Text style={styles.collValue}>{collFatKg.toFixed(2)}</Text>
                                                    <Text style={styles.arrowIcon}>→</Text>
                                                    <Text style={[styles.varValue, { color: getVarColor(fatVarKg) }]}>
                                                        {fatVarKg > 0 ? '+' : ''}{fatVarKg.toFixed(2)}
                                                    </Text>
                                                </View>
                                                <Text style={styles.metricSub}>{collFat.toFixed(1)}%</Text>
                                            </View>

                                            {/* SNF Metric */}
                                            <View style={styles.metricItem}>
                                                <Text style={styles.metricLabel}>SNF (kg)</Text>
                                                <View style={styles.metricValueRow}>
                                                    <Text style={styles.collValue}>{collSnfKg.toFixed(2)}</Text>
                                                    <Text style={styles.arrowIcon}>→</Text>
                                                    <Text style={[styles.varValue, { color: getVarColor(snfVarKg) }]}>
                                                        {snfVarKg > 0 ? '+' : ''}{snfVarKg.toFixed(2)}
                                                    </Text>
                                                </View>
                                                <Text style={styles.metricSub}>{collSnf.toFixed(1)}%</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </Card>

                        {/* Settlement Calculator */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Revenue Settlement</Text>
                            <View style={[styles.sectionIcon, { backgroundColor: '#FEF3C7' }]}>
                                <Text style={styles.siText}>💰</Text>
                            </View>
                        </View>

                        <Card style={styles.settlementCard}>
                            <View style={styles.calculatorInputs}>
                                <View style={styles.calcInputWrapper}>
                                    <Text style={styles.calcInputLabel}>Milk Rate</Text>
                                    <Input
                                        value={basePricePerLiter}
                                        onChangeText={setBasePricePerLiter}
                                        keyboardType="numeric"
                                        style={styles.premiumInput}
                                        leftIcon={<Text style={styles.currencyIcon}>₹</Text>}
                                        containerStyle={styles.inputContainerStyle}
                                    />
                                </View>
                                <View style={styles.calcInputWrapper}>
                                    <Text style={styles.calcInputLabel}>Fat Rate</Text>
                                    <Input
                                        value={fatPricePerPercent}
                                        onChangeText={setFatPricePerPercent}
                                        keyboardType="numeric"
                                        style={styles.premiumInput}
                                        leftIcon={<Text style={styles.currencyIcon}>₹</Text>}
                                        containerStyle={styles.inputContainerStyle}
                                    />
                                </View>
                                <View style={styles.calcInputWrapper}>
                                    <Text style={styles.calcInputLabel}>SNF Rate</Text>
                                    <Input
                                        value={snfPricePerPercent}
                                        onChangeText={setSnfPricePerPercent}
                                        keyboardType="numeric"
                                        style={styles.premiumInput}
                                        leftIcon={<Text style={styles.currencyIcon}>₹</Text>}
                                        containerStyle={styles.inputContainerStyle}
                                    />
                                </View>
                            </View>

                            <View style={styles.receiptBody}>
                                <View style={styles.receiptHeader}>
                                    <Text style={styles.receiptSectionTitle}>TRIP VARIANCE SETTLEMENT</Text>
                                </View>

                                <View style={styles.receiptRow}>
                                    <View style={styles.rtLabelCol}>
                                        <Text style={styles.rtLabel}>Milk Qty Variance</Text>
                                        <Text style={styles.rtLabelDetail}>{settlement.variances.milk.toFixed(2)}L @ ₹{basePricePerLiter}/L</Text>
                                    </View>
                                    <Text style={[styles.rtValue, { color: settlement.variances.milkImpact < 0 ? colors.error[600] : colors.success[600] }]}>
                                        {settlement.variances.milkImpact > 0 ? '+' : ''}₹{settlement.variances.milkImpact.toFixed(2)}
                                    </Text>
                                </View>

                                <View style={styles.receiptRow}>
                                    <View style={styles.rtLabelCol}>
                                        <Text style={styles.rtLabel}>Fat Solids Variance</Text>
                                        <Text style={styles.rtLabelDetail}>{settlement.variances.fatKg.toFixed(2)}kg @ ₹{fatPricePerPercent}/kg</Text>
                                    </View>
                                    <Text style={[styles.rtValue, { color: settlement.variances.fatImpact < 0 ? colors.error[600] : colors.success[600] }]}>
                                        {settlement.variances.fatImpact > 0 ? '+' : ''}₹{settlement.variances.fatImpact.toFixed(2)}
                                    </Text>
                                </View>

                                <View style={styles.receiptRow}>
                                    <View style={styles.rtLabelCol}>
                                        <Text style={styles.rtLabel}>SNF Solids Variance</Text>
                                        <Text style={styles.rtLabelDetail}>{settlement.variances.snfKg.toFixed(2)}kg @ ₹{snfPricePerPercent}/kg</Text>
                                    </View>
                                    <Text style={[styles.rtValue, { color: settlement.variances.snfImpact < 0 ? colors.error[600] : colors.success[600] }]}>
                                        {settlement.variances.snfImpact > 0 ? '+' : ''}₹{settlement.variances.snfImpact.toFixed(2)}
                                    </Text>
                                </View>

                                <View style={styles.receiptDivider} />
                                <View style={styles.receiptTotalRow}>
                                    <View>
                                        <Text style={styles.totalLabel}>Total Variance Value</Text>
                                        <Text style={styles.totalLabelSub}>Net Profit/Loss for Trip</Text>
                                    </View>
                                    <Text style={[styles.totalValue, { color: settlement.totalVariancePrice < 0 ? colors.error[600] : colors.success[600] }]}>
                                        {settlement.totalVariancePrice > 0 ? '+' : ''}₹{settlement.totalVariancePrice.toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        </Card>

                        <TouchableOpacity style={styles.settleBtn} activeOpacity={0.8}>
                            <LinearGradient colors={['#059669', '#10B981']} style={styles.btnGradient}>
                                <Text style={styles.btnText}>Authorize & Finalize Payment</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Image Modal */}
            <Modal
                visible={isImageModalVisible}
                transparent={true}
                onRequestClose={() => setIsImageModalVisible(false)}
                animationType="fade"
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsImageModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <RNImage
                            source={{ uri: selectedEntryImage || '' }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setIsImageModalVisible(false)}
                        >
                            <Text style={styles.closeBtnText}>CLOSE</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    customHeader: {
        paddingTop: Platform.OS === 'android' ? 50 : 60,
        paddingBottom: spacing.sm,
    },
    headerGradient: {
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
    },
    loadingText: {
        marginTop: spacing.md,
        color: colors.primary[600],
        fontWeight: '500',
    },
    scrollContainer: {
        flex: 1,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: 40,
    },
    pathCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        overflow: 'hidden',
        borderRadius: borderRadius.lg,
    },
    pathCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.primary[900],
    },
    pathCardSubtitle: {
        fontSize: 12,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    pathHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        gap: spacing.md,
    },
    pathIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    pathIconEmoji: {
        fontSize: 20,
    },
    viewMapButton: {
        margin: spacing.md,
        marginTop: 0,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        ...shadows.sm,
    },
    viewMapGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    viewMapText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    viewMapIcon: {
        fontSize: 16,
    },
    noPathContainer: {
        padding: spacing.md,
        paddingTop: 0,
        alignItems: 'center',
    },
    hintBox: {
        backgroundColor: colors.background.tertiary,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        marginTop: spacing.sm,
        width: '100%',
    },
    hintText: {
        fontSize: 12,
        color: colors.text.secondary,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    noPathText: {
        fontSize: 14,
        color: colors.text.secondary,
        textAlign: 'center',
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    statusChip: {
        backgroundColor: colors.success[100],
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusChipText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.success[700],
        letterSpacing: 0.5,
    },
    dateText: {
        fontSize: 11,
        color: colors.text.tertiary,
        fontWeight: '500',
    },
    overviewGrid: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    overviewCard: {
        flex: 1,
        backgroundColor: colors.background.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.sm,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    ovLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.text.tertiary,
        marginBottom: 2,
    },
    ovValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primary[900],
    },
    heroSummaryCard: {
        borderRadius: borderRadius['3xl'],
        padding: spacing.xl,
        marginBottom: spacing.xl,
        ...shadows.md,
    },
    heroTop: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    heroLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    heroValue: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
    },
    unit: {
        fontSize: 16,
        opacity: 0.8,
    },
    heroBottom: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: borderRadius.xl,
        padding: spacing.md,
    },
    heroStat: {
        alignItems: 'center',
    },
    hsLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
    hsValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    heroDivider: {
        width: 1,
        height: '80%',
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'center',
    },
    varianceSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    varianceSummaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    varianceSummaryLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    varianceSummaryValue: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    auditSubContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: 2,
    },
    auditVarianceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    auditVarText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    auditVarTextSmall: {
        fontSize: 10,
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.primary[900],
    },
    sectionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.success[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    siText: {
        fontSize: 16,
    },
    auditCard: {
        padding: 0,
        overflow: 'hidden',
        marginBottom: spacing.xl,
    },
    auditRow: {
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)',
    },
    auditHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    auditStatusBadge: {
        backgroundColor: colors.success[50],
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: colors.success[100],
    },
    verifiedText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.success[700],
    },
    auditName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.primary[900],
    },
    auditActionHint: {
        fontSize: 10,
        color: colors.primary[500],
        marginTop: 2,
        fontWeight: '500',
    },
    auditDetailGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    metricItem: {
        flex: 1,
        backgroundColor: colors.background.secondary,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.text.tertiary,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    metricValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    collValue: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    arrowIcon: {
        fontSize: 10,
        color: colors.text.disabled,
    },
    varValue: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    metricSub: {
        fontSize: 9,
        color: colors.text.disabled,
        marginTop: 2,
    },
    settlementCard: {
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    calculatorInputs: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    calcInputWrapper: {
        flex: 1,
    },
    calcInputLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.primary[700],
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        textAlign: 'center',
    },
    inputContainerStyle: {
        marginBottom: 0,
    },
    premiumInput: {
        height: 52,
        fontSize: 18,
        fontWeight: 'bold',
        backgroundColor: '#fff',
        borderRadius: borderRadius.lg,
        paddingLeft: 48,
        paddingVertical: 0,
        color: colors.primary[900],
        textAlign: 'center',
    },
    currencyIcon: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary[600],
        marginLeft: 4,
    },
    receiptBody: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    rtLabel: {
        fontSize: 12,
        color: colors.text.secondary,
    },
    rtValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.primary[900],
    },
    receiptHeader: {
        marginBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingBottom: 4,
    },
    receiptSectionTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.text.tertiary,
        letterSpacing: 0.5,
    },
    rtLabelCol: {
        flex: 1,
    },
    rtLabelDetail: {
        fontSize: 10,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    rtValueTertiary: {
        fontSize: 11,
        color: colors.text.disabled,
        fontStyle: 'italic',
    },
    totalLabelSub: {
        fontSize: 10,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    receiptDivider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginVertical: spacing.sm,
    },
    receiptTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primary[900],
    },
    totalValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.success[600],
    },
    settleBtn: {
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        ...shadows.md,
    },
    btnGradient: {
        padding: spacing.lg,
        alignItems: 'center',
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    auditHeaderMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        width: '100%',
    },
    thumbnailContainer: {
        width: 60,
        height: 60,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border.light,
        backgroundColor: colors.background.tertiary,
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    zoomIconBg: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopLeftRadius: 6,
    },
    zoomText: {
        fontSize: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        height: '70%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
    closeBtn: {
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
    },
    closeBtnText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12,
        letterSpacing: 1,
    }
});

export default OwnerTripDetails;
