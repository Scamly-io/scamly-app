import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

type PersonalStepShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  backLabel?: string;
  showBack?: boolean;
  nextLoading?: boolean;
  nextDisabled?: boolean;
  /** Optional right action (e.g. skip tutorial) */
  headerRight?: ReactNode;
};

export default function PersonalStepShell({
  title,
  subtitle,
  children,
  onBack,
  onNext,
  nextLabel,
  backLabel = "Back",
  showBack = true,
  nextLoading = false,
  nextDisabled = false,
  headerRight,
}: PersonalStepShellProps) {
  const { colors, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const footerPadBottom = Math.max(insets.bottom, 10);

  return (
    <ThemedBackground>
      <SafeAreaView style={{ flex: 1, width: "100%" }} edges={["top", "left", "right"]}>
        {headerRight ? (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              paddingHorizontal: 20,
              paddingTop: 4,
              minHeight: 40,
            }}
          >
            {headerRight}
          </View>
        ) : null}
        <View style={{ flex: 1, minHeight: 0, width: "100%" }}>
        <ScrollView
          style={{ flex: 1, width: "100%" }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 20,
            gap: 20,
          }}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500)}>
            <Text
              style={{
                fontSize: 28,
                fontFamily: "Poppins-Bold",
                color: colors.textPrimary,
                lineHeight: 36,
                marginBottom: 8,
              }}
              selectable
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Poppins-Regular",
                color: colors.textSecondary,
                lineHeight: 24,
                marginBottom: 8,
              }}
              selectable
            >
              {subtitle}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(500).delay(80)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius["2xl"],
              padding: 24,
              ...shadows.lg,
            }}
          >
            {children}
          </Animated.View>
        </ScrollView>
        </View>

        <View
          style={{
            width: "100%",
            maxWidth: "100%",
            alignSelf: "stretch",
            flexShrink: 0,
            flexDirection: "row",
            flexWrap: "nowrap",
            gap: 12,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: footerPadBottom,
            borderTopWidth: 1,
            borderTopColor: colors.divider,
          }}
        >
          {showBack ? (
            <Button onPress={onBack} variant="secondary" size="lg" style={{ flex: 1 }}>
              {backLabel}
            </Button>
          ) : null}
          <Button
            onPress={onNext}
            loading={nextLoading}
            disabled={nextDisabled || nextLoading}
            size="lg"
            style={showBack ? { flex: 1 } : { width: "100%" }}
            fullWidth={!showBack}
          >
            {nextLabel}
          </Button>
        </View>
      </SafeAreaView>
    </ThemedBackground>
  );
}
