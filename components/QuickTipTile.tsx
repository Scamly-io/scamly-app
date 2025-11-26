import { router } from "expo-router";
import * as Icons from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type QuickTipsTileProps = {
    slug: string;
    title: string;
    description: string;
    icon: string;
    iconColour: string;
    iconBackground: string;
    readMoreVisible: boolean;
}

type DynamicIconProps = {
    name: string;
    color: string;
    size: number;
}

// Helper function to allow the icons to be pulled from the database
function DynamicIcon({name, size = 24, color}: DynamicIconProps) {

    // If the name is not capitalised then it wont render
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    const IconComponent = (Icons as Record<string, any>)[formattedName];

    if (!IconComponent) {
        return <Icons.HelpCircle size={size} color={color} />;
    }

    return <IconComponent size={size} color={color} />;
}

export default function QuickTipTile({ slug, title, description, icon, iconColour, iconBackground, readMoreVisible }: QuickTipsTileProps) {
    return (
        <TouchableOpacity style={styles.quickTipsItem} onPress={() => router.push(`/learn/${slug}`)}>
            <View style={styles.quickTipsItemContent}>
                <Text style={styles.quickTipsItemTitle}>{title}</Text>
                <Text style={styles.quickTipsItemDescription}>{description}</Text>
                {readMoreVisible && (
                    <View style={styles.quickTipsItemButton}>
                        <Text style={styles.quickTipsItemButtonText}>Read More</Text>
                        <Icons.ChevronRight size={16} color="#ad46ff" />
                    </View>
                )}
            </View>
            <View style={[styles.quickTipsItemIcon, { backgroundColor: iconBackground }]}>
                <DynamicIcon name={icon} size={24} color={iconColour} />
            </View>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    quickTipsItem: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "white",
        gap: 12,
        borderRadius: 14,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    quickTipsItemContent: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        flexShrink: 1,
        gap: 8,
    },
    quickTipsItemIcon: {
        padding: 10,
        borderRadius: 10,
    },
    quickTipsItemTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 16,
        color: "#1e2939",
    },
    quickTipsItemDescription: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "#1e2939",
    },
    quickTipsItemButton: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    quickTipsItemButtonText: {
        fontFamily: "Poppins-Light",
        fontSize: 14,
        color: "#ad46ff",
    },
})