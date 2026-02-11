import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Button from '../../components/common/Button';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const Welcome: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Background Gradient */}
      <LinearGradient
        colors={[colors.primary[600], colors.primary[400], colors.background.primary]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.8 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View /> {/* Spacer for centering branding */}

          {/* Centered Branding Section */}
          <View style={styles.brandingSection}>
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../logo-login.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.appName}>Dairy Connect</Text>
            <View style={styles.separator} />
            <Text style={styles.tagline}>Quality Milk, Every Day</Text>
          </View>

          {/* Buttons Section at Bottom */}
          <View style={styles.footerSection}>
            <View style={styles.buttonContainer}>
              <Button
                onPress={() => navigation.navigate('Login')}
                variant="primary"
                style={styles.loginButton}
                textStyle={styles.loginButtonText}
                size="lg"
              >
                Log In
              </Button>

              <Button
                onPress={() => navigation.navigate('Register')}
                variant="outline"
                style={styles.outlineButton}
                textStyle={styles.outlineButtonText}
                size="lg"
              >
                Create Account
              </Button>
            </View>

            <View style={styles.versionContainer}>
              <Text style={styles.versionText}>Version 2.0.0</Text>
              <Text style={styles.poweredBy}>Powered by AtharvNarayan</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: spacing.xl,
  },
  brandingSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoWrapper: {
    backgroundColor: 'white',
    padding: spacing.lg,
    borderRadius: borderRadius.xl * 2, // Large radius for circular feel
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.xl,
    ...shadows.lg,
  },
  logo: {
    width: 80,
    height: 80,
  },
  welcomeText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[800],
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  appName: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    letterSpacing: 1,
  },
  separator: {
    width: 40,
    height: 3,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
    marginVertical: spacing.md,
  },
  tagline: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  footerSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.sm : spacing.lg,
  },
  buttonContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  loginButton: {
    width: '100%',
    backgroundColor: 'white',
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  loginButtonText: {
    color: colors.primary[600],
  },
  outlineButton: {
    width: '100%',
    borderColor: colors.primary[600],
    borderWidth: 1.5,
  },
  outlineButtonText: {
    color: colors.primary[600],
  },
  versionContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  versionText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.medium,
  },
  poweredBy: {
    fontSize: typography.fontSize.xs - 2,
    color: colors.text.disabled,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default Welcome;

