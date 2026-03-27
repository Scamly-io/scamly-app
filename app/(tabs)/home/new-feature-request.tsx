import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { supabase } from "@/utils/supabase";
import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NewFeatureRequest() {
  const { colors, radius } = useTheme();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [posting, setPosting] = useState(false);

  const canPost = title.trim().length > 0 && description.trim().length > 0;

  const handlePost = async () => {
    if (!user || !canPost) return;

    setPosting(true);
    try {
      const normalizedForHash = `${title.trim()}${description.trim()}`
        .toLowerCase()
        .replace(/\s+/g, "");
      const contentHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        normalizedForHash,
      );

      const { data: existing } = await supabase
        .from("feature_wall")
        .select("id")
        .eq("user_id", user.id)
        .eq("content_hash", contentHash);

      if (existing && existing.length > 0) {
        Alert.alert(
          "Duplicate Request",
          "You've already posted this feature request.",
        );
        setPosting(false);
        return;
      }

      const { error } = await supabase
        .from("feature_wall")
        .insert({
          title: title.trim(),
          description: description.trim(),
          content_hash: contentHash,
          user_id: user.id,
        });

      if (error) {
        console.error(error);
        Alert.alert("Error", "Failed to post your feature request. Please try again.");
        setPosting(false);
        return;
      }

      router.back();
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
      setPosting(false);
    }
  };

  return (
    <ThemedBackground>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={styles.backButton}
            >
              <ArrowLeft size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Request a new feature
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Title
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                },
              ]}
              placeholder="e.g. Dark mode support"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              autoFocus
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>
              {title.length}/80
            </Text>

            <Text style={[styles.label, styles.descriptionLabel, { color: colors.textSecondary }]}>
              Description
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.descriptionInput,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                },
              ]}
              placeholder="Describe your feature request in more detail..."
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={200}
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>
              {description.length}/200
            </Text>
          </View>

          {/* Bottom */}
          <View
            style={[
              styles.bottomBar,
              { borderTopColor: colors.divider, backgroundColor: colors.background },
            ]}
          >
            <SafeAreaView edges={["bottom"]}>
              <Button
                onPress={handlePost}
                fullWidth
                disabled={!canPost}
                loading={posting}
              >
                Post
              </Button>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 32,
    alignItems: "flex-start",
  },
  headerTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 17,
    textAlign: "center",
  },
  headerSpacer: {
    width: 32,
  },
  body: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontFamily: "Poppins-Medium",
    fontSize: 15,
    marginBottom: 12,
  },
  input: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    lineHeight: 22,
    borderWidth: 1.5,
    padding: 16,
    minHeight: 56,
  },
  descriptionLabel: {
    marginTop: 16,
  },
  descriptionInput: {
    minHeight: 160,
  },
  charCount: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    textAlign: "right",
    marginTop: 8,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
