import React, { useState } from "react";
import { FlatList, Modal, Platform, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type NativeMenuProps = {
  trigger: React.ReactNode;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
  /**
   * **iOS:** Pins the SwiftUI `Host` size and disables `matchContents`. Use beside keyboards (e.g.
   * chat composer): `matchContents` can report 0×0 after the text field focuses and the trigger
   * stays invisible until remount.
   * **Android:** Optional `hostStyle` still applies; fixed sizing is not used (Compose `Host` stays `matchContents`).
   */
  fixedHostSize?: { width: number; height: number };
  hostStyle?: StyleProp<ViewStyle>;
};

/**
 * iOS: SwiftUI Menu, Android: Jetpack Compose dropdown. Web / other: modal list.
 * Same pattern as the feature wall in `FeedbackWallModal`.
 * `require` keeps @expo/ui from loading on non-native bundles.
 */
export default function NativeMenu({ trigger, options, onSelect, fixedHostSize, hostStyle }: NativeMenuProps) {
  const [androidMenuExpanded, setAndroidMenuExpanded] = useState(false);

  if (Platform.OS === "ios") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Host, Menu, Button: MenuButton } = require("@expo/ui/swift-ui");
    const pinHost = fixedHostSize != null;
    return (
      <Host
        matchContents={pinHost ? false : true}
        style={pinHost ? [{ width: fixedHostSize.width, height: fixedHostSize.height }, hostStyle] : hostStyle}
      >
        <Menu label={trigger}>
          {options.map((opt: { label: string; value: string }) => (
            <MenuButton key={opt.value} label={opt.label} onPress={() => onSelect(opt.value)} />
          ))}
        </Menu>
      </Host>
    );
  }

  if (Platform.OS === "android") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Host, DropdownMenu, DropdownMenuItem, Text: ComposeText } = require(
      "@expo/ui/jetpack-compose",
    );
    return (
      <Host matchContents style={hostStyle}>
        <DropdownMenu
          expanded={androidMenuExpanded}
          onDismissRequest={() => setAndroidMenuExpanded(false)}
        >
          <DropdownMenu.Trigger>
            <Pressable onPress={() => setAndroidMenuExpanded(true)}>{trigger}</Pressable>
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>
            {options.map((opt: { label: string; value: string }) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => {
                  setAndroidMenuExpanded(false);
                  onSelect(opt.value);
                }}
              >
                <DropdownMenuItem.Text>
                  <ComposeText>{opt.label}</ComposeText>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>
            ))}
          </DropdownMenu.Items>
        </DropdownMenu>
      </Host>
    );
  }

  return <NativeMenuModalFallback options={options} onSelect={onSelect} trigger={trigger} />;
}

function NativeMenuModalFallback({
  trigger,
  options,
  onSelect,
}: NativeMenuProps) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Open menu">
        {trigger}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        >
          <View
            onStartShouldSetResponder={() => true}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius["2xl"],
              borderTopRightRadius: radius["2xl"],
              maxHeight: "50%",
              paddingBottom: insets.bottom + 16,
            }}
          >
            <FlatList
              data={options}
              keyExtractor={(it) => it.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                  style={{ paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.divider }}
                >
                  <Text style={{ color: colors.textPrimary, fontFamily: "Poppins-Regular", fontSize: 16 }}>{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
