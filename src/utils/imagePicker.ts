import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { launchCamera, launchImageLibrary, CameraOptions, ImagePickerResponse } from 'react-native-image-picker';

export const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.CAMERA,
                {
                    title: "Camera Permission",
                    message: "App needs camera permission to capture photos.",
                    buttonNeutral: "Ask Me Later",
                    buttonNegative: "Cancel",
                    buttonPositive: "OK"
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn(err);
            return false;
        }
    }
    return true;
};

export const safeLaunchCamera = async (options: CameraOptions, callback: (response: ImagePickerResponse) => void) => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
        Alert.alert("Permission Denied", "Camera permission is required to take photos.");
        return;
    }
    launchCamera(options, callback);
};
