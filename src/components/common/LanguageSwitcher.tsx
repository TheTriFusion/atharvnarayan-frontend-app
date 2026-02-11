import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const slideAnim = useRef(new Animated.Value(language === 'en' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: language === 'en' ? 0 : 1,
      duration: 300,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      useNativeDriver: false,
    }).start();
  }, [language]);

  const toggleLanguage = async () => {
    const newLang = language === 'en' ? 'hi' : 'en';
    await setLanguage(newLang);
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 42], // Adjusted based on button width
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={toggleLanguage}
        activeOpacity={0.9}
        style={styles.toggleTrack}
      >
        <Animated.View style={[styles.togglePill, { transform: [{ translateX }] }]} />
        <View style={styles.labelsContainer}>
          <Text style={[styles.label, language === 'en' && styles.activeLabel]}>EN</Text>
          <Text style={[styles.label, language === 'hi' && styles.activeLabel]}>HI</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTrack: {
    width: 84,
    height: 36,
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.full,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.primary[200],
    ...shadows.sm,
  },
  togglePill: {
    position: 'absolute',
    width: 38,
    height: 30,
    backgroundColor: 'white',
    borderRadius: borderRadius.full,
    ...shadows.md,
  },
  labelsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[400],
    width: 38,
    textAlign: 'center',
  },
  activeLabel: {
    color: colors.primary[600],
  },
});

export default LanguageSwitcher;
