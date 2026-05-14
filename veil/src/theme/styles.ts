import { StyleSheet } from 'react-native';
import { colors, fontSizes, lineHeights, borderRadius } from './tokens';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: {
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.tight,
    color: colors.textPrimary,
  },
  body: {
    fontSize: fontSizes.base,
    lineHeight: fontSizes.base * lineHeights.normal,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
    color: colors.textMuted,
  },
});
