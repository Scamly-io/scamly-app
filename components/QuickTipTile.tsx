import { useTheme } from "@/theme";
import { router } from "expo-router";
import * as Icons from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type QuickTipsTileProps = {
  slug: string;
  title: string;
  description?: string;
  icon: string;
  iconColour: string;
  iconBackground: string;
  readMoreVisible: boolean;
  locked?: boolean;
  onPress?: () => void;
};

type DynamicIconProps = {
  name: string;
  color: string;
  size: number;
};

function DynamicIcon({ name, size = 24, color }: DynamicIconProps) {
  const IconComponent = (Icons as Record<string, any>)[name];

  if (!IconComponent) {
    return <Icons.HelpCircle size={size} color={color} />;
  }

  return <IconComponent size={size} color={color} />;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function QuickTipTile({
  slug,
  title,
  description,
  icon,
  iconColour,
  iconBackground,
  readMoreVisible,
  locked = false,
  onPress,
}: QuickTipsTileProps) {
  const { colors, shadows, radius } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!locked) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      style={[
        styles.quickTipsItem,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          ...shadows.md,
        },
        locked && styles.locked,
        animatedStyle,
      ]}
      onPress={onPress ?? (() => router.push(`/learn/${slug}`))}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={locked}
    >
      <View style={styles.quickTipsItemContent}>
        <Text style={[styles.quickTipsItemTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {title}
        </Text>
        {readMoreVisible && (
          <View style={styles.quickTipsItemButton}>
            <Text style={[styles.quickTipsItemButtonText, { color: colors.accent }]}>
              Read More
            </Text>
            <Icons.ChevronRight size={16} color={colors.accent} />
          </View>
        )}
      </View>
      <View style={[styles.quickTipsItemIcon, { backgroundColor: iconBackground }]}>
        <DynamicIcon name={icon} size={22} color={iconColour} />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  quickTipsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: 16,
  },
  locked: {
    opacity: 0.45,
  },
  quickTipsItemContent: {
    flex: 1,
    gap: 8,
  },
  quickTipsItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTipsItemTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
    lineHeight: 21,
  },
  quickTipsItemButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quickTipsItemButtonText: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
  },
});
