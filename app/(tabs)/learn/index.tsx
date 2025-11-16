import ArticleTile from "@/components/ArticleTile";
import CollapsibleHeaderScreen from "@/components/CollapsibleHeaderScreen";
import QuickTipTile from "@/components/QuickTipTile";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChevronRight, Clock, Coins, Lock, Phone, Sparkles, TrendingUp } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// This will be dynamically fetched from the database in the future
const featuredArticle = { 
    id: "123456789",
    slug: "how-to-avoid-scams",
    title: "How to Avoid Scams",
    description: "Learn how to avoid scams and protect yourself from fraud.",
    length: 5800,
}

const articleTiles = [
    {
        id: "1234567890",
        slug: "how-to-avoid-scams",
        title: "How to Avoid Scams",
        description: "Learn how to avoid scams and protect yourself from fraud.",
        length: 5800,
        image: "https://scamly-article-images.s3.ap-southeast-2.amazonaws.com/pexels-alesiakozik-6770775.jpg",
    },
    {
        id: "1234567891",
        slug: "how-to-identify-scams",
        title: "How to Identify Scams",
        description: "Learn how to identify scams and protect yourself from fraud.",
        length: 3200,
        image: "https://scamly-article-images.s3.ap-southeast-2.amazonaws.com/istockphoto-1455658894-1024x1024.jpg",
    },
    {
        id: "1234567892",
        slug: "how-to-report-scams",
        title: "How to Report Scams",
        description: "Learn how to report scams and protect yourself from fraud.",
        length: 8700,
        image: "https://scamly-article-images.s3.ap-southeast-2.amazonaws.com/pexels-jakubzerdzicki-33497885.jpg",
    },
]

// These will be dynamically fetched from the database in the future
const quickTips = [ 
    {
        slug: "suspicious-calls",
        title: "Suspicious Calls",
        description: "How to identify and block scam callers",
        icon: <Phone size={36} color="#fb2c36" />,
        iconBackground: "#ffedd4",
        readMoreVisible: false,
    },
    {
        slug: "safely-buying-crypto",
        title: "Safely Buying Crypto",
        description: "Avoid common cryptocurrency scams.",
        icon: <Coins size={36} color="#efb100" />,
        iconBackground: "#fef3c6",
        readMoreVisible: false,
    },
    {
        slug: "secure-passwords",
        title: "Secure Passwords",
        description: "How to create secure passwords and protect your accounts.",
        icon: <Lock size={36} color="#2b7fff" />,
        iconBackground: "#dff2fe",
        readMoreVisible: false,
    },
]

