import ArticleTile from "@/components/ArticleTile";
import GradientBackground from "@/components/GradientBackground";
import Header from "@/components/Header";
import { getIsPremium } from "@/utils/access";
import { supabase } from "@/utils/supabase";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Article = {
    id: string;
    slug: string;
    title: string;
    description: string;
    image: string; // Primary article image
    content: string;
    length?: number; // Content length in characters
    free_access?: boolean;
}

/**
 * All Articles screen component displaying a scrollable list of all non-quick-tip articles.
 * Articles are ordered by view count (most popular first).
 */
export default function AllArticles() {
    // All articles to display
    const [articles, setArticles] = useState<Article[]>([]);
    // Loading state while fetching articles
    const [pageLoading, setPageLoading] = useState<boolean>(true);
    // Premium subscription status
    const [isPremium, setIsPremium] = useState<boolean>(false);

    // Calculates estimated reading time based on content length
    function calculateReadTime(length: number): number {
        return Math.max(1, Math.round(length / 1500)); // 1500 characters per minute (200-250 words per minute) 
    }

    // Fetch all articles on component mount
    useEffect(() => {
        async function fetchArticles() {
            const premium = await getIsPremium();
            setIsPremium(premium);

            const { data: articles, error: articlesError } = await supabase
                .from("articles")
                .select("id, slug, title, description, primary_image, content, free_access")
                .eq("quick_tip", false)
                .order("views", { ascending: false })

            if (articlesError || !articles) {
                console.error("Error fetching articles:", articlesError);
                Alert.alert("Error", "Failed to fetch the current articles.");
                return;
            }

            setArticles(articles.map((article: any) => ({
                id: article.id,
                slug: article.slug,
                title: article.title,
                description: article.description,
                image: article.primary_image,
                content: article.content,
                length: article.content.length,
                free_access: article.free_access,
            })));

            setPageLoading(false);
        }

        fetchArticles();
    }, []);

    if (pageLoading) {
        return (
            <GradientBackground>
                <Header
                    title="All Articles"
                    basicHeader={true}
                />
                <SafeAreaView edges={[ "left", "right" ]} style={styles.container}>
                    <ActivityIndicator size="large" color="#2b7fff" />
                </SafeAreaView>
            </GradientBackground>
        )
    }

    return (
        <GradientBackground>
            <Header
                title="All Articles"
                basicHeader={true}
            />
            <SafeAreaView edges={[ "left", "right" ]} style={styles.container}>
                <View style={styles.infoHeaderContainer}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/learn")}>
                        <ChevronLeft size={24} color="#2b7fff" />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.infoHeaderTitle}>{articles.length} Articles</Text>
                </View>

                <ScrollView style={styles.scrollView}>
                    <View style={styles.listContainer}>
                        {articles.map((article) => (
                            <ArticleTile
                                key={article.id}
                                title={article.title}
                                description={article.description}
                                readTime={calculateReadTime(article.length)}
                                image={article.image}
                                slug={article.slug}
                                locked={!isPremium && article.free_access === false}
                                onPress={() => {
                                    const locked = !isPremium && article.free_access === false;
                                    if (locked) {
                                        Alert.alert(
                                            "Premium required",
                                            "This article is only available to Scamly Premium users."
                                        );
                                        return;
                                    }
                                    router.push(`/learn/${article.slug}`);
                                }}
                            />
                        ))}
                    </View>
                </ScrollView>

            </SafeAreaView>
        </GradientBackground>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingVertical: 16, // If you set the container horizontal padding it cuts off the box shadow on the quick tip tiles.
    },                       // Have to set it manually on each sub container.
    infoHeaderContainer: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
    },
    backButton: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    backButtonText: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
        color: "#2b7fff",
    },
    listContainer: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    scrollView: {
        flex: 1,
        marginTop: 16,
    },
    infoHeaderTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
        color: "#1e2939",
    },
})