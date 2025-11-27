import GradientBackground from "@/components/GradientBackground";
import { supabase } from "@/utils/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Login screen component allowing users to sign in with their email and password.
 * Redirects authenticated users to the home screen upon successful login.
 */
export default function Login() {
    // User's email input
    const [email, setEmail] = useState("");
    // User's password input
    const [password, setPassword] = useState("");
    // Loading state during authentication
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    // Handles user authentication and redirects to home on success
    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please enter an email and password");
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                Alert.alert("Error", error.message);
                setLoading(false);
                return;
            }

            // Successfully logged in - redirect to home screen
            router.replace("/home");

        } catch (error) {
            Alert.alert("Error", "Something went wrong while logging in. Please try again.");
            setLoading(false);
        }
    }

    return (
        <GradientBackground>
            <SafeAreaView style={styles.safeArea}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.container}
                    >
                        <View style={styles.card}>
                            <Image
                                source={require("@/assets/images/page-images/logo_long_light.png")}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                            
                            <Text style={styles.headerText}>Welcome Back</Text>
                            <Text style={styles.subHeaderText}>Sign in to continue</Text>

                            <View style={styles.inputContainer}>
                                <View style={styles.inputWrapper}>
                                    <Mail size={20} color="#ad46ff" style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="Email"
                                        placeholderTextColor="#9ca3af"
                                        style={styles.input}
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                </View>
                                <View style={styles.inputWrapper}>
                                    <Lock size={20} color="#ad46ff" style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="Password"
                                        placeholderTextColor="#9ca3af"
                                        style={styles.input}
                                        secureTextEntry={true}
                                        value={password}
                                        onChangeText={setPassword}
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={styles.loginButton} 
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={["#5426F8", "#CF68FF"]}
                                    start={{ x: 0, y: 0.5 }}
                                    end={{ x: 1, y: 0.5 }}
                                    style={styles.loginButtonGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.loginButtonText}>Sign in</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <View style={styles.disclaimer}>
                                <Text style={styles.disclaimerText}>
                                    New here? You'll need to create an account through our online dashboard.
                                </Text>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
            </SafeAreaView>
        </GradientBackground>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    card: {
        backgroundColor: "white",
        width: "100%",
        maxWidth: 400,
        padding: 30,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        alignItems: "center",
    },
    logo: {
        width: 200,
        height: 60,
        marginBottom: 20,
    },
    headerText: {
        fontSize: 24,
        fontFamily: "Poppins-Bold",
        color: "#1f2937",
        marginBottom: 4,
    },
    subHeaderText: {
        fontSize: 16,
        fontFamily: "Poppins-Regular",
        color: "#6b7280",
        marginBottom: 30,
    },
    inputContainer: {
        width: "100%",
        gap: 16,
        marginBottom: 24,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F5F5",
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: "Poppins-Regular",
        color: "#1f2937",
        height: "100%",
        textAlignVertical: "center",
    },
    loginButton: {
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#5426F8",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    loginButtonGradient: {
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    loginButtonText: {
        color: "white",
        fontSize: 16,
        fontFamily: "Poppins-Bold",
    },
    disclaimer: {
        marginTop: 24,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    disclaimerText: {
        color: "#6b7280",
        fontSize: 14,
        fontFamily: "Poppins-Regular",
        textAlign: "center",
        lineHeight: 20,
    }
})
