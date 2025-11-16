import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function ArticleDetail() {

    const { id } = useLocalSearchParams<{ id: string }>();

    return (
        <View>
            <Text>{id}</Text>
        </View>
    )
}