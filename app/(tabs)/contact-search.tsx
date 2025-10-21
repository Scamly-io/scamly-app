import GradientBackground from "@/components/GradientBackground";
import Header from "@/components/Header";
import { LinearGradient } from "expo-linear-gradient";
import { ExternalLink, Globe, Phone } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function PhoneSearch() {
    const [searchInput, setSearchInput] = useState("");
    const [showResults, setShowResults] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSearch() {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setShowResults(!showResults);
        setIsLoading(false);
    }

    return (
        <SafeAreaProvider>
            <GradientBackground>
                <Header title="Contact Search" imageUrl={require("@/assets/images/page-images/phone-search.png")} subtitle="Find contact information for any organisation worldwide." />
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.container}>
                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Enter a company name"
                                placeholderTextColor="#171924"
                                returnKeyType="search"
                                value={searchInput}
                                onChangeText={setSearchInput}
                                onSubmitEditing={handleSearch}
                            />
                            <TouchableOpacity onPress={handleSearch}>
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

                        {showResults && !isLoading ? (
                            <View style={styles.elevatedBoxContainer}>
                                <Text style={styles.companyName}>Company Information</Text>
                                <View style={styles.separator} />
                                <View style={styles.companyInfoContainer}>

                                    <View style={styles.companyInfoItem}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                                            <Globe size={18} color="#8B5CF6" />
                                            <View>
                                                <Text style={styles.companyInfoItemTitle}>Website</Text>
                                                <Text style={styles.companyInfoItemValue}>www.company.com</Text>
                                            </View>
                                        </View>
                                        <ExternalLink size={24} color="#9CA3AF"/>
                                    </View>

                                    <View style={styles.companyInfoItem}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                                            <Phone size={18} color="#3B82F6" />
                                            <View>
                                                <Text style={styles.companyInfoItemTitle}>Local Phone</Text>
                                                <Text style={styles.companyInfoItemValue}>(123) 456 7890</Text>
                                            </View>
                                        </View>
                                        <ExternalLink size={24} color="#9CA3AF"/>
                                    </View>

                                    <View style={styles.companyInfoItem}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                                            <Phone size={18} color="#EC4899" />
                                            <View>
                                                <Text style={styles.companyInfoItemTitle}>International</Text>
                                                <Text style={styles.companyInfoItemValue}>+123 456 7890</Text>
                                            </View>
                                        </View>
                                        <ExternalLink size={24} color="#9CA3AF"/>
                                    </View>
                                    
                                </View>
                            </View>
                        ) : (
                            <View style={styles.elevatedBoxContainer}>
                                {isLoading ? (
                                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                                        <ActivityIndicator size="large" color="#5426F8" />
                                    </View>
                                ) : (
                                    <Text style={{ textAlign: "center", fontFamily: "Poppins-Regular" }}>Your results will appear here.</Text>
                                )}
                            </View>
                        )}

                        <View style={styles.disclaimerContainer}>
                            <Text style={styles.disclaimerTitle}>Disclaimer</Text>
                            <Text style={styles.disclaimerText}>
                                This tool uses AI to help locate public company contact information. While we aim to provide accurate and up-to-date results, we cannot guarantee their completeness or accuracy. Please verify any phone numbers or contact details through official company sources before use.{"\n\n"}
                                We appreciate your feedback on this tool. Please email
                                <Text style={{ color: "#0058FA" }}> feedback@scamly.io </Text>
                                to submit any feedback you may have.
                            </Text>
                        </View>
                    </SafeAreaView>
                </ScrollView>
            </GradientBackground>
        </SafeAreaProvider>
    )
}

const styles = StyleSheet.create({
    separator: {
        height: 1,
        backgroundColor: "#e5e7eb",
        marginVertical: 8,
    },
    container: {
        flex: 1,
        paddingHorizontal: 16,
    },
    searchContainer: {
        marginTop: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 16,
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
    elevatedBoxContainer: {
        marginTop: 30,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
    },
    companyName: {
        fontFamily: "Poppins-Bold",
        fontSize: 22,
        textAlign: "center",
        color: "#1F2937",
        marginVertical: 8
    },
    companyInfoContainer: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginTop: 12,
    },
    companyInfoItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 18,
        backgroundColor: "#F3f4f6",
        borderRadius: 14,
    },
    companyInfoItemTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
        color: "#1F2937",
    },
    companyInfoItemValue: {
        fontFamily: "Poppins-Regular",
        fontSize: 16,
        color: "#1F2937",
    },
    disclaimerContainer: {
        marginVertical: 36,
    },
    disclaimerTitle: {
        fontFamily: "Poppins-SemiBold",
    },
    disclaimerText: {
        fontFamily: "Poppins-ExtraLightItalic",
    }
});