// UI Helper utilities for consistent styling across the app
import { colors } from '../theme/colors';
import { spacing, borderRadius, shadows } from '../theme/spacing';
import { typography } from '../theme/typography';
import { ViewStyle, TextStyle } from 'react-native';

/**
 * Common screen container style
 */
export const screenContainer: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background.secondary,
};

/**
 * Common content container style
 */
export const contentContainer: ViewStyle = {
  padding: spacing.lg,
};

/**
 * Common card style
 */
export const cardStyle: ViewStyle = {
  marginBottom: spacing.md,
};

/**
 * Common section title style
 */
export const sectionTitle: TextStyle = {
  fontSize: typography.fontSize.xl,
  fontWeight: typography.fontWeight.bold,
  color: colors.text.primary,
  marginBottom: spacing.md,
  letterSpacing: -0.3,
};

/**
 * Common empty state style
 */
export const emptyStateContainer: ViewStyle = {
  alignItems: 'center',
  paddingVertical: spacing.xxl,
  paddingHorizontal: spacing.lg,
};

/**
 * Common stat card style
 */
export const statCardStyle = (bgColor: string): ViewStyle => ({
  flex: 1,
  padding: 0,
  overflow: 'hidden',
  borderRadius: borderRadius.lg,
});

/**
 * Common stat card inner style
 */
export const statCardInner = (bgColor: string): ViewStyle => ({
  padding: spacing.lg,
  alignItems: 'center',
  borderRadius: borderRadius.lg,
  backgroundColor: bgColor,
});

/**
 * Common list item style
 */
export const listItemStyle: ViewStyle = {
  backgroundColor: colors.background.primary,
  padding: spacing.md,
  borderRadius: borderRadius.md,
  marginBottom: spacing.sm,
  ...shadows.sm,
  borderWidth: 1,
  borderColor: colors.border.light,
};

/**
 * Common button container style
 */
export const buttonContainer: ViewStyle = {
  marginTop: spacing.md,
  marginBottom: spacing.md,
};

/**
 * Common form container style
 */
export const formContainer: ViewStyle = {
  gap: spacing.md,
};

/**
 * Common header style
 */
export const headerStyle: ViewStyle = {
  backgroundColor: colors.background.primary,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.lg,
  paddingBottom: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border.light,
};

