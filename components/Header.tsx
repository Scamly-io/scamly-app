import { LinearGradient } from "expo-linear-gradient";
import { Image, ImageSourcePropType, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type HeaderProps = {
    title: string;
    imageUrl?: ImageSourcePropType;
    subtitle?: string;
    basicHeader?: boolean;
}

export default function Header({ title, imageUrl, subtitle, basicHeader = false }: HeaderProps) {

    return (
        <LinearGradient
            colors={["#FA5958", "#F5658F", "#FDB653"]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.headerContainer}
        >
            <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
                {basicHeader ? (
                    <View style={styles.basicHeaderContent}>
                        <View style={styles.basicHeaderTitleContainer}>
                            <Text style={styles.headerTitle}>{title}</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.headerContent}>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>{title}</Text>
                            <Text style={styles.headerSubtitle}>{subtitle}</Text>
                        </View>
                        <Image source={imageUrl} style={styles.headerImage} />
                    </View>
                )}
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
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    basicHeaderContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    headerTitleContainer: {
        flexDirection: "column",
        alignItems: "flex-start",
        maxWidth: "75%",
    },
    basicHeaderTitleContainer: {
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: "Poppins-Bold",
        color: "white",
    },
    headerImage: {
        width: 82,
        height: 82,
        resizeMode: "contain",
    },
    headerSubtitle: {
        fontSize: 16,
        fontFamily: "Poppins-Medium",
        color: "white",
    },
})