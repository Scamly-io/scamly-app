import GradientBackground from "@/components/GradientBackground";
import { supabase } from "@/utils/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, LogBox, ScrollView, StyleSheet, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Suppress the key prop warning from react-native-markdown-display's internal FitImage component
 * This is a known issue in the library where it spreads props containing a key
 * It does not affect the functionality and the content still renders correctly.
 */
LogBox.ignoreLogs([
    'A props object containing a "key" prop is being spread into JSX',
]);

type Article = {
    content: string;
    id: string;
}

export default function ArticleDetail() {
    const [article, setArticle] = useState<Article | null>(null);
    const [ loading, setLoading ] = useState<boolean>(true);

    const { slug } = useLocalSearchParams<{ slug: string }>();

    useEffect(() => {
        async function fetchArticle() {
            const { data: article, error: articleError } = await supabase
                .from("articles")
                .select("id, content")
                .eq("slug", slug)
                .single();
            
            if (articleError || !article) {
                console.error("Error fetching article:", articleError);
                Alert.alert("Error", "We couldn't find the article you were looking for.", 
                    [
                        {
                            text: "Back",
                            style: "destructive",
                            onPress: () => {
                                router.back();
                            }
                        }
                    ]
                );
            }

            setArticle(article);
            setLoading(false);

            try {
                await supabase.rpc("increment_article_views", { article_id: article.id });
            } catch (error) {
                console.error("Error incrementing article views:", error);
            }
        }

        fetchArticle();
    }, [slug])

    if (loading) {
        return (
            <>
                <StatusBar style="dark" />
                <GradientBackground>
                    <SafeAreaView edges={[ "left", "right" ]} style={styles.container}>
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#ad46ff" />
                        </View>
                    </SafeAreaView>
                </GradientBackground>
            </>

        )
    }

    return (
        <>
            <StatusBar style="dark" />
            <GradientBackground>
                <SafeAreaView edges={[ "left", "right" ]} style={styles.container}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Markdown style={markdownStyles}>{article?.content}</Markdown>
                    </ScrollView>
                </SafeAreaView>
            </GradientBackground>
        </>
    )
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    content: {
        fontFamily: "Poppins-Regular",
        fontSize: 16,
        color: "#1e2939",
        marginVertical: 16,
    },
})

const markdownStyles = {
    body: {
        fontFamily: "Poppins-Regular",
        fontSize: 16,
        color: "#1e2939",
        marginBottom: 16,
    },
    heading1: {
        fontFamily: "Poppins-Bold",
        fontSize: 24,
        color: "#1e2939",
        marginTop: 16,
    },
    heading3: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 18,
        color: "#1e2939",
        marginTop: 16,
    },
    image: {
        borderRadius: 14,
    },
    table: {
        borderWidth: 1,
        marginTop: 16,
    },
    th: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
        textAlign: "center",
    },
    tr: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        gap: 12,
    },
    td: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
    },
    hr: {
        marginTop: 16,
    },
    em: {
        fontFamily: "Poppins-Italic",
    },
    strong: {
        fontFamily: "Poppins-Bold",
    }
}

