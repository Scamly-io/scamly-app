import CollapsibleHeaderScreen from "@/components/CollapsibleHeaderScreen";
import { supabase } from "@/utils/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChevronRight, TrendingUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function Home() {

    const [userName, setUserName] = useState<string | null>(null);
    const [article, setArticle] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        async function fetchPageData() {
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
    
            async function getTrendingScams() {
                const { data: articles, error: articlesError } = await supabase
                    .from("articles")
                    .select("id, title, primary_image, description")
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

                    <TouchableOpacity style={styles.navOption} onPress={() => router.push("/contact-search")}>
                        <LinearGradient
                            colors={["#ff6900", "#fb2c36"]}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={styles.navOptionIconGradient}
                        >
                            <Image source={require("@/assets/images/page-images/phone-search.png")} style={styles.navOptionIcon} />
                        </LinearGradient>
                        <Text style={styles.navOptionText}>Search for contact information</Text>
                    </TouchableOpacity>
                </View>
                
                <View style={styles.trendingScamsContainer}>
                    <View style={styles.sectionHeaderContainer}>
                        <View style={styles.sectionTitleContainer}>
                            <TrendingUp size={24} color="#ad46ff" />
                            <Text style={styles.sectionTitle}>Trending Scams</Text>
                        </View>
                        <TouchableOpacity style={styles.viewAllButton}>
                            <Text style={styles.viewAllButtonText}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.trendingScamsContent}>
                        {article && article.map((article: any) => (
                            <View key={article.id} style={styles.trendingScamItem}>
                                <Image source={{ uri: article.primary_image }} style={styles.trendingScamImage} />
                                <View style={styles.trendingScamDetails}>
                                    <Text style={styles.trendingScamTitle}>{article.title}</Text>
                                    <Text style={styles.trendingScamDescription}>{article.description}</Text>
                                    <TouchableOpacity style={styles.learnMoreButton}>
                                        <Text style={styles.learnMoreButtonText}>Learn More</Text>
                                        <ChevronRight size={16} color="#ad46ff" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                    
                </View>
                
                

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
        fontSize: 16,
        fontFamily: "Poppins-Regular",
        textAlign: "center",
        flexShrink: 1,
    },
    trendingScamsContainer: {
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
    viewAllButton: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    viewAllButtonText: {
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
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
})