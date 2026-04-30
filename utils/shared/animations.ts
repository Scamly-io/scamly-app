/**
 * Shared animation configurations for consistent motion across the app
 * Uses react-native-reanimated under the hood
 */

import { FadeIn, FadeInDown, FadeInRight, FadeOut, FadeOutDown } from "react-native-reanimated";

// Standard durations
export const ANIMATION_DURATION = {
  fast: 200,
  normal: 300,
  slow: 400,
};

// Screen entrance animations
export const screenEnter = FadeIn.duration(ANIMATION_DURATION.normal);
export const screenExit = FadeOut.duration(ANIMATION_DURATION.fast);

// List item staggered animations
export const listItemEnter = (index: number, baseDelay: number = 100) =>
  FadeInDown.duration(ANIMATION_DURATION.normal).delay(baseDelay + index * 50);

// Card animations
export const cardEnter = FadeInDown.duration(ANIMATION_DURATION.slow);

// Slide animations
export const slideInRight = (delay: number = 0) =>
  FadeInRight.duration(ANIMATION_DURATION.normal).delay(delay);

// Spring configuration for pressable elements
export const pressSpringConfig = {
  damping: 15,
  stiffness: 300,
};

// Scale values for press feedback
export const PRESS_SCALE = {
  subtle: 0.98,
  normal: 0.96,
  strong: 0.94,
};

