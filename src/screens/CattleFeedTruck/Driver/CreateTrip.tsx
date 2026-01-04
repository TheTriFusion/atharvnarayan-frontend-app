import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { cattleFeedTruckAPI } from '../../../utils/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
// import { ArrowLeft, Check, Truck, MapPin, Gauge } from 'lucide-react-native';

const CreateTrip: React.FC = () => {
    const navigation = useNavigation<any>();
    const [step, setStep] = useState(1);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Data State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        from: '',
        to: '',
        vehicleId: '',
        startKm: '',
        average: '',
        distance: '',
        oil: '',
        diesel: '',
        helperName: '',
        advance: '',
    });

    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [newDelivery, setNewDelivery] = useState({
        location: '',
        bags: '',
        feedType: 'Cattle Feed',
        receiverName: '',
        receiverPhone: ''
    });

    useEffect(() => {
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const response = await cattleFeedTruckAPI.getVehicles();
            console.log('Vehicles response:', response);
            if (Array.isArray(response)) {
                setVehicles(response);
            } else if (response && response.data && Array.isArray(response.data)) {
                setVehicles(response.data);
            } else {
                setVehicles([]);
            }
        } catch (error) {
            console.error('Error fetching vehicles:', error);
            Alert.alert('Error', 'Failed to fetch vehicles');
        } finally {
            setLoading(false);
        }
    };

    const validateStep = () => {
        if (step === 1) {
            if (!formData.from || !formData.to || !formData.vehicleId) {
                Alert.alert('Required', 'Please fill in From, To and Vehicle');
                return false;
            }
        } else if (step === 2) {
            if (!formData.startKm) {
                Alert.alert('Required', 'Please enter Start KM');
                return false;
            }
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep()) setStep(s => s + 1);
    };

    const prevStep = () => setStep(s => s - 1);

    const addDelivery = () => {
        if (!newDelivery.location || !newDelivery.bags) {
            Alert.alert('Required', 'Location and Bags are required');
            return;
        }
        setDeliveries([...deliveries, { ...newDelivery }]);
        setNewDelivery({
            location: '',
            bags: '',
            feedType: 'Cattle Feed',
            receiverName: '',
            receiverPhone: ''
        });
    };

    const removeDelivery = (index: number) => {
        const updated = [...deliveries];
        updated.splice(index, 1);
        setDeliveries(updated);
    };

    const handleCreateTrip = async () => {
        try {
            setLoading(true);

            const validDeliveries = deliveries.map(d => ({
                location: d.location,
                receiverName: d.receiverName || undefined,
                receiverPhone: d.receiverPhone || undefined,
                plannedDelivery: {
                    feedItems: [{
                        feedType: d.feedType,
                        quantity: Number(d.bags),
                        unit: 'bags'
                    }]
                }
            }));

            const payload = {
                ...formData,
                deliveryEntries: validDeliveries,
                totalBags: deliveries.reduce((sum, d) => sum + Number(d.bags), 0),
                status: 'in_transit',
                startTime: new Date()
            };

            await cattleFeedTruckAPI.createTrip(payload);
            Alert.alert('Success', 'Trip started successfully!');
            navigation.navigate('CattleFeedTruckDriverActiveTrip');
        } catch (error: any) {
            console.error('Error creating trip:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to start trip');
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <View style={styles.stepContainer}>
                        <View style={[styles.infoBox, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}>
                            <Text style={[styles.infoTitle, { color: '#1e40af' }]}>Route & Vehicle</Text>
                            <Text style={[styles.infoText, { color: '#2563eb' }]}>Select your route and assigned vehicle.</Text>
                        </View>

                        <Input
                            label="Trip Date"
                            value={formData.date}
                            onChangeText={t => setFormData({ ...formData, date: t })}
                            placeholder="YYYY-MM-DD"
                        />

                        <Select
                            label="Select Vehicle *"
                            value={formData.vehicleId}
                            onChange={v => setFormData({ ...formData, vehicleId: v as string })}
                            options={[
                                { label: loading ? 'Loading...' : vehicles.length === 0 ? 'No vehicles found' : 'Select Vehicle', value: '' },
                                ...vehicles.map(v => ({
                                    label: `${v.registrationNumber} ${v.vehicleType ? `(${v.vehicleType})` : ''}`,
                                    value: v._id
                                }))
                            ]}
                        />

                        <Input
                            label="From Location *"
                            value={formData.from}
                            onChangeText={t => setFormData({ ...formData, from: t })}
                        />

                        <Input
                            label="To Location *"
                            value={formData.to}
                            onChangeText={t => setFormData({ ...formData, to: t })}
                        />
                    </View>
                );
            case 2:
                return (
                    <View style={styles.stepContainer}>
                        <View style={[styles.infoBox, { backgroundColor: '#eef2ff', borderColor: '#e0e7ff' }]}>
                            <Text style={[styles.infoTitle, { color: '#3730a3' }]}>Trip Metrics</Text>
                            <Text style={[styles.infoText, { color: '#4f46e5' }]}>Enter initial meter reading and details.</Text>
                        </View>

                        <View style={styles.row}>
                            <Input
                                label="Start KM *"
                                value={formData.startKm}
                                onChangeText={t => setFormData({ ...formData, startKm: t })}
                                keyboardType="numeric"
                                containerStyle={styles.halfInput}
                            />
                            <Input
                                label="Exp. Avg (KMPL)"
                                value={formData.average}
                                onChangeText={t => setFormData({ ...formData, average: t })}
                                keyboardType="numeric"
                                containerStyle={styles.halfInput}
                            />
                        </View>

                        <Input
                            label="Est. Distance (KM)"
                            value={formData.distance}
                            onChangeText={t => setFormData({ ...formData, distance: t })}
                            keyboardType="numeric"
                        />

                        <View style={styles.row}>
                            <Input
                                label="Oil (L)"
                                value={formData.oil}
                                onChangeText={t => setFormData({ ...formData, oil: t })}
                                keyboardType="numeric"
                                containerStyle={styles.halfInput}
                            />
                            <Input
                                label="Diesel (L)"
                                value={formData.diesel}
                                onChangeText={t => setFormData({ ...formData, diesel: t })}
                                keyboardType="numeric"
                                containerStyle={styles.halfInput}
                            />
                        </View>

                        <Input
                            label="Advance Payment (₹)"
                            value={formData.advance}
                            onChangeText={t => setFormData({ ...formData, advance: t })}
                            keyboardType="numeric"
                        />

                        <Input
                            label="Helper Name"
                            value={formData.helperName}
                            onChangeText={t => setFormData({ ...formData, helperName: t })}
                        />
                    </View>
                );
            case 3:
                return (
                    <View style={styles.stepContainer}>
                        <View style={[styles.infoBox, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
                            <Text style={[styles.infoTitle, { color: '#166534' }]}>Delivery Plan</Text>
                            <Text style={[styles.infoText, { color: '#16a34a' }]}>Add all planned stops.</Text>
                        </View>

                        <Card style={styles.addStopCard}>
                            <Text style={styles.cardTitle}>Add New Stop</Text>
                            <Input
                                placeholder="Location / Shop Name *"
                                value={newDelivery.location}
                                onChangeText={t => setNewDelivery({ ...newDelivery, location: t })}
                            />
                            <View style={styles.row}>
                                <Input
                                    placeholder="Bags *"
                                    value={newDelivery.bags}
                                    onChangeText={t => setNewDelivery({ ...newDelivery, bags: t })}
                                    keyboardType="numeric"
                                    containerStyle={[styles.halfInput, { flex: 0.4 }]}
                                />
                                <Select
                                    label=""
                                    value={newDelivery.feedType}
                                    onChange={v => setNewDelivery({ ...newDelivery, feedType: v as string })}
                                    options={['Cattle Feed', 'Poultry Feed', 'Supplements'].map(f => ({ label: f, value: f }))}
                                    containerStyle={{ flex: 0.6, marginTop: 0 }}
                                />
                            </View>
                            <Input
                                placeholder="Receiver Name (Optional)"
                                value={newDelivery.receiverName}
                                onChangeText={t => setNewDelivery({ ...newDelivery, receiverName: t })}
                            />
                            <Button onPress={addDelivery} variant="secondary" style={{ marginTop: 8 }}>
                                + Add Stop
                            </Button>
                        </Card>

                        <ScrollView style={styles.stopsList}>
                            {deliveries.map((d, i) => (
                                <View key={i} style={styles.stopItem}>
                                    <View>
                                        <Text style={styles.stopLocation}>{d.location}</Text>
                                        <Text style={styles.stopDetails}>{d.bags} bags • {d.feedType}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removeDelivery(i)}>
                                        <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {deliveries.length === 0 && (
                                <Text style={styles.emptyText}>No stops added yet.</Text>
                            )}
                        </ScrollView>
                    </View>
                );
            case 4:
                const vehicle = vehicles.find(v => v._id === formData.vehicleId);
                return (
                    <View style={styles.stepContainer}>
                        <View style={[styles.infoBox, { backgroundColor: '#fefce8', borderColor: '#fef9c3' }]}>
                            <Text style={[styles.infoTitle, { color: '#854d0e', fontSize: 18 }]}>Ready to Start?</Text>
                            <Text style={[styles.infoText, { color: '#a16207' }]}>Please review details before starting.</Text>
                        </View>

                        <Card>
                            <View style={styles.reviewRow}>
                                <Text style={styles.reviewLabel}>Route</Text>
                                <Text style={styles.reviewValue}>{formData.from} ➝ {formData.to}</Text>
                            </View>
                            <View style={styles.reviewRow}>
                                <Text style={styles.reviewLabel}>Vehicle</Text>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.reviewValue}>{vehicle?.registrationNumber || 'N/A'}</Text>
                                    <Text style={styles.reviewSub}>Start KM: {formData.startKm}</Text>
                                </View>
                            </View>
                            <View style={styles.reviewRow}>
                                <Text style={styles.reviewLabel}>Total Stops</Text>
                                <Text style={[styles.reviewValue, { color: '#2563eb' }]}>{deliveries.length} Locations</Text>
                            </View>
                            <View style={[styles.reviewRow, { borderBottomWidth: 0 }]}>
                                <Text style={styles.reviewLabel}>Total Load</Text>
                                <Text style={[styles.reviewValue, { color: '#16a34a', fontSize: 18 }]}>
                                    {deliveries.reduce((sum, d) => sum + Number(d.bags), 0)} Bags
                                </Text>
                            </View>
                        </Card>
                    </View>
                );
            default: return null;
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Start New Trip</Text>
            </View>

            {/* Progress Steps */}
            <View style={styles.progressContainer}>
                {[1, 2, 3, 4].map((s) => (
                    <View key={s} style={styles.progressStep}>
                        <View style={[
                            styles.stepCircle,
                            s <= step ? styles.stepActive : styles.stepInactive
                        ]}>
                            <Text style={[styles.stepText, s <= step ? { color: '#fff' } : { color: '#9ca3af' }]}>
                                {s < step ? '✓' : s}
                            </Text>
                        </View>
                        {s < 4 && (
                            <View style={[
                                styles.stepLine,
                                { backgroundColor: s < step ? '#2563eb' : '#e5e7eb' }
                            ]} />
                        )}
                    </View>
                ))}
            </View>
            <View style={styles.stepLabels}>
                <Text style={[styles.stepLabel, step >= 1 ? styles.textActive : styles.textInactive]}>Route</Text>
                <Text style={[styles.stepLabel, step >= 2 ? styles.textActive : styles.textInactive]}>Metrics</Text>
                <Text style={[styles.stepLabel, step >= 3 ? styles.textActive : styles.textInactive]}>Plan</Text>
                <Text style={[styles.stepLabel, step >= 4 ? styles.textActive : styles.textInactive]}>Review</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {renderStepContent()}
            </ScrollView>

            <View style={styles.footer}>
                {step > 1 ? (
                    <Button onPress={prevStep} variant="secondary" style={{ flex: 1, marginRight: 8 }}>
                        Back
                    </Button>
                ) : (
                    <Button onPress={() => navigation.goBack()} variant="secondary" style={{ flex: 1, marginRight: 8 }}>
                        Cancel
                    </Button>
                )}

                {step < 4 ? (
                    <Button onPress={nextStep} style={{ flex: 2 }}>
                        Next Step →
                    </Button>
                ) : (
                    <Button onPress={handleCreateTrip} style={{ flex: 2, backgroundColor: '#16a34a' }}>
                        Start Trip
                    </Button>
                )}
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 16,
    },
    backButtonText: {
        color: '#6b7280',
        fontSize: 14,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        paddingHorizontal: 40,
    },
    progressStep: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    stepActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    stepInactive: {
        backgroundColor: '#fff',
        borderColor: '#e5e7eb',
    },
    stepText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    stepLine: {
        width: 40,
        height: 2,
        marginHorizontal: 4,
    },
    stepLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 30,
        marginTop: 8,
        marginBottom: 16,
    },
    stepLabel: {
        fontSize: 12,
        fontWeight: '600',
        width: 50,
        textAlign: 'center',
    },
    textActive: { color: '#2563eb' },
    textInactive: { color: '#9ca3af' },
    content: {
        padding: 16,
        paddingBottom: 100,
    },
    stepContainer: {
        flex: 1,
    },
    infoBox: {
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 20,
    },
    infoTitle: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 12,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfInput: {
        flex: 1,
    },
    addStopCard: {
        padding: 16,
        marginBottom: 16,
    },
    cardTitle: {
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#374151',
    },
    stopsList: {
        maxHeight: 300,
    },
    stopItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    stopLocation: {
        fontWeight: 'bold',
        color: '#111827',
    },
    stopDetails: {
        fontSize: 12,
        color: '#6b7280',
    },
    emptyText: {
        textAlign: 'center',
        color: '#9ca3af',
        fontStyle: 'italic',
        marginTop: 20,
    },
    reviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    reviewLabel: {
        color: '#6b7280',
        fontWeight: '500',
    },
    reviewValue: {
        fontWeight: 'bold',
        color: '#111827',
    },
    reviewSub: {
        fontSize: 10,
        color: '#9ca3af',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        flexDirection: 'row',
    },
});

export default CreateTrip;
