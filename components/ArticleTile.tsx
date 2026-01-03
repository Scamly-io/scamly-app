import { useTheme } from "@/theme";
import { router } from "expo-router";
import { Clock } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type ArticleTileProps = {
  title: string;
  description: string;
  readTime: number;
  image: string;
  slug: string;
  locked?: boolean;
  onPress?: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ArticleTile({
  title,
  description,
  readTime,
  image,
  slug,
  locked = false,
  onPress,
}: ArticleTileProps) {
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
        styles.container,
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
      <Image 
        source={{ uri: image }} 
        style={[styles.image, { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]} 
      />
      <View style={styles.detailsContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {description}
        </Text>
        <View style={[styles.readTimeContainer, { backgroundColor: colors.accentMuted }]}>
          <Clock size={14} color={colors.accent} />
          <Text style={[styles.readTimeText, { color: colors.accent }]}>
            {readTime} min read
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  locked: {
    opacity: 0.45,
  },
  image: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  detailsContainer: {
    padding: 16,
    gap: 8,
  },
  title: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    lineHeight: 22,
  },
  description: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  readTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  readTimeText: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
  },
});
