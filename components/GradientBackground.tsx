import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";

export default function GradientBackground({ children }: { children: ReactNode }) {
    return (
        <LinearGradient
            colors={["#e6f1ff", "#faf5ff", "#fdf2f8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
        >
            {children}
        </LinearGradient>
    )
}