import ArticleTile from "@/components/ArticleTile";
import CollapsibleHeaderScreen from "@/components/CollapsibleHeaderScreen";
import QuickTipTile from "@/components/QuickTipTile";
import { supabase } from "@/utils/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { LogOut, Sparkles, TrendingUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

/**
 * Home screen component displaying navigation options, trending articles, quick tips, and premium status.
 * Allows a user to sign out and navigate to the login screen.
 */
export default function Home() {
    // Users display name (used in the header)
    const [userName, setUserName] = useState<string | null>("");
    // Trending articles
    const [trendingArticles, setTrendingArticles] = useState<Article[]>([]);
    // Quick tips articles
    const [quickTips, setQuickTips] = useState<Article[]>([]);
    // Loading state while fetching initial page data
    const [loading, setLoading] = useState<boolean>(true);
    // Premium subscription status
    const [isPremium, setIsPremium] = useState<boolean>(false);

    function calculateReadTime(length: number): number {
        return Math.max(1, Math.round(length / 1500)); // 1500 characters per minute (200-250 words per minute) 
    }

    // Fetch user profile and trending articles on component mount
    useEffect(() => {
        async function fetchPageData() {

            // Fetch the user's profile data.
            async function getUser(): Promise<boolean> {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
    
                if (userError || !user) {
                    console.error("No user:", userError);
                    Alert.alert("Error", "There has been an issue with your account and you have been logged out. Please log in again.",
                        [
                            {
                                text: "Ok",
                                style: "destructive",
                                onPress: () => {
                                    supabase.auth.signOut();
                                    router.replace("/login");
                                }
                            }
                        ]
                    );
                    return false;
                }
                
                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("first_name, subscription_plan")
                    .eq("id", user.id)
                    .single();
    
                if (profileError || !profileData) {
                    console.error("Error fetching profile:", profileError);
                    setUserName("")
                    return false;
                }

                // subscription_plan will only be one of "free", "premium-monthly", or "premium-yearly"
                const premium = profileData.subscription_plan !== "free";
                setIsPremium(premium);
    
                // Include the "," in userName to separate from the "Hi" in the header.
                // This way if the name collection fails, the user will just see "Hi" rather than "Hi, "
                setUserName(`, ${profileData.first_name}`); 
                return premium;
            }
    
            // Fetch the top 2 trending articles ordered by view count.
            async function getTrendingArticles(premium: boolean) {
                let query = supabase
                    .from("articles")
                    .select("id, title, primary_image, description, slug, content")
                    .order("views", { ascending: false })
                    .eq("quick_tip", false)
                    .limit(2);

                if (!premium) {
                    query = query.eq("free_access", true);
                }

                const { data: trendingArticles, error: trendingArticlesError } = await query;
                
                if (!trendingArticles || trendingArticlesError) {
                    console.error("Error fetching trending articles:", trendingArticlesError);
                    Alert.alert("Error", "We couldn't find any latest trending articles to show you.");
                } else {
                    setTrendingArticles(trendingArticles.map((article: any) => ({
                        id: article.id,
                        slug: article.slug,
                        title: article.title,
                        description: article.description,
                        image: article.primary_image,
                        length: article.content.length,
                    })));
                }
            }

            // Fetch the top 3 quick tips articles ordered by view count.
            async function getQuickTips(premium: boolean) {
                let query = supabase
                    .from("articles")
                    .select("id, slug, title, description, quick_tip_icon, quick_tip_icon_colour, quick_tip_icon_background_colour")
                    .eq("quick_tip", true)
                    .order("views", { ascending: false })
                    .limit(3);

                if (!premium) {
                    query = query.eq("free_access", true);
                }

                const { data: quickTips, error: quickTipsError } = await query;
                
                if (!quickTips || quickTipsError) {
                    console.error("Error fetching quick tips:", quickTipsError);
                    Alert.alert("Error", "We couldn't find any latest quick tips to show you.");
                } else {
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
            }

            const premium = await getUser();
            await Promise.all([getTrendingArticles(premium), getQuickTips(premium)])
            setLoading(false);
        }
        fetchPageData();
    }, [])

    // Handles the user signing out and redirects to the login page.
    async function handleSignOut() {
        try {
            await supabase.auth.signOut();
            router.replace("/login");
        } catch (err) {
            console.error("Error signing user out:", err);
            Alert.alert("Error", "There was an error signing you out. Please try again.");
        }
    }

    return (
        <CollapsibleHeaderScreen
            headerProps={{
                title: `Hi${userName}`,
                imageUrl: require("@/assets/images/page-images/monologo.png"),
                subtitle: "What can we help you with today?"
            }}
            contentContainerStyle={{ flexGrow: 1 }}
        >
            <SafeAreaView edges={["bottom", "left", "right"]} style={styles.container}>

                {/* Navigation Options Section */}
                <View style={styles.navOptionsContainer}>
                    <TouchableOpacity style={styles.navOption} onPress={() => router.push("/scan")}>
                        <LinearGradient
                            colors={["#2b7fff", "#00b8db"]}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={styles.navOptionIconGradient}
                        >
                            <Image source={require("@/assets/images/page-images/ai.png")} style={styles.navOptionIcon} />
                        </LinearGradient>
                        <Text style={styles.navOptionText}>Scan online media for scams</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.navOption} onPress={() => router.push("/chat")}>
                        <LinearGradient
                            colors={["#ad46ff", "#f6339a"]}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={styles.navOptionIconGradient}
                        >
                            <Image source={require("@/assets/images/page-images/chat.png")} style={styles.navOptionIcon} />
                        </LinearGradient>
                        <Text style={styles.navOptionText}>Chat with our AI assistant</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.navOption} onPress={() => router.push("/info-search")}>
                        <LinearGradient
                            colors={["#ff6900", "#fb2c36"]}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={styles.navOptionIconGradient}
                        >
                            <Image source={require("@/assets/images/page-images/phone-search.png")} style={styles.navOptionIcon} />
                        </LinearGradient>
                        <Text style={styles.navOptionText}>Search for contact info</Text>
                    </TouchableOpacity>
                </View>

                {/* Trending Articles Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderContainer}>
                        <View style={styles.sectionTitleContainer}>
                            <TrendingUp size={24} color="#ad46ff" />
                            <Text style={styles.sectionTitle}>Trending Articles</Text>
                        </View>
                        <TouchableOpacity style={styles.navMoreButton} onPress={() => router.push("/learn/all-articles")}>
                            <Text style={styles.navMoreButtonText}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.trendingArticlesContent}>
                        { loading ? (
                            <ActivityIndicator size="large" color="#2b7fff" />
                        ) : (
                            <>
                            { trendingArticles.map((trendingArticle: any) => (
                                <ArticleTile 
                                    key={trendingArticle.id}
                                    title={trendingArticle.title}
                                    description={trendingArticle.description}
                                    readTime={calculateReadTime(trendingArticle.length)}
                                    image={trendingArticle.image}
                                    slug={trendingArticle.slug}
                                />
                            ))}
                            </>
                        )}
                    </View>
                </View>

                {/* Quick Tips Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderContainer}>
                        <View style={styles.sectionTitleContainer}>
                            <Sparkles size={24} color="#ad46ff" />
                            <Text style={styles.sectionTitle}>Quick Tips</Text>
                        </View>
                        <TouchableOpacity style={styles.navMoreButton} onPress={() => router.push("/learn/all-quick-tips")}>
                            <Text style={styles.navMoreButtonText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.quickTipsContent}>
                        {quickTips.map((quickTip: any) => (
                            <QuickTipTile key={quickTip.id}
                                slug={quickTip.slug}
                                title={quickTip.title}
                                description={quickTip.description}
                                icon={quickTip.icon}
                                iconColour={quickTip.iconColour}
                                iconBackground={quickTip.iconBackground}
                                readMoreVisible={false}
                            />
                        ))}
                    </View>
                </View>

                {/* Premium Banner Section */}
                {isPremium ? (
                    <ImageBackground
                        source={require("@/assets/images/page-images/bg_horizontal.png")}
                        style={styles.premiumBanner}
                    >
                        <View style={styles.premiumBannerTitleContainer}>
                            <Image source={require("@/assets/images/page-images/monologo.png")} style={styles.premiumBannerIcon} />
                            <Text style={styles.premiumBannerTitle}>Scamly Premium</Text>
                        </View>
                        <Text style={styles.premiumBannerDescription}>Thank you for choosing Scamly Premium. Your account can be managed through our online portal.</Text>
                    </ImageBackground>
                ) : (
                    <ImageBackground
                        source={require("@/assets/images/page-images/bg_horizontal.png")}
                        style={styles.premiumBanner}
                    >
                        <View style={styles.premiumBannerTitleContainer}>
                            <Image source={require("@/assets/images/page-images/monologo.png")} style={styles.premiumBannerIcon} />
                            <Text style={styles.premiumBannerTitle}>Scamly Premium</Text>
                        </View>
                        <Text style={styles.premiumBannerDescription}>Premium users have full, unlimited access to everything Scamly offers. You can manage your subscription through our online portal.</Text>
                    </ImageBackground>
                )}

                {/* Sign out button */}
                <TouchableOpacity style={styles.signOutButtonContainer} onPress={handleSignOut}>
                    <Text style={styles.signOutButtonText}>Sign out</Text>
                    <LogOut size={16} color="white" />
                </TouchableOpacity>
                
            </SafeAreaView>
        </CollapsibleHeaderScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    navOptionsContainer: {
        flexWrap: "wrap",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    navOption: {
        flexBasis: "30%",
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: "white",
        borderRadius: 10,
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 6,
    },
    navOptionIconGradient: {
        padding: 10,
        borderRadius: 10,
    },
    navOptionIcon: {
        width: 32,
        height: 32,
        resizeMode: "contain",
    },
    navOptionText: {
        fontSize: 14,
        fontFamily: "Poppins-Regular",
        textAlign: "center",
        flexShrink: 1,
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
    trendingArticlesContent: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
    },
    trendingArticleItem: {
        flexBasis: "45%",
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    trendingArticleImage: {
        width: "100%",
        height: 150,
        resizeMode: "cover",
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
    },
    trendingArticleDetails: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: 12,
        padding: 10,
        backgroundColor: "white",
        width: "100%",
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    trendingArticleTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
        color: "#1e2939",
    },
    trendingArticleDescription: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "#1e2939",
    },
    learnMoreButton: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    learnMoreButtonText: {
        fontFamily: "Poppins-Light",
        fontSize: 14,
        color: "#ad46ff",
    },
    quickTipsContent: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
    },
    premiumBanner: {
        padding: 24,
        borderRadius: 20,
        marginTop: 32,
        overflow: "hidden",
    },
    premiumBannerTitleContainer: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
    },
    premiumBannerTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 20,
        color: "white",
    },
    premiumBannerIcon: {
        width: 32,
        height: 32,
        resizeMode: "contain",
    },
    premiumBannerDescription: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "white",
    },
    signOutButtonContainer: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginTop: 32,
        backgroundColor: "#ff6467",
        borderRadius: 14,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    signOutButtonText: {
        fontFamily: "Poppins-Medium",
        fontSize: 14,
        color: "white",
    },
})