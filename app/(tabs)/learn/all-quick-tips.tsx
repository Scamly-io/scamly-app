import GradientBackground from "@/components/GradientBackground";
import Header from "@/components/Header";
import QuickTipTile from "@/components/QuickTipTile";
import { supabase } from "@/utils/supabase";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type QuickTip = {
    id: string;
    slug: string;
    title: string;
    description: string;
    icon: string; // Lucide React Native icon name
    iconColour: string; // Icon color
    iconBackground: string; // Icon background color
}

/**
 * All Quick Tips screen component displaying a scrollable list of all quick tip articles.
 * Quick tips are ordered by view count (most popular first).
 */
export default function AllQuickTips() {
    // All quick tips to display
    const [quickTips, setQuickTips] = useState<QuickTip[]>([]);
    // Loading state while fetching quick tips
    const [pageLoading, setPageLoading] = useState<boolean>(true);

    // Fetch all quick tips on component mount
    useEffect(() => {
        async function fetchQuickTips() {
            const { data: quickTips, error: quickTipsError } = await supabase
                .from("articles")
                .select("id, slug, title, description, quick_tip_icon, quick_tip_icon_colour, quick_tip_icon_background_colour")
                .eq("quick_tip", true)
                .order("views", { ascending: false })

            if (quickTipsError || !quickTips) {
                console.error("Error fetching quick tips:", quickTipsError);
                Alert.alert("Error", "Failed to fetch the current quick tips.");
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

            setPageLoading(false);
        }

        fetchQuickTips();
    }, []);

    if (pageLoading) {
        return (
            <GradientBackground>
                <Header
                    title="Quick Tips"
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
                title="All Quick Tips"
                basicHeader={true}
            />
            <SafeAreaView edges={[ "left", "right" ]} style={styles.container}>
                <View style={styles.infoHeaderContainer}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <ChevronLeft size={24} color="#2b7fff" />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.infoHeaderTitle}>{quickTips.length} Quick Tips</Text>
                </View>

                <ScrollView style={styles.scrollView}>
                    <View style={styles.listContainer}>
                        {quickTips.map((quickTip) => (
                            <QuickTipTile key={quickTip.id} {...quickTip} />
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