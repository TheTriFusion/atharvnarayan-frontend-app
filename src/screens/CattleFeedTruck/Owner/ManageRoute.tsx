import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Animated, StatusBar, Platform, KeyboardAvoidingView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import ScreenHeader from '../../../components/common/ScreenHeader';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';

const ManageRoute: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = useAuth();
    const toast = useToast();
    const editingRoute = route.params?.route;

    const [loading, setLoading] = useState(false);
    const [deliveryPoints, setDeliveryPoints] = useState<any[]>([]);
    const [fetchingPoints, setFetchingPoints] = useState(true);
    const [formData, setFormData] = useState({
        name: editingRoute?.name || '',
        startPoint: editingRoute?.startPoint || '',
        deliveryPoints: editingRoute?.deliveryPoints?.map((p: any) => p._id || p) || [] as string[],
        estimatedDistance: editingRoute?.estimatedDistance?.toString() || '',
    });

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        fetchDeliveryPoints();
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

    const fetchDeliveryPoints = async () => {
        try {
            const response = await cattleFeedTruckAPI.getDeliveryPoints(user?.id);
            setDeliveryPoints(Array.isArray(response) ? response : (Array.isArray(response.data) ? response.data : []));
        } catch (error) {
            console.error('Error fetching delivery points:', error);
            toast.error('Failed to load delivery points');
        } finally {
            setFetchingPoints(false);
        }
    };

    const toggleDeliveryPoint = (pointId: string) => {
        setFormData(prev => ({
            ...prev,
            deliveryPoints: prev.deliveryPoints.includes(pointId)
                ? prev.deliveryPoints.filter((p: any) => p !== pointId)
                : [...prev.deliveryPoints, pointId]
        }));
    };

    const handleSubmit = async () => {
        try {
            if (!formData.name.trim()) {
                toast.error('Route name is required');
                return;
            }

            setLoading(true);
            const dataToSubmit = {
                ...formData,
                ownerId: user?.id,
                estimatedDistance: formData.estimatedDistance.trim() || undefined,
            };

            if (editingRoute) {
                await cattleFeedTruckAPI.updateRoute(editingRoute._id, dataToSubmit);
                toast.success('Route updated successfully!');
            } else {
                await cattleFeedTruckAPI.createRoute(dataToSubmit);
                toast.success('Route created successfully!');
            }
            navigation.goBack();
        } catch (error: any) {
            console.error('Error saving route:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to save route');
        } finally {
            setLoading(false);
        }
    };

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
                title={editingRoute ? 'Edit Route' : 'Create Route'}
                subtitle={editingRoute ? 'Refine your supply chain path' : 'Design a new distribution route'}
                transparent
                showBackButton
                titleStyle={{ color: '#fff' }}
                subtitleStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.iconSection}>
                            <View style={styles.iconCircle}>
                                <Text style={styles.iconEmoji}>🗺️</Text>
                            </View>
                            <Text style={styles.iconHint}>Route Details</Text>
                        </View>

                        <View style={styles.form}>
                            <Input
                                label="Route Name"
                                value={formData.name}
                                onChangeText={(text) => setFormData({ ...formData, name: text })}
                                placeholder="e.g. North Zone Distribution"
                                required
                            />
                            <Input
                                label="Start Point"
                                value={formData.startPoint}
                                onChangeText={(text) => setFormData({ ...formData, startPoint: text })}
                                placeholder="e.g. Main Warehouse"
                            />
                            <Input
                                label="Est. Distance (km)"
                                value={formData.estimatedDistance}
                                onChangeText={(text) => setFormData({ ...formData, estimatedDistance: text })}
                                keyboardType="numeric"
                                placeholder="e.g. 120"
                            />

                            <View style={styles.stopsSection}>
                                <Text style={styles.sectionTitle}>Distribution Points</Text>
                                <Text style={styles.sectionSubtitle}>Select delivery stops for this route</Text>

                                {fetchingPoints ? (
                                    <ActivityIndicator size="small" color={colors.primary[600]} style={{ marginVertical: 20 }} />
                                ) : deliveryPoints.length === 0 ? (
                                    <View style={styles.emptyPoints}>
                                        <Text style={styles.emptyPointsText}>No delivery points registered yet.</Text>
                                    </View>
                                ) : (
                                    <View style={styles.pointsGrid}>
                                        {deliveryPoints.map(point => (
                                            <TouchableOpacity
                                                key={point._id}
                                                onPress={() => toggleDeliveryPoint(point._id)}
                                                style={[
                                                    styles.pointChip,
                                                    formData.deliveryPoints.includes(point._id) && styles.pointChipSelected
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.pointChipText,
                                                    formData.deliveryPoints.includes(point._id) && styles.pointChipTextSelected
                                                ]}>
                                                    {formData.deliveryPoints.includes(point._id) ? '✓ ' : '+ '}
                                                    {point.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={styles.footer}>
                                <Button
                                    onPress={handleSubmit}
                                    style={styles.submitBtn}
                                    loading={loading}
                                >
                                    {editingRoute ? 'Update Route' : 'Create Route'}
                                </Button>
                                <TouchableOpacity
                                    style={styles.cancelLink}
                                    onPress={() => navigation.goBack()}
                                >
                                    <Text style={styles.cancelLinkText}>Discard Changes</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
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
    scrollContent: {
        padding: spacing.md,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: borderRadius.xl || 24,
        padding: spacing.lg,
        ...shadows.xl,
        marginTop: spacing.sm,
    },
    iconSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
        borderWidth: 4,
        borderColor: '#fff',
        ...shadows.md,
    },
    iconEmoji: {
        fontSize: 32,
    },
    iconHint: {
        fontSize: 12,
        color: colors.text.tertiary,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    form: {
        gap: spacing.sm,
    },
    stopsSection: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border.light,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    sectionSubtitle: {
        fontSize: 12,
        color: colors.text.tertiary,
        marginBottom: spacing.md,
    },
    pointsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pointChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.tertiary,
        borderWidth: 1,
        borderColor: colors.border.light,
    },
    pointChipSelected: {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary[200],
    },
    pointChipText: {
        fontSize: 13,
        color: colors.text.secondary,
    },
    pointChipTextSelected: {
        color: colors.primary[600],
        fontWeight: 'bold',
    },
    emptyPoints: {
        padding: spacing.lg,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    emptyPointsText: {
        fontSize: 12,
        color: colors.text.tertiary,
        fontStyle: 'italic',
    },
    footer: {
        marginTop: spacing.xl,
        gap: spacing.md,
    },
    submitBtn: {
        paddingVertical: 14,
    },
    cancelLink: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    cancelLinkText: {
        color: colors.text.tertiary,
        fontWeight: '600',
        fontSize: 14,
    },
});

export default ManageRoute;
