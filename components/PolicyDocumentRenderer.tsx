import { useTheme } from "@/theme";
import type { PolicyContent } from "@/utils/policies";
import { StyleSheet, Text, View } from "react-native";

const LEVEL_INDENT = 16;

type PolicyDocumentRendererProps = {
  content: PolicyContent;
};

/**
 * Renders structured legal policy content from the `policies` table JSONB `content` field.
 * Each block has a section title and a flat list of points with `level` (0–2) for visual nesting;
 * marker text (e.g. "(a)", "(i)") is already included in `text`.
 */
export default function PolicyDocumentRenderer({ content }: PolicyDocumentRendererProps) {
  const { colors } = useTheme();

  return (
    <>
      {content.map((block, blockIndex) => (
        <View key={`${block.title}-${blockIndex}`} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{block.title}</Text>
          {block.sections.map((point, pointIndex) => (
            <View
              key={`${blockIndex}-${pointIndex}`}
              style={[
                styles.pointWrap,
                { paddingLeft: Math.max(0, point.level) * LEVEL_INDENT },
              ]}
            >
              <Text style={[styles.pointText, { color: colors.textSecondary }]}>{point.text}</Text>
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    marginBottom: 8,
  },
  pointWrap: {
    marginBottom: 8,
  },
  pointText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 22,
  },
});
