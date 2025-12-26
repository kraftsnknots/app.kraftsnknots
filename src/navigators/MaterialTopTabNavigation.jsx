import React from "react";
import { StyleSheet, Image, TouchableOpacity, Text, View } from "react-native";
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import ProcessingOrders from "../pages/ProcessingOrders";
import DeliveredOrders from "../pages/DeliveredOrders";
import CancelledOrders from "../pages/CancelledOrders";
import Header from "../components/Header";
import BackButton from "../components/BackButton";

const Tab = createMaterialTopTabNavigator();

export default function MyTabs({ navigation }) {
    return (<>
        <Header />
        <Tab.Navigator screenOptions={{
            tabBarActiveTintColor: "#000",
            tabBarIndicatorStyle: { backgroundColor: "#000" },
            tabBarLabelStyle: { fontWeight: "600" },
        }} >
            <Tab.Screen name="Processing" component={ProcessingOrders} options={({ route }) => ({
                title: `Processing (${route.params?.count || 0})`,
            })} />
            <Tab.Screen name="Delivered" component={DeliveredOrders} options={({ route }) => ({
                title: `Delivered (${route.params?.count || 0})`,
            })} />
            <Tab.Screen name="Cancelled" component={CancelledOrders} options={({ route }) => ({
                title: `Cancelled (${route.params?.count || 0})`,
            })} />
        </Tab.Navigator>
        <BackButton onPress={() => navigation.goBack()} />
    </>
    );
}
const styles = StyleSheet.create({
    actionRow: {
        position: "absolute",
        bottom: 0,
        alignSelf: "center",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: 80,
        height: 50,
        backgroundColor: "#000",
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        zIndex: 999,
        elevation: 10,
    },
    backBtn: { alignItems: "center", }
})