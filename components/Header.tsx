import { LinearGradient } from "expo-linear-gradient";
import { Image, ImageSourcePropType, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type HeaderProps = {
    title?: string;
    imageUrl?: ImageSourcePropType;
    subtitle?: string;
}

export default function Header({ title, imageUrl, subtitle }: HeaderProps) {

    return (
        <LinearGradient
            colors={["#FA5958", "#F5658F", "#FDB653"]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.headerContainer}
        >
            <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{title}</Text>
                    <Image source={imageUrl} style={styles.headerImage} />
                </View>
                <Text style={styles.headerSubtitle}>{subtitle}</Text>
            </SafeAreaView>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    headerContainer: {
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        overflow: "hidden",
    },
    safeArea: {
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    headerTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 40,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: "Poppins-Bold",
        color: "white",
    },
    headerImage: {
        width: 52,
        height: 52,
    },
    headerSubtitle: {
        fontSize: 16,
        fontFamily: "Poppins-Medium",
        color: "white",
        includeFontPadding: false,
        textAlignVertical: "center",
        marginBottom: 10,
    },
})