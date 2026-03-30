import { ShimmerColors } from "./types";

export const defaultShimmerColors: {
  light: ShimmerColors;
  dark: ShimmerColors;
} = {
  light: {
    text: "#cccccc",
    shimmer: {
      start: "#cccccc",
      middle: "#ffffff",
      end: "#cccccc",
    },
  },
  dark: {
    text: "#cccccc",
    shimmer: {
      start: "gray",
      middle: "#ffffff",
      end: "gray",
    },
  },
};