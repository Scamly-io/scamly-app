import { supabase } from "@/utils/supabase";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function Home() {

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/login");
    }

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text>Home</Text>
            <TouchableOpacity onPress={handleLogout} style={{ marginTop: 20, backgroundColor: "coral", padding: 10, borderRadius: 5 }}>
                <Text>Logout</Text>
            </TouchableOpacity>
        </View>
    );
}