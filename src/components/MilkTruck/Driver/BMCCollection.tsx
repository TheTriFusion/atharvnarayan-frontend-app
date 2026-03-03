import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Input from '../../common/Input';
import { colors } from '../../../theme/colors';
import { spacing, borderRadius, shadows } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { addBMCCollectionEntry, getMilkTruckTrip } from '../../../utils/storage';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Feather';
import { getImageUrl } from '../../../utils/api';
import { safeLaunchCamera } from '../../../utils/imagePicker';

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
    const [selectedImage, setSelectedImage] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Animation for progress bar
    const progressWidth = useRef(new Animated.Value(0)).current;

    const routeBMCs = route?.bmcSequence || [];

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

    useEffect(() => {
        refreshTrip();
    }, [refreshTrip]);

    const isBMCCollected = useCallback((bmcId: string) => {
        if (!bmcId || !tripData.bmcEntries) return false;
        const entry = tripData.bmcEntries.find((e: any) => {
            const entryBMCId = e.bmcId?._id || e.bmcId?.id || e.bmcId;
            return entryBMCId && entryBMCId.toString() === bmcId.toString();
        });
        return !!(entry && entry.collectionData);
    }, [tripData]);

    const collectedCount = tripData.bmcEntries?.filter((e: any) => e.collectionData).length || 0;
    const progress = routeBMCs.length > 0 ? collectedCount / routeBMCs.length : 0;
    const allCollected = routeBMCs.every((bmc: any) => isBMCCollected(bmc._id || bmc.id));
    const uncollectedBMCs = routeBMCs.filter((bmc: any) => !isBMCCollected(bmc._id || bmc.id));

    useEffect(() => {
        Animated.timing(progressWidth, {
            toValue: progress,
            duration: 800,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    useEffect(() => {
        if (allCollected) {
            const timer = setTimeout(() => {
                onComplete(tripData);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [allCollected, tripData, onComplete]);

    useEffect(() => {
        if (uncollectedBMCs.length > 0 && !selectedBMCId) {
            const nextBMC = uncollectedBMCs[0];
            setSelectedBMCId(nextBMC._id || nextBMC.id);
        }
    }, [uncollectedBMCs, selectedBMCId]);

    const handleSelectBMC = (bmcId: string) => {
        setSelectedBMCId(bmcId);
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
            const imageUrl = getImageUrl(entry.collectionData.image);
            setSelectedImage(imageUrl ? { uri: imageUrl } : null);
        } else {
            setFormData({ milkQuantity: '', fatContent: '', snfContent: '' });
            setSelectedImage(null);
        }
    };

    const handlePickImage = () => {
        Alert.alert(
            'Add Image',
            'Capture entry photo from camera or gallery',
            [
                {
                    text: 'Camera',
                    onPress: () => {
                        safeLaunchCamera({ mediaType: 'photo', quality: 0.7 }, (response) => {
                            if (response.assets && response.assets.length > 0) {
                                setSelectedImage(response.assets[0]);
                            }
                        });
                    },
                },
                {
                    text: 'Gallery',
                    onPress: () => {
                        launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, (response) => {
                            if (response.assets && response.assets.length > 0) {
                                setSelectedImage(response.assets[0]);
                            }
                        });
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleSubmit = async () => {
        if (!selectedBMCId || !formData.milkQuantity || !formData.fatContent || !formData.snfContent) {
            Alert.alert('Incomplete Data', 'Please fill in Quantity, Fat, and SNF to save.');
            return;
        }

        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('bmcId', selectedBMCId);
            fd.append('milkQuantity', formData.milkQuantity);
            fd.append('fatContent', formData.fatContent);
            fd.append('snfContent', formData.snfContent);

            if (selectedImage && selectedImage.uri && !selectedImage.uri.startsWith('http')) {
                fd.append('image', {
                    uri: selectedImage.uri,
                    type: selectedImage.type || 'image/jpeg',
                    name: selectedImage.fileName || `bmc_entry_${Date.now()}.jpg`,
                } as any);
            }

            const updatedTrip = await addBMCCollectionEntry(trip._id || trip.id, fd);
            if (updatedTrip) {
                setTripData(updatedTrip);
                setFormData({ milkQuantity: '', fatContent: '', snfContent: '' });
                setSelectedImage(null);
                setSelectedBMCId('');
                Alert.alert('Saved', 'Collection data recorded successfully.');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save data.');
        } finally {
            setLoading(false);
        }
    };

    const currentBMC = routeBMCs.find((b: any) => (b._id || b.id) === selectedBMCId);

    return (
        <View style={styles.container}>
            {/* Progress Card */}
            <Card variant="elevated" style={styles.progressCard}>
                <View style={styles.progressHeader}>
                    <View>
                        <Text style={styles.pLabel}>OVERALL PROGRESS</Text>
                        <Text style={styles.pSub}>{collectedCount} of {routeBMCs.length} BMCs Collected</Text>
                    </View>
                    <Text style={styles.pPercent}>{Math.round(progress * 100)}%</Text>
                </View>
                <View style={styles.pBarBg}>
                    <Animated.View style={[
                        styles.pBarFill,
                        { width: progressWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }
                    ]}>
                        <LinearGradient colors={[colors.primary[400], colors.primary[600]]} style={styles.pBarGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                    </Animated.View>
                </View>
            </Card>

            {/* BMC Selector */}
            <View style={styles.selectorSection}>
                <Text style={styles.sectionHeading}>SELECT COLLECTION POINT</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    {routeBMCs.map((bmc: any) => {
                        const id = bmc._id || bmc.id;
                        const isSelected = selectedBMCId === id;
                        const isCollected = isBMCCollected(id);

                        return (
                            <TouchableOpacity
                                key={id}
                                activeOpacity={0.8}
                                style={[
                                    styles.chip,
                                    isSelected && styles.chipSelected,
                                    isCollected && styles.chipCollected
                                ]}
                                onPress={() => handleSelectBMC(id)}
                                disabled={isCollected}
                            >
                                <Text style={[
                                    styles.chipText,
                                    isSelected && styles.chipTextSelected,
                                    isCollected && styles.chipTextCollected
                                ]}>{bmc.name}</Text>
                                {isCollected && <Text style={styles.checkIcon}>✓</Text>}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Entry Form */}
            {selectedBMCId && (
                <Card variant="elevated" style={styles.formCard}>
                    <View style={styles.formHeader}>
                        <View style={styles.formIndicator} />
                        <Text style={styles.formTitle}>DATA FOR {currentBMC?.name?.toUpperCase()}</Text>
                    </View>

                    <View style={styles.inputGrid}>
                        <View style={styles.mainInput}>
                            <Input
                                label="Total Milk (L)"
                                value={formData.milkQuantity}
                                onChangeText={(t) => setFormData({ ...formData, milkQuantity: t })}
                                placeholder="0.0"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.sideInputs}>
                            <Input
                                label="Fat %"
                                value={formData.fatContent}
                                onChangeText={(t) => setFormData({ ...formData, fatContent: t })}
                                placeholder="0.0"
                                keyboardType="numeric"
                                containerStyle={styles.halfInput}
                            />
                            <Input
                                label="SNF %"
                                value={formData.snfContent}
                                onChangeText={(t) => setFormData({ ...formData, snfContent: t })}
                                placeholder="0.0"
                                keyboardType="numeric"
                                containerStyle={styles.halfInput}
                            />
                        </View>
                    </View>

                    {/* Image Attachment */}
                    <TouchableOpacity
                        style={[styles.imageUploadBox, selectedImage && styles.imageBoxActive]}
                        onPress={handlePickImage}
                    >
                        {selectedImage ? (
                            <View style={styles.imagePreviewContainer}>
                                <Animated.Image
                                    source={{ uri: selectedImage.uri }}
                                    style={styles.imagePreview}
                                    resizeMode="cover"
                                />
                                <View style={styles.imageOverlay}>
                                    <Text style={styles.imageEditTxt}>Tap to change photo</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.uploadPlaceholder}>
                                <View style={styles.uploadCircle}>
                                    <Icon name="camera" size={24} color={colors.primary[600]} />
                                </View>
                                <Text style={styles.uploadMainTxt}>Attach Entry Slips</Text>
                                <Text style={styles.uploadSubTxt}>Take a photo of the receipt or tank reading</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={[colors.primary[500], colors.primary[700]]}
                            style={styles.btnGradient}
                        >
                            <Text style={styles.btnText}>{loading ? 'SAVING...' : 'CONFIRM COLLECTION'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Card>
            )}

            {allCollected && !selectedBMCId && (
                <View style={styles.doneBox}>
                    <Text style={styles.doneText}>🎉 Route Completed!</Text>
                    <Text style={styles.doneSub}>Synchronizing with dairy central...</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.sm,
    },
    progressCard: {
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    pLabel: {
        fontSize: 10,
        fontWeight: 'black',
        color: colors.text.tertiary,
        letterSpacing: 2,
    },
    pSub: {
        fontSize: 12,
        color: colors.text.primary,
        fontWeight: 'bold',
        marginTop: 2,
    },
    pPercent: {
        fontSize: 24,
        fontWeight: 'black',
        color: colors.primary[700],
    },
    pBarBg: {
        height: 10,
        backgroundColor: colors.background.tertiary,
        borderRadius: 5,
        overflow: 'hidden',
    },
    pBarFill: {
        height: '100%',
        borderRadius: 5,
    },
    pBarGradient: {
        flex: 1,
    },
    selectorSection: {
        marginBottom: spacing.xl,
    },
    sectionHeading: {
        fontSize: 10,
        fontWeight: 'black',
        color: colors.text.tertiary,
        letterSpacing: 1.5,
        marginBottom: spacing.md,
        marginLeft: spacing.xs,
    },
    chipScroll: {
        paddingHorizontal: spacing.xs,
        gap: spacing.sm,
    },
    chip: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        backgroundColor: '#FFFFFF',
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border.light,
        flexDirection: 'row',
        alignItems: 'center',
        ...shadows.sm,
    },
    chipSelected: {
        borderColor: colors.primary[500],
        backgroundColor: colors.primary[50],
    },
    chipCollected: {
        borderColor: colors.success[400],
        backgroundColor: colors.success[50],
        opacity: 0.8,
    },
    chipText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text.secondary,
    },
    chipTextSelected: {
        color: colors.primary[700],
    },
    chipTextCollected: {
        color: colors.success[700],
    },
    checkIcon: {
        marginLeft: 8,
        color: colors.success[600],
        fontWeight: 'bold',
    },
    formCard: {
        padding: spacing.lg,
    },
    formHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    formIndicator: {
        width: 6,
        height: 18,
        backgroundColor: colors.primary[600],
        borderRadius: 3,
        marginRight: spacing.sm,
    },
    formTitle: {
        fontSize: 12,
        fontWeight: 'black',
        color: colors.text.primary,
        letterSpacing: 1,
    },
    inputGrid: {
        marginBottom: spacing.lg,
    },
    mainInput: {
        marginBottom: spacing.sm,
    },
    sideInputs: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    halfInput: {
        flex: 1,
    },
    actionBtn: {
        height: 56,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        ...shadows.md,
    },
    btnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'black',
        letterSpacing: 1.5,
    },
    doneBox: {
        padding: spacing.xl,
        backgroundColor: colors.success[50],
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.success[100],
        marginTop: spacing.md,
    },
    doneText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.success[700],
    },
    doneSub: {
        fontSize: 12,
        color: colors.success[600],
        marginTop: 4,
    },
    imageUploadBox: {
        height: 140,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderColor: colors.border.light,
        borderStyle: 'dashed',
        marginBottom: spacing.xl,
        overflow: 'hidden',
    },
    imageBoxActive: {
        borderStyle: 'solid',
        borderColor: colors.primary[300],
    },
    uploadPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    uploadMainTxt: {
        fontSize: 13,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    uploadSubTxt: {
        fontSize: 10,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    imagePreviewContainer: {
        width: '100%',
        height: '100%',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingVertical: 6,
        alignItems: 'center',
    },
    imageEditTxt: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
});

export default BMCCollection;
