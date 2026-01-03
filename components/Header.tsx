import { useTheme } from "@/theme";
import { Image, ImageSourcePropType, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type HeaderProps = {
  title: string;
  imageUrl?: ImageSourcePropType;
  subtitle?: string;
  basicHeader?: boolean;
};

export default function Header({ title, imageUrl, subtitle, basicHeader = false }: HeaderProps) {
  const { colors, isDark, spacing } = useTheme();

  const headerBackground = isDark 
    ? colors.surfaceElevated 
    : colors.surface;

  return (
    <View style={[styles.headerContainer, { backgroundColor: headerBackground }]}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        {basicHeader ? (
          <View style={styles.basicHeaderContent}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
          </View>
        ) : (
          <View style={styles.headerContent}>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
              {subtitle && (
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  {subtitle}
                </Text>
              )}
            </View>
            {imageUrl && (
              <View style={[styles.imageContainer, { backgroundColor: colors.accentMuted }]}>
                <Image source={imageUrl} style={styles.headerImage} />
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
      <View style={[styles.headerBorder, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  safeArea: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  basicHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },
  headerTitleContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    flex: 1,
    paddingRight: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Poppins-Bold",
  },
  headerImage: {
    width: 56,
    height: 56,
    resizeMode: "contain",
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    marginTop: 2,
  },
  headerBorder: {
    height: 1,
    marginHorizontal: 20,
  },
});
