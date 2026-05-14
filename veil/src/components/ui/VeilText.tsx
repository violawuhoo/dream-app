import { Text, TextStyle, StyleProp } from "react-native";
import { colors, fontSizes, lineHeights } from "../../theme/tokens";

type Variant = "display" | "heading" | "body" | "caption" | "muted";

const variantStyles: Record<Variant, TextStyle> = {
  display: {
    fontSize: fontSizes["3xl"],
    lineHeight: fontSizes["3xl"] * lineHeights.tight,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  heading: {
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.tight,
    color: colors.textPrimary,
    fontWeight: "600",
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
  muted: {
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
    color: colors.textMuted,
    opacity: 0.7,
  },
};

interface VeilTextProps {
  variant: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function VeilText({ variant, color, style, children }: VeilTextProps) {
  return (
    <Text style={[variantStyles[variant], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}
