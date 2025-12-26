import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/pages/HomePage';
import Checkout from './src/pages/Checkout';
import AddProductPage from "./src/pages/AddProductPage";
import BottomNavigation from './src/navigators/BottomNavigation';
import { WishlistCartProvider } from "./src/services/WishlistCartContext";
import PaymentSuccess from "./src/pages/PaymentSuccess";
import OrderDetails from './src/pages/OrderDetails';
import './src/firebase/rnFirebaseConfig';



const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <WishlistCartProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="HomePage" component={HomeScreen} />
          <Stack.Screen name="BottomNavigation" component={BottomNavigation} />
          <Stack.Screen name="AddProduct" component={AddProductPage} />
          <Stack.Screen name="Checkout" component={Checkout} />
          <Stack.Screen name="PaymentSuccess" component={PaymentSuccess} />
          <Stack.Screen name="OrderDetails" component={OrderDetails} />
        </Stack.Navigator>
      </NavigationContainer>
    </WishlistCartProvider>
  );
}
