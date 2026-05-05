import Card from "@/components/Card";
import { useTheme } from "@/theme";
import { Upload } from "lucide-react-native";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  /** Selected library image, or null for dashed placeholder. */
  imageUri: string | null;
  aspectRatio: number;
  onPickImage: () => void;
  onClear: () => void;
  /** Disables tapping the placeholder (e.g. quota reached). */
  pickDisabled?: boolean;
  /** Optional overlay when `pickDisabled` (lock icon rendered by parent slot). */
  disabledOverlay?: ReactNode;
  /** e.g. iOS “Enable Quick Scan” row above the upload area. */
  topSlot?: ReactNode;
};

/**
 * Idle-state upload card shared by the Scan tab and onboarding first scan.
 */
export default function ScanUploadCard({
  imageUri,
  aspectRatio,
  onPickImage,
  onClear,
  pickDisabled,
  disabledOverlay,
  topSlot,
}: Props) {
  const { colors, radius } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        uploadCard: {
          marginBottom: 16,
        },
        topActionsRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        },
        uploadedImageContainer: {
          alignItems: "center",
          gap: 16,
        },
        uploadedImage: {
          width: "100%",
          maxHeight: 300,
          borderRadius: radius.lg,
        },
        clearButtonText: {
          fontFamily: "Poppins-SemiBold",
          fontSize: 15,
          color: colors.error,
        },
        uploadPlaceholder: {
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          borderWidth: 2,
          borderStyle: "dashed",
          gap: 12,
          position: "relative",
          overflow: "hidden",
          borderColor: colors.border,
          backgroundColor: colors.backgroundSecondary,
          borderRadius: radius.xl,
        },
        uploadIconContainer: {
          width: 64,
          height: 64,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
          backgroundColor: colors.accentMuted,
        },
        uploadTitle: {
          fontFamily: "Poppins-SemiBold",
          fontSize: 17,
          textAlign: "center",
          color: colors.textPrimary,
        },
        uploadSubtitle: {
          fontFamily: "Poppins-Regular",
          fontSize: 14,
          textAlign: "center",
          color: colors.textSecondary,
        },
        uploadOverlay: {
          ...StyleSheet.absoluteFillObject,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 20,
          backgroundColor: "rgba(0,0,0,0.6)",
        },
      }),
    [colors, radius.lg, radius.xl]
  );

  return (
    <Card style={styles.uploadCard} pressable={false}>
      {topSlot ? <View style={styles.topActionsRow}>{topSlot}</View> : null}
      {imageUri ? (
        <View style={styles.uploadedImageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={[styles.uploadedImage, { aspectRatio }]}
            resizeMode="contain"
          />
          <TouchableOpacity onPress={onClear}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadPlaceholder}
          onPress={onPickImage}
          disabled={pickDisabled}
        >
          <View style={styles.uploadIconContainer}>
            <Upload size={28} color={colors.accent} />
          </View>
          <Text style={styles.uploadTitle}>Upload a Screenshot</Text>
          <Text style={styles.uploadSubtitle}>Tap to select an image</Text>
          {pickDisabled && disabledOverlay ? <View style={styles.uploadOverlay}>{disabledOverlay}</View> : null}
        </TouchableOpacity>
      )}
    </Card>
  );
}
