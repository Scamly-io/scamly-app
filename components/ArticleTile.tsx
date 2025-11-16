import { Clock } from "lucide-react-native";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ArticleTileProps = {
    title: string;
    description: string;
    readTime: number;
    image: string;
    slug: string;
}

export default function ArticleTile({ title, description, readTime, image, slug }: ArticleTileProps) {
    return (
        <TouchableOpacity style={styles.container} onPress={() => router.push(`/learn/${slug}`)}>
            <Image source={{ uri: image }} style={styles.image} />
            <View style={styles.detailsContainer}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>
                <View style={styles.readTimeContainer}>
                    <Clock size={16} color="#1e2939" />
                    <Text style={styles.readTimeText}>{readTime} min read</Text>
                </View>
            </View>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    container: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    image: {
        width: "100%",
        height: 110,
        resizeMode: "cover",
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
    },
    detailsContainer: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: 12,
        padding: 12,
        width: "100%",
        backgroundColor: "white",
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    title: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
        color: "#1e2939",
    },
    description: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "#1e2939",
    },
    readTimeContainer: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    readTimeText: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "#1e2939",
    },
})