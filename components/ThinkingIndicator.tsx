import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export default function ThinkingIndicator() {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    const bounce = (animatedValue: Animated.Value, delay: number) => {
        return Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, { toValue: -4, duration: 220, delay, useNativeDriver: true }),
                Animated.timing(animatedValue, { toValue: 0, duration: 220, useNativeDriver: true }),
                Animated.delay(120),
            ])
        );
    };

    useEffect(() => {
        const a1 = bounce(dot1, 0);
        const a2 = bounce(dot2, 120);
        const a3 = bounce(dot3, 240);
        a1.start();
        a2.start();
        a3.start();
        return () => {
            a1.stop();
            a2.stop();
            a3.stop();
        };
    }, [dot1, dot2, dot3]);

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
            <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
            <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "rgba(37, 99, 235, 0.08)",
        borderColor: "rgba(37, 99, 235, 0.16)",
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        alignSelf: "flex-start",
        flexDirection: "row",
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        backgroundColor: "#1D4ED8",
    },
});