export default function Learn() {
    const [searchInput, setSearchInput] = useState("");

    function handleSearch() {
        console.log(searchInput);
    }

    function calculateReadTime(length: number): number {
        return Math.max(1, Math.round(length / 1500)); // 1500 characters per minute (200-250 words per minute) 
    }

    return (
        <CollapsibleHeaderScreen
            headerProps={{
                title: "Learning Center",
                imageUrl: require("@/assets/images/page-images/books.png"),
                subtitle: "Stay informed, stay protected."
            }}
            contentContainerStyle={{ flexGrow: 1 }}
        >
            <SafeAreaView edges={[ "left", "right" ]} style={styles.container}>

                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search articles, guides, and tips..."
                        placeholderTextColor="#171924"
                        value={searchInput}
                        onChangeText={setSearchInput}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    <TouchableOpacity onPress={handleSearch} style={{ opacity: searchInput.trim() ? 1 : 0.5 }}>
                        <LinearGradient
                            colors={["#5426F8", "#CF68FF"]}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={styles.searchButtonGradient}
                            disabled={!searchInput.trim()}
                        >
                            <Text style={styles.searchButtonText}>Search</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <LinearGradient
                    colors={["#2b7fff", "#ad46ff", "#f6339a"]}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.featuredArticle}
                >
                    <View style={styles.featuredTag}>
                        <Sparkles size={16} color="white" />
                        <Text style={styles.featuredTagText}>Featured</Text>
                    </View>
                    <Text style={styles.featuredArticleTitle}>{featuredArticle.title}</Text>
                    <Text style={styles.featuredArticleDescription}>{featuredArticle.description}</Text>
                    <View style={styles.featuredArticleDetails}>
                        <View style={styles.featuredArticleReadTime}>
                            <Clock size={16} color="white" />
                            <Text style={styles.featuredArticleReadTimeText}>{calculateReadTime(featuredArticle.length)} min read</Text>
                        </View>
                        <TouchableOpacity style={styles.featuredArticleReadButton}>
                            <Text style={styles.featuredArticleReadButtonText}>Read now</Text>
                            <ChevronRight size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* Trending Now Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderContainer}>
                        <View style={styles.sectionTitleContainer}>
                            <TrendingUp size={24} color="#ad46ff" />
                            <Text style={styles.sectionTitle}>Trending Now</Text>
                        </View>
                    </View>

                    <View style={styles.articleTilesContainer}>
                        {articleTiles.map((article: any) => (
                            <ArticleTile
                                key={article.id}
                                title={article.title}
                                description={article.description}
                                readTime={calculateReadTime(article.length)}
                                image={article.image}
                                slug={article.slug}
                            />
                        ))}
                    </View>
                </View>
                
                {/* Quick Tips Section */}
                <LinearGradient 
                    colors={["#eff6ff", "#faf5ff"]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.quickTipsContainer}
                >
                    <View style={styles.sectionHeaderContainer}>
                        <View style={styles.sectionTitleContainer}>
                            <Sparkles size={24} color="#ad46ff" />
                            <Text style={styles.sectionTitle}>Quick Tips</Text>
                        </View>
                        <TouchableOpacity style={styles.navMoreButton} onPress={() => router.push("/learn/quick-tips")}>
                            <Text style={styles.navMoreButtonText}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.quickTipsContent}>
                        {quickTips.map((quickTip) => (
                            <QuickTipTile key={quickTip.slug} {...quickTip} />
                        ))}
                    </View>
                </LinearGradient>

                <TouchableOpacity style={styles.allArticlesButton} onPress={() => router.push("/learn/all-articles")}>
                    <Text style={styles.allArticlesButtonText}>View All Articles</Text>
                </TouchableOpacity>

            </SafeAreaView>
        </CollapsibleHeaderScreen>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    searchContainer: {
        display: "flex",
        alignItems: "left",
        justifyContent: "center",
        backgroundColor: "white",
        padding: 16,
        gap: 14,
        borderRadius: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
    },
    searchInput: {
        borderWidth: 2,
        borderColor: "#e0e0e0",
        borderRadius: 14,
        fontFamily: "Poppins-Regular",
        height: 45,
        paddingHorizontal: 16,
    },
    searchButtonGradient: {
        height: 45,
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    searchButtonText: {
        color: "white",
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
    },
    featuredArticle: {
        padding: 16,
        borderRadius: 28,
        gap: 12,
        marginTop: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
    },
    featuredTag: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    featuredTagText: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 14,
        color: "white",
    },
    featuredArticleTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 20,
        color: "white",
    },
    featuredArticleDescription: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "white",
    },
    featuredArticleDetails: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
    },
    featuredArticleReadTime: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    featuredArticleReadTimeText: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "white",
    },
    featuredArticleReadButton: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        gap: 8,
    },
    featuredArticleReadButtonText: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "white",
    },
    sectionContainer: {
        marginTop: 32,
        display: "flex",
        flexDirection: "column",
        gap: 16,
    },
    sectionHeaderContainer: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    sectionTitleContainer: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    sectionTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 20,
        color: "#1e2939",
    },
    navMoreButton: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    navMoreButtonText: {
        fontFamily: "Poppins-Light",
        fontSize: 16,
        color: "#ad46ff",
    },
    quickTipsContainer: {
        marginTop: 32,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#e0e0e0",
    },
    quickTipsContent: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
    },
    allArticlesButton: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
        padding: 16,
        borderRadius: 14,
        marginVertical: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    allArticlesButtonText: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
        color: "#ad46ff",
    },
})