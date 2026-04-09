/* eslint-disable @typescript-eslint/no-require-imports */
// Avoid loading reanimated/mock (pulls react-native-worklets native init in Jest).
jest.mock("react-native-reanimated", () => {
  const { Pressable } = require("react-native");

  const useSharedValue = (init) => ({ value: init });
  const withSpring = (toValue) => toValue;
  const useAnimatedStyle = () => ({});

  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (Component) => Component ?? Pressable,
      callNative: jest.fn(),
    },
    useSharedValue,
    withSpring,
    useAnimatedStyle,
    createAnimatedComponent: (Component) => Component ?? Pressable,
  };
});
