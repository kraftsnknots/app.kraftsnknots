import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainScreen from '../pages/MainPage';
import ProductDetailsScreen from "../pages/ProductDetailsPage";

const Stack = createNativeStackNavigator();

export default function ProductStacks() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainScreen} />
      <Stack.Screen name="Details" component={ProductDetailsScreen} />
    </Stack.Navigator>
  );
}

