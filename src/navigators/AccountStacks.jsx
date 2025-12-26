// AccountStack.jsx
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  onAuthStateChanged,
} from "@react-native-firebase/auth";
import LoginScreen from "../pages/LoginScreen";
import SignupScreen from "../pages/SignupScreen";
import AccountScreen from "../pages/AccountScreen";
import ForgotPass from "../pages/ForgotPassScreen"
import EditProfile from "../pages/EditProfile"
import ManageDiscountCodes from "../pages/ManageDiscountCodes";
import AddProductPage from "../pages/AddProductPage";
import ShippingAddresses from "../pages/ShippingAddresses";
import MyTabs from "./MaterialTopTabNavigation";
import CustomerCare from "../pages/CustomerCare";
import PendingPaymentOrders from "../pages/PendingPaymentOrders"

const Stack = createNativeStackNavigator();

// initialize auth once with app
const auth = getAuth(getApp());

export default function AccountStack() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      setLoading(false);
    });

    return unsubscribe; // ✅ cleanup listener
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user && user.emailVerified ? (
        <>
          <Stack.Screen name="AccountHome" component={AccountScreen} />
          <Stack.Screen name="EditProfile" component={EditProfile} />
          <Stack.Screen name="ManageOffers" component={ManageDiscountCodes} />
          <Stack.Screen name="AddProducts" component={AddProductPage} />
          <Stack.Screen name="ShippingAddresses" component={ShippingAddresses} />
          <Stack.Screen name="TopTabs" component={MyTabs} />
          <Stack.Screen name="CustomerCare" component={CustomerCare} />
          <Stack.Screen name="PendingPaymentOrders" component={PendingPaymentOrders} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgotPass" component={ForgotPass} />
        </>
      )}
    </Stack.Navigator>
  );
}
