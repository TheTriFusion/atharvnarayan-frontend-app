import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import hi from '../locales/hi.json';

const STORE_LANGUAGE_KEY = 'settings.lang';

const languageDetectorPlugin = {
    type: 'languageDetector' as const,
    async: true,
    init: () => { },
    detect: async function (callback: (lang: string) => void) {
        try {
            const language = await AsyncStorage.getItem(STORE_LANGUAGE_KEY);
            if (language) {
                return callback(language);
            } else {
                return callback('en');
            }
        } catch (error) {
            console.log('Error reading language', error);
            callback('en');
        }
    },
    cacheUserLanguage: async function (language: string) {
        try {
            await AsyncStorage.setItem(STORE_LANGUAGE_KEY, language);
        } catch (error) {
            console.log('Error saving language', error);
        }
    },
};

export const resources = {
    en: { translation: en },
    hi: { translation: hi },
};

i18n
    .use(initReactI18next)
    .use(languageDetectorPlugin)
    .init({
        compatibilityJSON: 'v4',
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
    });

export default i18n;
