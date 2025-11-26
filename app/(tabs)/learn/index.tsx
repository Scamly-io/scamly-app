import ArticleTile from "@/components/ArticleTile";
import CollapsibleHeaderScreen from "@/components/CollapsibleHeaderScreen";
import HalfGradientDivider from "@/components/HalfGradientDivider";
import QuickTipTile from "@/components/QuickTipTile";
import { supabase } from "@/utils/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChevronRight, Clock, Sparkles, TrendingUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Article = {
    id: string;
    slug: string;
    title: string;
    description: string;
    image?: string; // Primary article image
    content?: string;
    length?: number; // Content length in characters
    quick_tip?: boolean;
    rank?: number; // Search query rank
    icon?: string; // Lucide React Native icon name (QUICK TIP ONLY)
    iconColour?: string; // QUICK TIP ONLY
    iconBackground?: string; // QUICK TIP ONLY
}

export default function Learn() {
    const [searchInput, setSearchInput] = useState("");
    const [searchResults, setSearchResults] = useState<Article[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState<boolean>(true);
    const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
    const [trendingArticles, setTrendingArticles] = useState<Article[]>([]);
    const [quickTips, setQuickTips] = useState<Article[]>([]);

    // Fetch page data on mount
    useEffect(() => {
        // Handles the fetch for featured article, trending articles, and quick tips
        async function fetchPageData() {
            async function getFeaturedArticle() {
                const { data: featuredArticle, error: featuredArticleError } = await supabase
                    .from("articles")
                    .select("id, slug, title, description, content")
                    .order("views", { ascending: false })
                    .limit(1)
                    .single();

                if (featuredArticleError || !featuredArticle) {
                    console.error("Error fetching featured article:", featuredArticleError);
                    // Silently log the error and just don't display the featured article.
                    return;
                }

                setFeaturedArticle({
                    id: featuredArticle.id,
                    slug: featuredArticle.slug,
                    title: featuredArticle.title,
                    description: featuredArticle.description,
                    length: featuredArticle.content.length,
                });
            }

            async function getTrendingArticles() {
                const { data: trendingArticles, error: trendingArticlesError } = await supabase
                    .from("articles")
                    .select("id, slug, title, description, primary_image, content")
                    .order("views", { ascending: false })
                    .eq("quick_tip", false)
                    .range(1, 3)

                if (trendingArticlesError || !trendingArticles) {
                    console.error("Error fetching trending articles:", trendingArticlesError);
                    Alert.alert("Error", "Failed to fetch the current trending articles.");
                    return;
                };

                setTrendingArticles(trendingArticles.map((article: any) => ({
                    id: article.id,
                    slug: article.slug,
                    title: article.title,
                    description: article.description,
                    length: article.content.length,
                    image: article.primary_image,
                })));
            }

            async function getQuickTips() {
                const { data: quickTips, error: quickTipsError } = await supabase
                    .from("articles")
                    .select("id, slug, title, description, quick_tip_icon, quick_tip_icon_colour, quick_tip_icon_background_colour")
                    .eq("quick_tip", true)
                    .order("views", { ascending: false })
                    .range(0, 3)

                if (quickTipsError || !quickTips) {
                    console.error("Error fetching quick tips:", quickTipsError);
                    Alert.alert("Error", "Failed to fetch the current trending quick tips.");
                    return;
                }

                setQuickTips(quickTips.map((quickTip: any) => ({
                    id: quickTip.id,
                    slug: quickTip.slug,
                    title: quickTip.title,
                    description: quickTip.description,
                    icon: quickTip.quick_tip_icon,
                    iconColour: quickTip.quick_tip_icon_colour,
                    iconBackground: quickTip.quick_tip_icon_background_colour,
                })));
            }

            await Promise.all([getFeaturedArticle(), getTrendingArticles(), getQuickTips()]);
            setPageLoading(false);
        }

        fetchPageData();
    }, []);

    function calculateReadTime(length: number): number {
        return Math.max(1, Math.round(length / 1500)); // 1500 characters per minute (200-250 words per minute) 
    }

    async function handleSearch() {
        if (!searchInput.trim()) return;

        setSearchLoading(true);
        setSearchResults([]);

        try {
            const { data } = await supabase.rpc('search_articles', { search_text: searchInput.trim() });
            
            const mapped = data.map((article: any) => ({
                id: article.id,
                slug: article.slug,
                title: article.title,
                description: article.description,
                length: article.content.length,
                image: article.image,
                quick_tip: article.quick_tip,
                icon: article.quick_tip_icon,
                iconColour: article.quick_tip_icon_colour,
                iconBackground: article.quick_tip_icon_background_colour,
                rank: article.rank,
            }))

            setSearchResults(mapped);

            if (mapped.length < 1) {
                Alert.alert("No results found", `We couldn't find any articles related to ${searchInput.trim()}`);
            }

        } catch (error) {
            console.error("Error searching articles: ", error);
            Alert.alert("Error", "Failed to search articles. Please try again later.");
        } finally {
            setSearchLoading(false);
        }
    }

    if (pageLoading) {
        return (
            <CollapsibleHeaderScreen
                headerProps={{
                    title: "Learning Center",
                    imageUrl: require("@/assets/images/page-images/books.png"),
                    subtitle: "Stay informed, stay aware, stay safe."
                }}
                contentContainerStyle={{ flexGrow: 1 }}
            >
                <SafeAreaView edges={[ "left", "right" ]} style={styles.container}>
                    <ActivityIndicator size="large" color="#ad46ff" />
                </SafeAreaView>
            </CollapsibleHeaderScreen>
        )
    }

    return (
        <CollapsibleHeaderScreen
            headerProps={{
                title: "Learning Center",
                imageUrl: require("@/assets/images/page-images/books.png"),
                subtitle: "Stay informed, stay aware, stay safe."
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

                    <HalfGradientDivider />
                    
                    {searchLoading ? (
                        <View>
                            <ActivityIndicator size="large" color="#ad46ff" />
                        </View>
                    ) : null}

                    {searchResults.length > 0 ? (
                        <>
                            <View style={styles.listContainer}>
                                {searchResults.filter((result) => result.quick_tip).map((result) => (
                                    <QuickTipTile 
                                        key={result.id}
                                        slug={result.slug}
                                        title={result.title}
                                        description={result.description}
                                        icon={result.icon}
                                        iconColour={result.iconColour}
                                        iconBackground={result.iconBackground}
                                        readMoreVisible={false}
                                    />
                                ))}
                                
                                {searchResults.filter((result) => !result.quick_tip).map((result) => (
                                    <ArticleTile 
                                        key={result.id}
                                        title={result.title}
                                        description={result.description}
                                        readTime={calculateReadTime(result.length)}
                                        image={result.image}
                                        slug={result.slug}
                                    />
                                ))}    
                            </View>
                            <HalfGradientDivider />
                        </>
                    ) : null}
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
                        <TouchableOpacity style={styles.featuredArticleReadButton} onPress={() => router.push(`/learn/${featuredArticle.slug}`)}>
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

                    <View style={styles.listContainer}>
                        {trendingArticles.map((article) => (
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
                        <TouchableOpacity style={styles.navMoreButton} onPress={() => router.push("/learn/all-quick-tips")}>
                            <Text style={styles.navMoreButtonText}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.listContainer}>
                        {quickTips.map((quickTip) => (
                            <QuickTipTile 
                            key={quickTip.id} 
                            slug={quickTip.slug} 
                            title={quickTip.title} 
                            description={quickTip.description} 
                            icon={quickTip.icon} 
                            iconColour={quickTip.iconColour} 
                            iconBackground={quickTip.iconBackground} 
                            readMoreVisible={false} />
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
        gap: 16,
        borderRadius: 14,
    },
    searchInput: {
        borderWidth: 2,
        borderColor: "#e0e0e0",
        borderRadius: 14,
        fontFamily: "Poppins-Regular",
        height: 45,
        paddingHorizontal: 16,
        backgroundColor: "white",
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
    searchResultsSectionTitleContainer: {
        marginBottom: 16,
    },
    searchResultsSectionTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
        color: "#374151",
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
    listContainer: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
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