import CollapsibleHeaderScreen from "@/components/CollapsibleHeaderScreen";
import { LinearGradient } from "expo-linear-gradient";
import { ExternalLink, Globe, Phone } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PhoneSearch() {
    const [searchInput, setSearchInput] = useState("");
    const [showResults, setShowResults] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [resultData, setResultData] = useState(null);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);

    async function handleSearch() {
        if (!searchInput.trim()) return;

        setIsLoading(true);
        setError(null);
        setShowResults(false);

        try {
            const response = await fetch('https://1tee7jgtpg.execute-api.ap-southeast-2.amazonaws.com/dev/search', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyName: searchInput.trim() })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error) //Change this to UX friendly error message
            }

            setResultData(result);
            setShowResults(true);
        } catch (err) {
            console.error("Error searching: ", err)
            setError("Failed to fetch company information. Please try again later.")
        } finally {
            setIsLoading(false);
        }
    }

    const company = resultData?.data || null;

    return (
        <CollapsibleHeaderScreen
            headerProps={{
                title: "Contact Search",
                imageUrl: require("@/assets/images/page-images/phone-search.png"),
                subtitle: "Find contact information for any organisation worldwide.",
            }}
            contentContainerStyle={{ flexGrow: 1 }}
        >
            <SafeAreaView edges={["bottom", "left", "right"]} style={styles.container}>
                    <View style={styles.searchContainer}>
                        { /* Need to add a modal "tip" on how to use the search */ }
                        <TouchableOpacity onPress={() => setShowModal(true)}>
                            <Text style={styles.howToUseText}>How to use this feature</Text>
                        </TouchableOpacity>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Enter a company name"
                            placeholderTextColor="#171924"
                            returnKeyType="search"
                            value={searchInput}
                            onChangeText={setSearchInput}
                            onSubmitEditing={handleSearch}
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

                    {/* Results */}
                    <View style={styles.elevatedBoxContainer}>
                        {isLoading ? (
                            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                                <ActivityIndicator size="large" color="#5426F8" />
                            </View>
                        ) : error ? (
                            <Text style={{ textAlign: "center", color: "red", fontFamily: "Poppins-Regular" }}>
                                {error}
                            </Text>
                        ) : showResults && company ? (
                            <>
                                <Text style={styles.companyName}>{company.company_name}</Text>
                                <View style={styles.separator} />
                                <View style={styles.companyInfoContainer}>

                                    {/* Website */}
                                    <View style={styles.companyInfoItem}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                                            <Globe size={18} color="#8B5CF6" />
                                            <View>
                                                <Text style={styles.companyInfoItemTitle}>Website</Text>
                                                <Text style={styles.companyInfoItemValue}>
                                                    {company.website_domain !== "0"
                                                        ? `www.${company.website_domain}`
                                                        : "Not found"}
                                                </Text>
                                            </View>
                                        </View>
                                        {company.website_domain !== "0" && (
                                            <TouchableOpacity
                                                onPress={() =>
                                                    Linking.openURL(`https://${company.website_domain}`)
                                                }
                                            >
                                                <ExternalLink size={24} color="#9CA3AF" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* Local Phone */}
                                    <View style={styles.companyInfoItem}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                                            <Phone size={18} color="#3B82F6" />
                                            <View>
                                                <Text style={styles.companyInfoItemTitle}>Local Phone</Text>
                                                <Text style={styles.companyInfoItemValue}>
                                                    {company.local_phone_number !== "0"
                                                        ? company.local_phone_number
                                                        : "Not found"}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* International Phone */}
                                    <View style={styles.companyInfoItem}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                                            <Phone size={18} color="#EC4899" />
                                            <View>
                                                <Text style={styles.companyInfoItemTitle}>International</Text>
                                                <Text style={styles.companyInfoItemValue}>
                                                    {company.international_phone_number !== "0"
                                                        ? company.international_phone_number
                                                        : "Not found"}
                                                </Text>
                                            </View>
                                        </View>
                                        {company.international_phone_number !== "0" && (
                                            <TouchableOpacity
                                                onPress={() =>
                                                    Linking.openURL(
                                                        `tel:${company.international_phone_number}`
                                                    )
                                                }
                                            >
                                                <ExternalLink size={24} color="#9CA3AF" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>

                                {!company.found_all_fields && (
                                    <Text
                                        style={{
                                            color: "#D97706",
                                            textAlign: "center",
                                            marginTop: 10,
                                            fontFamily: "Poppins-Regular",
                                        }}
                                    >
                                        Some information could not be found:{" "}
                                        {company.missing_fields.join(", ")}.
                                    </Text>
                                )}
                            </>
                        ) : (
                            <Text style={{ textAlign: "center", fontFamily: "Poppins-Regular" }}>
                                Your results will appear here.
                            </Text>
                        )}
                    </View>

                    <View style={styles.disclaimerContainer}>
                        <Text style={styles.disclaimerTitle}>Disclaimer</Text>
                        <Text style={styles.disclaimerText}>
                            This tool uses AI to help locate public company contact information. While we aim to provide accurate and up-to-date results, we cannot guarantee their completeness or accuracy. Please verify any phone numbers or contact details through official company sources before use.{"\n\n"}
                            We appreciate your feedback on this tool. Please email
                            <Text style={{ color: "#0058FA" }}> feedback@scamly.io </Text>
                            to submit any feedback you may have.
                        </Text>
                    </View>
                    <Modal
                        animationType="fade"
                        transparent={true}
                        visible={showModal}
                        onRequestClose={() => setShowModal(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                <Text style={styles.modalTitle}>💡 Tip</Text>
                                <Text style={styles.modalText}>
                                    For the best results, try searching using the company’s full or most recognized name — and include a country if it’s an international brand.
                                    {"\n\n"}✅ Example: "ANZ Bank Australia"
                                    {"\n"}⚠️ Instead of: "ANZ"
                                    {"\n\n"}This helps the tool find the correct official contact details.
                                </Text>
                                <Pressable onPress={() => setShowModal(false)} style={styles.closeButton}>
                                    <Text style={styles.closeButtonText}>Got it</Text>
                                </Pressable>
                            </View>
                        </View>
                    </Modal>
            </SafeAreaView>
        </CollapsibleHeaderScreen>
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
    howToUseText: {
        fontFamily: "Poppins-Bold",
        fontSize: 14,
        color: "#00598a",
        textAlign: "center",
        textDecorationLine: "underline",
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
      modalContainer: {
        backgroundColor: "white",
        borderRadius: 20,
        padding: 24,
        width: "90%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
      modalTitle: {
        fontFamily: "Poppins-Bold",
        fontSize: 18,
        marginBottom: 10,
        color: "#1F2937",
        textAlign: "center",
    },
      modalText: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "#1F2937",
        marginBottom: 20,
        lineHeight: 20,
    },
      closeButton: {
        backgroundColor: "#5426F8",
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignSelf: "center",
    },
      closeButtonText: {
        color: "white",
        fontFamily: "Poppins-SemiBold",
        fontSize: 14,
    },
});