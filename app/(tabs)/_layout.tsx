import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "coral" }}>
      <FontAwesome name="home" size={24} color="black" />
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: "Home", 
          tabBarIcon: ({ color, focused }) => {
            return focused ?  (
              <FontAwesome name="home" size={24} color={color} />
             ) : (
              <Feather name="home" size={24} color="black" />
             )
          }
        }}
      />
      <Tabs.Screen name="login" options={{ title: "Login"}}/>
    </Tabs>
  )
}
