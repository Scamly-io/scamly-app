import Button from "@/components/Button";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ActivityIndicator, Text } from "react-native";

jest.mock("@/theme", () => ({
  useTheme: () => ({
    colors: {
      accent: "#111",
      accentMuted: "#222",
      error: "#f00",
      textInverse: "#fff",
    },
    radius: { lg: 8 },
    shadows: { md: {} },
  }),
}));

describe("Button", () => {
  it("should invoke onPress when pressed and enabled", () => {
    const onPress = jest.fn();

    render(<Button onPress={onPress}>Go</Button>);

    fireEvent.press(screen.getByText("Go"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("should not invoke onPress when disabled", () => {
    const onPress = jest.fn();

    render(
      <Button onPress={onPress} disabled>
        Go
      </Button>
    );

    fireEvent.press(screen.getByText("Go"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("should swap label for an activity indicator when loading", () => {
    const { UNSAFE_getAllByType } = render(
      <Button onPress={() => {}} loading>
        Go
      </Button>
    );

    expect(screen.queryByText("Go")).toBeNull();
    expect(UNSAFE_getAllByType(ActivityIndicator)).toHaveLength(1);
  });

  it("should render icon alongside label when provided", () => {
    render(
      <Button onPress={() => {}} icon={<Text testID="icon">I</Text>}>
        Go
      </Button>
    );

    expect(screen.getByTestId("icon")).toBeTruthy();
    expect(screen.getByText("Go")).toBeTruthy();
  });
});

