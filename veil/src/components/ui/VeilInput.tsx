import { TextInput, View, Text, ViewStyle } from "react-native";
import { colors, fontSizes, borderRadius } from "../../theme/tokens";

interface VeilInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  onSubmit?: () => void;
  autoFocus?: boolean;
}

export function VeilInput({ value, onChangeText, placeholder, multiline, maxLength, onSubmit, autoFocus }: VeilInputProps) {
  const showCount = maxLength != null && value.length >= maxLength - 20;
  const remaining = maxLength != null ? maxLength - value.length : null;

  const containerStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...(multiline ? { minHeight: 120, maxHeight: 300 } : {}),
  };

  return (
    <View style={{ position: "relative" }}>
      <TextInput
        style={[
          containerStyle,
          {
            color: colors.textPrimary,
            fontSize: fontSizes.base,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        maxLength={maxLength}
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        returnKeyType={multiline ? "default" : "send"}
      />
      {showCount && remaining != null && (
        <Text
          style={{
            position: "absolute",
            bottom: 8,
            right: 12,
            fontSize: fontSizes.xs,
            color: remaining <= 5 ? colors.error : colors.textMuted,
          }}
        >
          {remaining}
        </Text>
      )}
    </View>
  );
}
