// BottomNavigation.js
import React, { useContext, useEffect, useRef } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Image, View, Text, Animated } from "react-native";

import AccountStack from "./AccountStacks";
import ProductStacks from "./ProductStacks";
import Wishlist from "../pages/WishListPage";
import CartPage from "../pages/CartPage";

import { WishlistCartContext } from "../services/WishlistCartContext";
import LinearGradient from 'react-native-linear-gradient';

const Tab = createBottomTabNavigator();



export default function BottomNavigation() {
  const { wishlist, cart } = useContext(WishlistCartContext);

  // ✅ Ensure counts are safe
  const wishlistCount = wishlist?.length || 0;
  const cartCount = cart?.length || 0;

  // Animated values for bounce
  const wishlistAnim = useRef(new Animated.Value(1)).current;
  const cartAnim = useRef(new Animated.Value(1)).current;

  // Bounce when wishlist changes
  useEffect(() => {
    if (wishlistCount > 0) {
      Animated.sequence([
        Animated.spring(wishlistAnim, { toValue: 1.4, useNativeDriver: true }),
        Animated.spring(wishlistAnim, { toValue: 1, useNativeDriver: true }),
      ]).start();
    }
  }, [wishlistCount]);

  // Bounce when cart changes
  useEffect(() => {
    if (cartCount > 0) {
      Animated.sequence([
        Animated.spring(cartAnim, { toValue: 1.4, useNativeDriver: true }),
        Animated.spring(cartAnim, { toValue: 1, useNativeDriver: true }),
      ]).start();
    }
  }, [cartCount]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconSource;

          switch (route.name) {
            case "Home":
              iconSource = require("../assets/icons/home-white.png");
              break;
            case "Wishlist":
              iconSource = require("../assets/icons/heart-white.png");
              break;
            case "Cart":
              iconSource = require("../assets/icons/cart-white.png");
              break;
            case "Account":
              iconSource = require("../assets/icons/user-white.png");
              break;
          }

          // Choose animation value
          const scaleAnim =
            route.name === "Wishlist" ? wishlistAnim : cartAnim;

          return (
            <View>
              <Image
                source={iconSource}
                style={{ width: size, height: size, tintColor: color }}
                resizeMode="contain"
              />

              {/* Wishlist Badge */}
              {route.name === "Wishlist" && wishlistCount > 0 && (
                <Animated.View
                  style={{
                    transform: [{ scale: scaleAnim }],
                    position: "absolute",
                    right: -6,
                    top: -3,
                    backgroundColor: "red",
                    borderRadius: 10,
                    paddingHorizontal: 5,
                    minWidth: 18,
                    height: 18,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    {wishlistCount}
                  </Text>
                </Animated.View>
              )}

              {/* Cart Badge */}
              {route.name === "Cart" && cartCount > 0 && (
                <Animated.View
                  style={{
                    transform: [{ scale: scaleAnim }],
                    position: "absolute",
                    right: -6,
                    top: -3,
                    backgroundColor: "red",
                    borderRadius: 10,
                    paddingHorizontal: 5,
                    minWidth: 18,
                    height: 18,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    {cartCount}
                  </Text>
                </Animated.View>
              )}
            </View>
          );
        },
        tabBarActiveTintColor: "#f0878c",
        tabBarInactiveTintColor: "#555",
        headerShown: false,
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 90,
          borderTopWidth: 0,
          backgroundColor: 'transparent', // REQUIRED
        },

        tabBarBackground: () => (
          <LinearGradient
            colors={['rgba(0, 0, 0,0.95)', 'rgba(0, 0, 0,1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={ProductStacks} />
      <Tab.Screen name="Wishlist" component={Wishlist} />
      <Tab.Screen name="Cart" component={CartPage} />
      <Tab.Screen name="Account" component={AccountStack} />
    </Tab.Navigator>
  );
}
