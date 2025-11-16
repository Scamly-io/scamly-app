import CollapsibleHeaderScreen from "@/components/CollapsibleHeaderScreen";
import QuickTipTile from "@/components/QuickTipTile";
import { supabase } from "@/utils/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChevronRight, Coins, LogOut, Mail, Phone, Shield, Sparkles, TrendingUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const quickTips = [
    {
        slug: "suspicious-calls",
        title: "Suspicious Calls",
        description: "How to identify and block scam callers",
        icon: <Phone size={36} color="#fb2c36" />,
        iconBackground: "#ffedd4",
        readMoreVisible: true,
    },
    {
        slug: "safely-buying-crypto",
        title: "Safely Buying Crypto",
        description: "Avoid common cryptocurrency scams.",
        icon: <Coins size={36} color="#efb100" />,
        iconBackground: "#fef3c6",
        readMoreVisible: true,
    },
    {
        slug: "email-verification",
        title: "Email Verification",
        description: "How to check if an email is legitimate.",
        icon: <Mail size={36} color="#2b7fff" />,
        iconBackground: "#dff2fe",
        readMoreVisible: true,
    },
    {
        slug: "social-media-safety",
        title: "Social Media Safety",
        description: "How to protect your social media accounts.",
        icon: <Shield size={36} color="#ad46ff" />,
        iconBackground: "#f3e8ff",
        readMoreVisible: true,
    },
]

/**
 * Home screen component displaying navigation options, trending scams, quick tips, and premium status.
 * Allows a user to sign out and navigate to the login screen.
 */
export default function Home() {

    // Users display name (used in the header)
    const [userName, setUserName] = useState<string | null>(null);
    // Trending scam articles
    const [article, setArticle] = useState<any>(null);
    // Loading state while fetching initial page data
    const [loading, setLoading] = useState<boolean>(true);
    // Premium subscription status
    const [isPremium, setIsPremium] = useState<boolean>(true);

    // Fetch user profile and trending scams on component mount
    useEffect(() => {
        async function fetchPageData() {
            /**
             * Fetch authenticated user and their profile data
             * @param {void}
             * @throws {Error} If there is an error fetching user
             * @returns {void}
             */
            async function getUser() {
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
                }
                
                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("first_name")
                    .eq("id", user.id)
                    .single();
    
                if (profileError || !profileData) {
                    console.error("Error fetching profile:", profileError);
                    setUserName("")
                }
    
                // Include the "," in userName to separate from the "Hi" in the header.
                // This way if the name collection fails, the user will just see "Hi" rather than "Hi, "
                setUserName(`, ${profileData.first_name}`); 
            }
    
            /**
             * Fetch top 2 trending scam articles ordered by view count
             * 
             * @param {void}
             * @throws {Error} If there is an error fetching articles
             * @returns {void}
             */
            async function getTrendingScams() {
                const { data: articles, error: articlesError } = await supabase
                    .from("articles")
                    .select("id, title, primary_image, description, slug")
                    .order("views", { ascending: false })
                    .limit(2)
                
                if (!articles || articlesError) {
                    console.error("Error fetching articles:", articlesError);
                    Alert.alert("Error", "We couldn't find any latest trending scams to show you.");
                } else {
                    setArticle(articles);
                }
            }
    
            await Promise.all([getUser(), getTrendingScams()])
            setLoading(false);
        }
        fetchPageData();
    }, [])

    /**
     * Handle user sign out and redirect to login screen
     * 
     * @param {void}
     * @throws {Error} If there is an error signing out
     * @returns {void}
     */
    async function handleSignOut() {
        try {
            await supabase.auth.signOut();
            router.replace("/login");
        } catch (err) {
            console.error("Error signing user out:", err);
            Alert.alert("Error", "There was an error signing you out. Please try again.");
        }
    }

    // Show loading indicator while fetching initial data
    if (loading) {
        return (
            <SafeAreaView edges={["bottom", "left", "right"]} style={styles.container}>
                <ActivityIndicator size="large" color="#ad46ff" />
            </SafeAreaView>
        );
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

                {/* Trending Scams Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderContainer}>
                        <View style={styles.sectionTitleContainer}>
                            <TrendingUp size={24} color="#ad46ff" />
                            <Text style={styles.sectionTitle}>Trending Scams</Text>
                        </View>
                        <TouchableOpacity style={styles.navMoreButton} onPress={() => router.push("/learn")}>
                            <Text style={styles.navMoreButtonText}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.trendingScamsContent}>
                        {article && article.map((article: any) => (
                            <TouchableOpacity key={article.id} style={styles.trendingScamItem} onPress={() => router.push(`/learn/${article.slug}`)}>
                                <Image source={{ uri: article.primary_image }} style={styles.trendingScamImage} />
                                <View style={styles.trendingScamDetails}>
                                    <Text style={styles.trendingScamTitle}>{article.title}</Text>
                                    <Text style={styles.trendingScamDescription}>{article.description}</Text>
                                    <View style={styles.learnMoreButton}>
                                        <Text style={styles.learnMoreButtonText}>Learn More</Text>
                                        <ChevronRight size={16} color="#ad46ff" />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Quick Tips Section */}
                <View style={styles.sectionContainer}>
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
                        <Text style={styles.premiumBannerDescription}>Thank you for choosing Scamly Premium.</Text>
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
    trendingScamsContent: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 16,
    },
    trendingScamItem: {
        flexBasis: "45%",
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    trendingScamImage: {
        width: "100%",
        height: 150,
        resizeMode: "cover",
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
    },
    trendingScamDetails: {
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
    trendingScamTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
        color: "#1e2939",
    },
    trendingScamDescription: {
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