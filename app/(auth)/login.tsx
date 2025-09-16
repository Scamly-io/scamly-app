import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { Image, ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function Login() {

    const [fontsLoaded] = useFonts({
        "Poppins-Regular": require("@/assets/fonts/Poppins-Regular.ttf"),
        "Poppins-Bold": require("@/assets/fonts/Poppins-Bold.ttf"),
    });

    return (
        <ImageBackground
            source={require("@/assets/page-assets/bg_vertical.jpg")}
            style={styles.background}
        >
            <SafeAreaProvider>
                <SafeAreaView style={styles.mainContainer}>
                    <View style={styles.loginContainer}>
                        <Image
                            source={require("@/assets/page-assets/logo_long_light.png")}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.loginText}>Sign in</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputText}>Email</Text>
                            <TextInput
                                placeholder="Email"
                                style={styles.input}
                            />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputText}>Password</Text>
                            <TextInput
                                placeholder="Password"
                                style={styles.input}
                                secureTextEntry={true}
                            />
                        </View>
                        <TouchableOpacity style={styles.loginButton}>
                            <LinearGradient
                                colors={["#5426F8", "#CF68FF"]}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={styles.loginButtonGradient}
                            >
                                <Text style={styles.loginButtonText}>Sign in</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
                
            </SafeAreaProvider>
        </ImageBackground>
    )
}

const styles = StyleSheet.create({
    background: {
        flex: 1
    },
    mainContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16
    },
    loginContainer: {
        backgroundColor: "white",
        width: "100%",
        maxWidth: 400,
        paddingHorizontal: 20,
        paddingVertical: 40,
        borderRadius: 10,
        display: "flex",
    },
    logo: {
        height: 60,
        width: "100%"
    },
    loginText: {
        fontSize: 30,
        marginTop: 50,
        fontFamily: "Poppins-Regular",
    },
    inputContainer: {
        marginTop: 20,
        display: "flex",
        justifyContent: "center",
    },
    inputText: {
        fontSize: 20,
        fontFamily: "Poppins-Regular",
    },
    input: {
        backgroundColor: "#EAEAEA",
        borderRadius: 999,
        paddingLeft: 16,
        marginTop: 5,
        fontSize: 18,
        fontFamily: "Poppins-Regular",
    },
    loginButton: {
        marginTop: 10,
    },
    loginButtonGradient: {
        borderRadius: 999,
        paddingVertical: 10,
        marginTop: 10,
        fontSize: 18,
        fontFamily: "Poppins-Regular",
    },
    loginButtonText: {
        color: "white",
        fontSize: 18,
        fontFamily: "Poppins-Bold",
        textAlign: "center",
    }
})