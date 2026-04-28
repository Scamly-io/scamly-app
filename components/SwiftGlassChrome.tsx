import { supportsIos26SwiftGlass } from "@/utils/ios-swift-glass";
import { Platform, type StyleProp, type ViewStyle } from "react-native";

function loadSwiftUi(): typeof import("@expo/ui/swift-ui") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@expo/ui/swift-ui");
}

function loadModifiers(): typeof import("@expo/ui/swift-ui/modifiers") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@expo/ui/swift-ui/modifiers");
}

type HostStyle = StyleProp<ViewStyle>;

/** Circular back control: SF chevron + glass (iOS 26+ only). */
export function SwiftGlassCircularBackButton({
  onPress,
  disabled,
  hostStyle,
}: {
  onPress: () => void;
  disabled?: boolean;
  hostStyle?: HostStyle;
}) {
  if (Platform.OS !== "ios" || !supportsIos26SwiftGlass()) return null;
  const { Host, Button } = loadSwiftUi();
  const { buttonStyle, controlSize, disabled: modDisabled, fixedSize, labelStyle } = loadModifiers();
  return (
    <Host matchContents style={hostStyle}>
      <Button
        label="Back"
        systemImage="chevron.left"
        onPress={onPress}
        modifiers={[
          labelStyle("iconOnly"),
          buttonStyle("glass"),
          controlSize("large"),
          fixedSize({ horizontal: true, vertical: true }),
          ...(disabled ? [modDisabled()] : []),
        ]}
      />
    </Host>
  );
}

/** Primary onboarding-style CTA with accent tint and glass prominent (iOS 26+). */
export function SwiftGlassAccentPillButton({
  label,
  onPress,
  disabled,
  tintHex,
  titleColorHex,
  hostStyle,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tintHex: string;
  /** Label color; glass + `tint` alone often hides string `label` — use theme inverse (or white). */
  titleColorHex: string;
  hostStyle?: HostStyle;
}) {
  if (Platform.OS !== "ios" || !supportsIos26SwiftGlass()) return null;
  const { Host, Button, Text } = loadSwiftUi();
  const { buttonStyle, disabled: modDisabled, fixedSize, foregroundStyle, tint } = loadModifiers();
  return (
    <Host matchContents style={hostStyle}>
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle("glassProminent"),
          tint(tintHex),
          fixedSize({ horizontal: true, vertical: true }),
          ...(disabled ? [modDisabled()] : []),
        ]}
      >
        <Text modifiers={[foregroundStyle(titleColorHex)]}>{label}</Text>
      </Button>
    </Host>
  );
}

/**
 * Muted glass pill (e.g. disabled-looking "Finish tutorial" before scan completes).
 */
export function SwiftGlassMutedPillButton({
  label,
  onPress,
  disabled,
  tintHex,
  titleColorHex,
  hostStyle,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  tintHex: string;
  titleColorHex: string;
  hostStyle?: HostStyle;
}) {
  if (Platform.OS !== "ios" || !supportsIos26SwiftGlass()) return null;
  const { Host, Button, Text } = loadSwiftUi();
  const { buttonStyle, disabled: modDisabled, fixedSize, foregroundStyle, tint } = loadModifiers();
  return (
    <Host matchContents style={hostStyle}>
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle("glass"),
          tint(tintHex),
          fixedSize({ horizontal: true, vertical: true }),
          modDisabled(disabled),
        ]}
      >
        <Text modifiers={[foregroundStyle(titleColorHex)]}>{label}</Text>
      </Button>
    </Host>
  );
}

/** Row back control with "Back" text + chevron (iOS 26+). */
export function SwiftGlassLabeledBackButton({
  onPress,
  text,
  textColorHex,
  hostStyle,
}: {
  onPress: () => void;
  text?: string;
  textColorHex: string;
  hostStyle?: HostStyle;
}) {
  if (Platform.OS !== "ios" || !supportsIos26SwiftGlass()) return null;
  const { Host, Button, HStack, Image, Text } = loadSwiftUi();
  const { buttonStyle, controlSize, fixedSize, foregroundStyle } = loadModifiers();
  const backText = text ?? "Back";
  return (
    <Host matchContents style={hostStyle}>
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle("glass"),
          controlSize("regular"),
          fixedSize({ horizontal: true, vertical: true }),
        ]}
      >
        <HStack spacing={6} alignment="center" modifiers={[fixedSize({ horizontal: true, vertical: true })]}>
          <Image systemName="chevron.left" size={15} color={textColorHex} />
          <Text modifiers={[foregroundStyle(textColorHex)]}>{backText}</Text>
        </HStack>
      </Button>
    </Host>
  );
}

