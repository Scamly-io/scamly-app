import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { triggerFeedbackWallRefresh } from "@/utils/feedbackWallRefresh";
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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NewFeedbackItem() {
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
        .from("feedback_wall")
        .select("id")
        .eq("user_id", user.id)
        .eq("content_hash", contentHash);

      if (existing && existing.length > 0) {
        Alert.alert(
          "Duplicate",
          "You've already submitted this feedback.",
        );
        setPosting(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();

      const firstName = profile?.first_name ?? "Anonymous";

      const { error } = await supabase
        .from("feedback_wall")
        .insert({
          title: title.trim(),
          description: description.trim(),
          content_hash: contentHash,
          user_id: user.id,
          posted_by: firstName,
        });

      if (error) {
        console.error(error);
        Alert.alert("Error", "Failed to submit your feedback. Please try again.");
        setPosting(false);
        return;
      }

      triggerFeedbackWallRefresh();
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
              Submit Feedback
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Body */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
              placeholder="e.g. Improve scan accuracy"
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
              placeholder="Describe your feedback in more detail..."
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

            <Button
              onPress={handlePost}
              fullWidth
              disabled={!canPost}
              loading={posting}
              style={styles.postButton}
            >
              Post
            </Button>
          </ScrollView>
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
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
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
  postButton: {
    marginTop: 16,
  },
});
