import { useTheme } from "@/theme";
import { Image, type ImageLoadEventData } from "expo-image";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Swiper from "react-native-deck-swiper";

type Props = {
  imageUrls: string[];
};

/** Scale intrinsic size down so width ≤ maxW and height ≤ maxH; never upscale. */
function layoutImage(nw: number, nh: number, maxW: number, maxH: number): { w: number; h: number } {
  if (nw <= 0 || nh <= 0) return { w: maxW, h: Math.round(maxW * 0.75) };
  const scale = Math.min(1, maxW / nw, maxH / nh);
  return { w: Math.round(nw * scale), h: Math.round(nh * scale) };
}

/**
 * Single image: intrinsic aspect ratio, capped by width (≤70% screen) and a tall preview cap.
 * Multiple: deck swiper (`infinite`) inside the same max bounds with `contain` per card.
 */
const ChatImageStack = memo(function ChatImageStack({ imageUrls }: Props) {
  const { colors, radius } = useTheme();
  const { width: winW, height: winH } = useWindowDimensions();
  const maxPreviewW = Math.round(winW * 0.7);
  const maxPreviewH = Math.round(Math.min(winH * 0.55, maxPreviewW * 1.45));

  const shellStyle = useMemo(
    () =>
      ({
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        overflow: "hidden" as const,
        backgroundColor: colors.surfaceElevated,
      }) as const,
    [colors.border, colors.surfaceElevated, radius.lg]
  );

  const cardStyle = useMemo(
    () => ({
      width: maxPreviewW,
      height: maxPreviewH,
      top: 0,
      left: 0,
      borderRadius: radius.lg,
    }),
    [maxPreviewH, maxPreviewW, radius.lg]
  );

  const [singleDims, setSingleDims] = useState<{ w: number; h: number } | null>(null);
  const singleUri = imageUrls[0];

  useEffect(() => {
    setSingleDims(null);
  }, [singleUri]);

  const onSingleLoad = useCallback(
    (e: ImageLoadEventData) => {
      const nw = e.source?.width ?? 0;
      const nh = e.source?.height ?? 0;
      if (nw > 0 && nh > 0) {
        setSingleDims(layoutImage(nw, nh, maxPreviewW, maxPreviewH));
      }
    },
    [maxPreviewH, maxPreviewW]
  );

  if (imageUrls.length === 0) return null;

  if (imageUrls.length === 1) {
    const w = singleDims?.w ?? maxPreviewW;
    const h = singleDims?.h ?? Math.round(maxPreviewW * 0.75);

    return (
      <View style={[styles.singleWrap, shellStyle, { width: w, height: h }]}>
        <Image
          source={{ uri: singleUri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          onLoad={onSingleLoad}
          accessibilityLabel="Attached image"
        />
      </View>
    );
  }

  return (
    <View style={[styles.deckHost, { width: maxPreviewW, height: maxPreviewH }]}>
      <Swiper
        cards={imageUrls}
        cardIndex={0}
        keyExtractor={(u: string) => u}
        renderCard={(url: string) => (
          <View style={[styles.cardInner, shellStyle]}>
            <Image
              source={{ uri: url }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              accessibilityLabel="Attached image"
            />
          </View>
        )}
        backgroundColor="transparent"
        stackSize={Math.min(3, imageUrls.length)}
        infinite
        verticalSwipe={false}
        showSecondCard={imageUrls.length > 1}
        marginTop={0}
        marginBottom={0}
        cardVerticalMargin={0}
        cardHorizontalMargin={0}
        cardStyle={cardStyle}
        containerStyle={styles.swiperContainer}
        horizontalSwipe
        disableTopSwipe
        disableBottomSwipe
        horizontalThreshold={maxPreviewW / 5}
        swipeAnimationDuration={220}
        stackSeparation={8}
        stackScale={6}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  singleWrap: {
    marginBottom: 8,
    alignSelf: "flex-end",
  },
  deckHost: {
    marginBottom: 8,
    alignSelf: "flex-end",
    overflow: "hidden",
  },
  swiperContainer: {
    flex: 1,
  },
  cardInner: {
    flex: 1,
    borderRadius: 14,
  },
});

export default ChatImageStack;