/** Icon-only close (xmark) with glass (iOS 26+). */
export function SwiftGlassCloseIconButton({
  onPress,
  hostStyle,
}: {
  onPress: () => void;
  hostStyle?: HostStyle;
}) {
  if (Platform.OS !== "ios" || !supportsIos26SwiftGlass()) return null;
  const { Host, Button } = loadSwiftUi();
  const { buttonStyle, controlSize, fixedSize, labelStyle } = loadModifiers();
  return (
    <Host matchContents style={hostStyle}>
      <Button
        label="Close"
        systemImage="xmark"
        onPress={onPress}
        modifiers={[
          labelStyle("iconOnly"),
          buttonStyle("glass"),
          controlSize("regular"),
          fixedSize({ horizontal: true, vertical: true }),
        ]}
      />
    </Host>
  );
}

/** Floating "Give Feedback" style pill with accent glass prominent (iOS 26+). */
export function SwiftGlassComposerPill({
  label,
  onPress,
  tintHex,
  titleColorHex,
  hostStyle,
}: {
  label: string;
  onPress: () => void;
  tintHex: string;
  titleColorHex: string;
  hostStyle?: HostStyle;
}) {
  if (Platform.OS !== "ios" || !supportsIos26SwiftGlass()) return null;
  const { Host, Button, HStack, Image, Text } = loadSwiftUi();
  const { buttonStyle, fixedSize, foregroundStyle, tint } = loadModifiers();
  return (
    <Host matchContents style={hostStyle}>
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle("glassProminent"),
          tint(tintHex),
          fixedSize({ horizontal: true, vertical: true }),
        ]}
      >
        <HStack spacing={8} alignment="center" modifiers={[fixedSize({ horizontal: true, vertical: true })]}>
          <Image systemName="plus.circle.fill" size={18} color={titleColorHex} />
          <Text modifiers={[foregroundStyle(titleColorHex)]}>{label}</Text>
        </HStack>
      </Button>
    </Host>
  );
}

/**
 * iOS 26+ SwiftUI `Menu` with a glass-styled trigger built from SwiftUI primitives.
 * Returns null when not applicable; caller renders the usual RN `trigger` instead.
 */
export function SwiftGlassMenu({
  options,
  onSelect,
  glassTrigger,
}: {
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
  glassTrigger: { variant: "filter"; title: string; textColor: string; iconColor: string } | { variant: "sortIcons"; iconColor: string };
}) {
  if (Platform.OS !== "ios" || !supportsIos26SwiftGlass()) return null;
  const { Host, Menu, Button: MenuButton, HStack, Text, Image } = loadSwiftUi();
  const { buttonStyle, fixedSize, foregroundStyle, padding } = loadModifiers();

  const label =
    glassTrigger.variant === "filter" ? (
      <HStack spacing={6} alignment="center" modifiers={[fixedSize({ horizontal: true, vertical: true })]}>
        <Text modifiers={[foregroundStyle(glassTrigger.textColor)]}>{glassTrigger.title}</Text>
        <Image systemName="chevron.down" size={14} color={glassTrigger.iconColor} />
      </HStack>
    ) : (
      <HStack spacing={6} alignment="center" modifiers={[fixedSize({ horizontal: true, vertical: true })]}>
        <Image systemName="arrow.up.arrow.down" size={16} color={glassTrigger.iconColor} />
        <Image systemName="chevron.down" size={12} color={glassTrigger.iconColor} />
      </HStack>
    );

  return (
    <Host matchContents>
      <Menu
        label={label}
        modifiers={[
          buttonStyle("glass"),
          padding({ horizontal: 10, vertical: 8 }),
          fixedSize({ horizontal: true, vertical: true }),
        ]}
      >
        {options.map((opt) => (
          <MenuButton key={opt.value} label={opt.label} onPress={() => onSelect(opt.value)} />
        ))}
      </Menu>
    </Host>
  );
}
