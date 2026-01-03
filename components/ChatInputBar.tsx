import { useTheme } from "@/theme";
import { Send } from "lucide-react-native";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function ChatInputBar({ value, onChangeText, onSend, placeholder, disabled }: Props) {
  const { colors, radius, shadows } = useTheme();
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View
      style={[
        styles.inputContainer,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          ...shadows.md,
        },
      ]}
    >
      <TextInput
        style={[
          styles.input,
          {
            color: colors.textPrimary,
          },
        ]}
        placeholder={placeholder || "Ask Scamly anything..."}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        multiline
        numberOfLines={1}
        blurOnSubmit={false}
        returnKeyType="send"
        onSubmitEditing={canSend ? onSend : undefined}
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          {
            backgroundColor: canSend ? colors.accent : colors.accentMuted,
            borderRadius: radius.md,
          },
        ]}
        onPress={onSend}
        disabled={!canSend}
      >
        <Send size={18} color={canSend ? colors.textInverse : colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 4,
    maxHeight: 120,
  },
  sendButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
});
