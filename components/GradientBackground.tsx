import ThemedBackground from "@/components/ThemedBackground";
import { ReactNode } from "react";

/**
 * @deprecated Use ThemedBackground directly instead
 */
export default function GradientBackground({ children }: { children: ReactNode }) {
  return <ThemedBackground>{children}</ThemedBackground>;
}
