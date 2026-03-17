import { useTheme } from "@/theme";
import { Search, X } from "lucide-react-native";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type PickerModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: readonly string[];
  onSelect: (value: string) => void;
  searchable?: boolean;
};

export default function PickerModal({
  visible,
  onClose,
  title,
  options,
  onSelect,
  searchable = false,
}: PickerModalProps) {
  const { colors, radius } = useTheme();
  const [search, setSearch] = useState("");

  const filtered = searchable
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = (value: string) => {
    onSelect(value);
    setSearch("");
    onClose();
  };

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <Pressable
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              borderRadius: radius["2xl"],
            },
          ]}
          onPress={() => {}}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {title}
            </Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {searchable && (
            <View
              style={[
                styles.searchWrapper,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderRadius: radius.lg,
                  borderColor: colors.border,
                },
              ]}
            >
              <Search size={18} color={colors.textTertiary} />
              <TextInput
                placeholder="Search..."
                placeholderTextColor={colors.textTertiary}
                style={[styles.searchInput, { color: colors.textPrimary }]}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            style={styles.modalList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.modalOption,
                  {
                    backgroundColor: pressed
                      ? colors.pressedOverlay
                      : "transparent",
                    borderBottomColor: colors.divider,
                  },
                ]}
                onPress={() => handleSelect(item)}
              >
                <Text
                  style={[styles.modalOptionText, { color: colors.textPrimary }]}
                >
                  {item}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  No results found
                </Text>
              </View>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "70%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    height: "100%",
  },
  modalList: {
    flexGrow: 0,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
  },
  emptyList: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
});
