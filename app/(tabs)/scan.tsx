import CollapsibleHeaderScreen from "@/components/CollapsibleHeaderScreen";
import HalfGradientDivider from "@/components/HalfGradientDivider";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { CheckCircle, Shield, TriangleAlert, Upload, XCircle } from "lucide-react-native";
import { useState } from "react";
import { Alert, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ScanResults = {
    isScam: boolean;
    riskLevel: "low" | "medium" | "high";
    confidence: number;
    detections: {
        type: string;
        text: string;
        severity: "low" | "medium" | "high";
    }[];
}

export default function Scan() {
    const [imageSelected, setImageSelected] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState<ScanResults | null>(null)
    const [aspectRatio, setAspectRatio] = useState<number>(1);

    const mockResults = {
        isScam: false,
        riskLevel: 'low', // low, medium, high
        confidence: 87,
        detections: [
            { type: 'grammar', text: 'Poor grammar and spelling errors detected', severity: 'low' },
            { type: 'urgency', text: 'Creates false sense of urgency', severity: 'high' },
            { type: 'link', text: 'Contains suspicious links', severity: 'high' },
            { type: 'sender', text: 'Sender from unknown or unverified source', severity: 'medium' },
            { type: 'request', text: 'Requests sensitive personal information', severity: 'high' }
        ]
    };

    async function handleScan() {
        if (!imageSelected) return;
        setResults(mockResults);
    }

    async function pickImage() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Error", "We need permission to access your photos to upload images.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            setImageSelected(true);

            Image.getSize(result.assets[0].uri, (width, height) => {
                setAspectRatio(width / height);
            });
        }
    }

    function getRiskColour(riskLevel) {
        switch (riskLevel) {
            case "low": return ["#10b981", "#00bc7d"];
            case "medium": return ["#f59e0b", "#ff8904"];
            case "high": return ["#fb2c36", "#ff6900"];
        }
    }

    function getSeverityIcon(severity) {
        switch (severity) {
            case "low": return <TriangleAlert size={24} color="#10B981" />;
            case "medium": return <TriangleAlert size={24} color="#F59E0B" />;
            case "high": return <XCircle size={24} color="#EF4444" />;
        }
    }

    return (
        <CollapsibleHeaderScreen
            headerProps={{
                title: "Scam Scanner",
                imageUrl: require("@/assets/images/page-images/ai.png"),
                subtitle: "Screenshot a text or email and scan it to check for scams.",
            }}
            contentContainerStyle={{ flexGrow: 1 }}
        >
            <SafeAreaView edges={["bottom", "left", "right"]} style={styles.container}>
                    <View style={styles.elevatedBoxContainer}>
                        <View style={styles.uploadBoxContent}>
                            {imageSelected ? (
                                <View style={styles.uploadedImageContainer}>
                                    <Image source={{ uri: image }} style={[styles.uploadedImage, { aspectRatio: aspectRatio }]} resizeMode="contain" />
                                    <View style={styles.uploadedImageTextContainer}>
                                        <CheckCircle size={24} color="#7C3AED" />
                                        <Text style={styles.uploadedImageText}>Image uploaded</Text>
                                    </View>
                                    <TouchableOpacity 
                                        onPress={() => {
                                            setImage(null);
                                            setImageSelected(false);
                                            setResults(null);
                                    }}>
                                        <Text style={styles.clearButtonText}>Clear</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    <TouchableOpacity style={styles.uploadBoxIconContainer} onPress={pickImage}>
                                        <Upload size={36} color="#7C3AED" />
                                    </TouchableOpacity>
                                    <Text style={styles.uploadBoxTitle}>Upload a Screenshot</Text>
                                </>

                            )}
                        </View>
                    </View>

                    <TouchableOpacity disabled={!imageSelected} style={{ marginTop: 16, opacity: imageSelected ? 1 : 0.5 }} onPress={handleScan}>
                        <LinearGradient
                            colors={["#5426F8", "#CF68FF"]}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={styles.scanButtonGradient}
                            disabled={!imageSelected}
                        >
                            <Text style={styles.scanButtonText}>Scan</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {results ? (
                        <>
                            <View style={styles.scanResultsDividerContainer}>
                                <HalfGradientDivider />
                                <View style={styles.scanResultsTitleContainer}>
                                    <Shield size={18} color="#7C3AED" />
                                    <Text style={styles.scanResultsTitle}>Scan Results</Text>
                                </View>
                                <HalfGradientDivider />
                            </View>

                            <View style={styles.shadowContainer}>
                                <LinearGradient
                                    colors={getRiskColour(results.riskLevel)}
                                    start={{ x: 0, y: 0.5 }}
                                    end={{ x: 1, y: 0.5 }}
                                    style={styles.confidenceContainer}
                                >
                                    <View style={styles.scamResultHeader}>
                                        <View style={styles.scamResultTitleContainer}>
                                            {results.isScam ? <TriangleAlert size={28} color="white" /> : <Shield size={28} color="white" />}
                                            <Text style={styles.scamResultTitle}>
                                                {results.isScam ? "Likely a Scam" : "Looks Safe"}
                                            </Text>
                                        </View>
                                        <Text style={styles.scamResultPercentage}>87%</Text>
                                    </View>
                                    <View style={styles.scamResultDetails}>
                                        <Text style={styles.scamResultDetailText}>
                                            {results.riskLevel.charAt(0).toUpperCase() + results.riskLevel.slice(1)} risk detected
                                        </Text>
                                        <Text style={styles.scamResultDetailText}>Confidence</Text>
                                    </View>

                                    {results.isScam ? (
                                        <View style={styles.scamWarningContainer}>
                                            <Text style={styles.scamWarningText}>⚠️ Do not respond or click any links. Report and delete this message immediately.</Text>
                                        </View>
                                    ): (
                                        <View style={styles.scamWarningContainer}>
                                            <Text style={styles.scamWarningText}>This looks safe. But always be cautious and verify the sender before responding or clicking any links.</Text>
                                        </View>
                                    )}
                                </LinearGradient>
                            </View>
                            

                            <View style={styles.elevatedBoxContainer}>
                                <View style={styles.keyDetectionsHeader}>
                                    <TriangleAlert size={24} color="#ff6900"/>
                                    <Text style={styles.keyDetectionsTitle}>Key Detections</Text>
                                </View>
                                {results.detections.map((detection, index) => (
                                    <View style={styles.keyDetectionsItem} key={index}>
                                        {getSeverityIcon(detection.severity)}
                                        <Text style={styles.keyDetectionsText}>{detection.text}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.shadowContainer}>
                                <LinearGradient 
                                    colors={["#eff6ff", "#eef2ff"]}
                                    start={{ x: 0, y: 0.5 }}
                                    end={{ x: 1, y: 0.5 }}
                                    style={styles.tipsContainer}
                                >
                                    <View style={styles.tipsHeader}>
                                        <Shield size={24} color="#2563EB" />
                                        <Text style={styles.tipsTitle}>Stay Safe</Text>
                                    </View>
                                    <View style={styles.tipsContent}>
                                        <View style={styles.tipsItem}>
                                            <Text style={styles.tipDecorator}>•</Text>
                                            <Text style={styles.tipText}>Never share passwords or financial information via text or email.</Text>
                                        </View>
                                        <View style={styles.tipsItem}>
                                            <Text style={styles.tipDecorator}>•</Text>
                                            <Text style={styles.tipText}>Verfiy the sender through official channels like an organisation's known phone number.</Text>
                                        </View>
                                        <View style={styles.tipsItem}>
                                            <Text style={styles.tipDecorator}>•</Text>
                                            <Text style={styles.tipText}>Be wary of urgent requests or threats.</Text>
                                        </View>
                                        <View style={styles.tipsItem}>
                                            <Text style={styles.tipDecorator}>•</Text>
                                            <Text style={styles.tipText}>Check URL details carefully before clicking any links.</Text>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </View>
                        </>
                    ) : (
                        <></>
                    )}



                    <TouchableOpacity style={styles.howToUseButton} onPress={() => setShowModal(true)}>
                        <Text style={styles.howToUseText}>How to use this feature?</Text>
                    </TouchableOpacity>

                    <Modal
                        animationType="fade"
                        transparent={true}
                        visible={showModal}
                        onRequestClose={() => setShowModal(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                <Text style={styles.modalTitle}>💡 Tip: How to take a good screenshot</Text>
                                <Text style={styles.modalText}>
                                    To get the most accurate scan results, make sure your screenshot clearly shows the key details:
                                    {"\n\n"}- Include the main message or section you want the AI to analyze.
                                    {"\n"}- If relevant, capture contact details (email addresses, phone numbers, etc.) in the same image.
                                    {"\n"}- For long messages or emails, focus on the most suspicious or important parts instead of the entire thread.
                                    {"\n"}- Ensrure the text is easy to read, avoiding blurry or cropped images.
                                    {"\n\n"}Clear, well-framed screenshots help the AI identify potential scam signals more effectively.
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
    container: {
        flex: 1,
        paddingHorizontal: 16,
    },
    shadowContainer: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
    },
    elevatedBoxContainer: {
        marginTop: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
    },
    uploadBoxContent: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    uploadedImageContainer: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F5F3FF",
        borderRadius: 14,
        padding: 24,
        gap: 12,
    },
    uploadedImage: {
        width: "100%",
        maxHeight: 350,
        borderRadius: 14,
    },
    uploadedImageTextContainer: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginTop: 24,
    },
    uploadedImageText: {
        fontFamily: "Poppins-Regular",
        fontSize: 20,
        color: "#7C3AED",
    },
    clearButtonText: {
        textDecorationLine: "underline",
        fontSize: 16,
        color: "#6B7280",
    },
    uploadBoxIconContainer: {
        backgroundColor: "#E0E7FF",
        borderRadius: 14,
        padding: 20,
    },
    uploadBoxTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 20,
        textAlign: "center",
        color: "#374151",
    },
    uploadBoxText: {
        fontFamily: "Poppins-Regular",
        fontSize: 16,
        color: "#6B7280",
    },
    scanButtonGradient: {
        height: 45,
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    scanButtonText: {
        color: "white",
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
    },
    scanResultsDividerContainer: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 32,
    },
    scanResultsTitleContainer: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "white",
        borderRadius: 999,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    scanResultsTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
        color: "#374151",
    },
    confidenceContainer: {
        marginTop: 16,
        borderRadius: 14,
        padding: 16,
    },
    scamResultHeader: {
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
    },
    scamResultTitleContainer: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 6,
    },
    scamResultTitle: {
        fontFamily: "Poppins-Bold",
        fontSize: 20,
        color: "white",
    },
    scamResultPercentage: {
        fontFamily: "Poppins-Bold",
        fontSize: 28,
        color: "white",
        textAlign: "right",
    },
    scamResultDetails: {
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
    },
    scamResultDetailText: {
        fontFamily: "Poppins-Light",
        fontSize: 14,
        color: "white",
    },
    scamWarningContainer: {
        marginTop: 16,
        padding: 16,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: 14,
    },
    scamWarningText: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "white",
    },
    scamWarningTextSafe: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "#1f2937",
    },
    keyDetectionsHeader: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    keyDetectionsTitle: {
        fontFamily: "Poppins-Bold",
        fontSize: 20,
        color: "#1f2937",
    },
    keyDetectionsItem: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        padding: 16,
        backgroundColor: "#f9fafb",
        borderRadius: 14,
    },
    keyDetectionsText: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "#1f2937",
    },
    tipsContainer: {
        marginTop: 16,
        display: "flex",
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: "#dbeafe",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 8,
    },
    tipsHeader: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 12,
    },
    tipsTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 20,
        color: "#1f2937",
    },
    tipsContent: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
    },
    tipsItem: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    tipDecorator: {
        fontFamily: "Poppins-Bold",
        fontSize: 16,
        color: "#2563EB",
    },
    tipText: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "#374151",
    },
    howToUseButton: {
        marginTop: 40,
    },
    howToUseText: {
        fontFamily: "Poppins-Bold",
        fontSize: 14,
        color: "#00598a",
        textAlign: "center",
        textDecorationLine: "underline",
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