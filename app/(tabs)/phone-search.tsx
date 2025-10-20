import Header from "@/components/Header";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function PhoneSearch() {
    const [searchInput, setSearchInput] = useState("");

    async function handleSearch() {

    }

    return (
        <SafeAreaProvider>
            <Header title="Phone Search" imageUrl={require("@/assets/images/page-images/phone-search.png")} subtitle="Find contact information for any organisation worldwide." />
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
                                >
                                    <Text style={styles.searchButtonText}>Search</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.resultsContainer}>
                            <Text style={styles.companyName}>Company Name</Text>
                            <View style={styles.separator} />
                            <View style={styles.phoneNumbersContainer}>
                                <Text style={styles.phoneNumber}>Local:{"  "}
                                    <Text style={{ textDecorationLine: "underline" }}>1234 567 890</Text>
                                </Text>
                                <Text style={styles.phoneNumber}>International:{"  "}
                                    <Text style={{ textDecorationLine: "underline" }}>+1234 567 890</Text>
                                </Text>
                            </View>
                            <View style={styles.separator} />
                            <Text style={styles.website}>Website:{"  "}
                                <Text
                                    style={{ textDecorationLine: "underline", color: "#0058FA" }}
                                    accessibilityRole="link"
                                    onPress={() => Linking.openURL("https://www.company.com")}
                                >
                                    https://www.company.com
                                </Text>
                            </Text>
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
                </SafeAreaView>
            </ScrollView>
            
        </SafeAreaProvider>
    )
}

const styles = StyleSheet.create({
    separator: {
        height: 1,
        backgroundColor: "#b4b4b4",
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
        gap: 10,
    },
    searchInput: {
        borderWidth: 2,
        borderColor: "#bbb",
        borderRadius: 999,
        fontFamily: "Poppins-Regular",
        height: 45,
        paddingHorizontal: 16,
    },
    searchButtonGradient: {
        height: 45,
        borderRadius: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    searchButtonText: {
        color: "white",
        fontFamily: "Poppins-Bold",
        fontSize: 16,
    },
    resultsContainer: {
        marginTop: 36,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    companyName: {
        fontFamily: "Poppins-Bold",
        fontSize: 24,

    },
    phoneNumbersContainer: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
    },
    phoneNumber: {
        fontFamily: "Poppins-Regular",
        fontSize: 18,
    },
    website: {
        fontFamily: "Poppins-Regular",
        fontSize: 18,
    },
    disclaimerContainer: {
        marginTop: 36,
    },
    disclaimerTitle: {
        fontFamily: "Poppins-SemiBold",
    },
    disclaimerText: {
        fontFamily: "Poppins-ExtraLightItalic",
    }
});