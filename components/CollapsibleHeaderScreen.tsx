import ThemedBackground from "@/components/ThemedBackground";
import Header from "@/components/Header";
import { useTheme } from "@/theme";
import React, { ReactNode, useMemo, useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

type CollapsibleHeaderScreenProps = {
  headerProps: Parameters<typeof Header>[0];
  children: ReactNode;
  contentContainerStyle?: ViewStyle;
  showsVerticalScrollIndicator?: boolean;
};

export default function CollapsibleHeaderScreen({
  headerProps,
  children,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
}: CollapsibleHeaderScreenProps) {
  const { colors, shadows } = useTheme();
  const headerHeight = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);
  const scrollY = useSharedValue(0);

  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const isScrollable = contentHeight > containerHeight + 1;

  const animatedHeaderStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      scrollY.value,
      [0, 20],
      [0, 1],
      Extrapolation.CLAMP
    );
    
    return {
      transform: [{ translateY: headerTranslateY.value }],
      shadowOpacity: shadowOpacity * 0.08,
    };
  }, []);

  const TOGGLE_DISTANCE = 16;
  const ANIM_DURATION = 200;

  const scrollHandler = useAnimatedScrollHandler<{
    prevY?: number;
    lastToggleY?: number;
    hidden?: boolean;
  }>({
    onScroll: (e, ctx) => {
      const currentY = Math.max(0, e.contentOffset.y);
      scrollY.value = currentY;

      if (!isScrollable) return;

      // Always show when near top
      if (currentY <= 1) {
        if (ctx.hidden) {
          headerTranslateY.value = withTiming(0, { duration: 160 });
          ctx.hidden = false;
          ctx.lastToggleY = currentY;
        }
        ctx.prevY = currentY;
        return;
      }

      if (ctx.lastToggleY === undefined) ctx.lastToggleY = currentY;
      if (ctx.hidden === undefined) ctx.hidden = false;

      const deltaFromToggle = currentY - ctx.lastToggleY;

      if (!ctx.hidden && deltaFromToggle > TOGGLE_DISTANCE) {
        headerTranslateY.value = withTiming(-headerHeight.value, { duration: ANIM_DURATION });
        ctx.hidden = true;
        ctx.lastToggleY = currentY;
      } else if (ctx.hidden && deltaFromToggle < -TOGGLE_DISTANCE) {
        headerTranslateY.value = withTiming(0, { duration: ANIM_DURATION });
        ctx.hidden = false;
        ctx.lastToggleY = currentY;
      }

      ctx.prevY = currentY;
    },
  });

  const combinedContentContainerStyle = useMemo(() => {
    return [
      styles.contentContainer,
      { paddingTop: measuredHeaderHeight },
      contentContainerStyle,
    ];
  }, [measuredHeaderHeight, contentContainerStyle]);

  return (
    <ThemedBackground>
      <View style={styles.root}>
        <Animated.View
          style={[
            styles.header,
            animatedHeaderStyle,
            {
              backgroundColor: colors.surface,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 12,
              elevation: 4,
            },
          ]}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            setMeasuredHeaderHeight(h);
            headerHeight.value = h;
          }}
        >
          <Header {...headerProps} />
        </Animated.View>

        <Animated.ScrollView
          onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
          onContentSizeChange={(_, h) => setContentHeight(h)}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          contentContainerStyle={combinedContentContainerStyle as any}
        >
          {children}
        </Animated.ScrollView>
      </View>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  contentContainer: {
    paddingHorizontal: 0,
  },
});
