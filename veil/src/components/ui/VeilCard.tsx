import { Pressable, View, StyleProp, ViewStyle } from "react-native";
import { colors, borderRadius } from "../../theme/tokens";

interface VeilCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
}

const cardBase: ViewStyle = {
  backgroundColor: colors.surfaceElevated,
  borderRadius: borderRadius.md,
  borderWidth: 1,
  borderColor: colors.border,
  padding: 16,
};

export function VeilCard({ children, style, onPress, testID }: VeilCardProps) {
  if (onPress) {
    return (
      <Pressable testID={testID} style={[cardBase, style]} onPress={onPress}>
        {children}
      </Pressable>
    );
  }

  return <View testID={testID} style={[cardBase, style]}>{children}</View>;
}
