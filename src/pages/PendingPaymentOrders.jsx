import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    StyleSheet,
    Animated
} from "react-native";
import {
    getFirestore,
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
} from "@react-native-firebase/firestore";
import { getAuth } from "@react-native-firebase/auth";
import ShimmerPlaceHolder from "react-native-shimmer-placeholder";
import LinearGradient from "react-native-linear-gradient";
import Header from "../components/Header";

export default function PendingPaymentOrders({ navigation }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [active, setActive] = useState(1)

    const db = getFirestore();
    const user = getAuth().currentUser;

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const ordersQuery = query(
            collection(db, "failedOrders"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(
            ordersQuery,
            (snapshot) => {
                const fetchedOrders = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setOrders(fetchedOrders);

                setLoading(false);
            },
            (error) => {
                console.error("Error fetching orders:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (orders.length >= 0) {
            navigation.setParams({ count: orders.length });
        }
    }, [orders]);


    const renderShimmerOrder = (index) => {
        const productCount = Math.floor(Math.random() * 3) + 1;
        return (
            <View key={index} style={styles.orderCard}>
                <ShimmerPlaceHolder
                    LinearGradient={LinearGradient}
                    style={{ width: "50%", height: 15, marginBottom: 6, borderRadius: 5 }}
                />
                <ShimmerPlaceHolder
                    LinearGradient={LinearGradient}
                    style={{ width: "70%", height: 12, marginBottom: 10, borderRadius: 5 }}
                />
                {[...Array(productCount)].map((_, i) => (
                    <View key={i} style={{ flexDirection: "row", marginBottom: 10 }}>
                        <ShimmerPlaceHolder
                            LinearGradient={LinearGradient}
                            style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12 }}
                        />
                        <View style={{ flex: 1 }}>
                            <ShimmerPlaceHolder
                                LinearGradient={LinearGradient}
                                style={{ width: "60%", height: 12, marginBottom: 4, borderRadius: 5 }}
                            />
                            <ShimmerPlaceHolder
                                LinearGradient={LinearGradient}
                                style={{ width: "40%", height: 12, marginBottom: 4, borderRadius: 5 }}
                            />
                            <ShimmerPlaceHolder
                                LinearGradient={LinearGradient}
                                style={{ width: "30%", height: 12, borderRadius: 5 }}
                            />
                        </View>
                    </View>
                ))}
                <ShimmerPlaceHolder
                    LinearGradient={LinearGradient}
                    style={{ width: "30%", height: 15, marginTop: 6, borderRadius: 5 }}
                />
            </View>
        );
    };

    const renderOrderItem = (item) => {
        return (
            <TouchableOpacity
                style={[styles.orderCard, { backgroundColor: "#fff" }]}
                onPress={() => navigation.navigate("OrderDetails", { orderId: item.id, pageName: "failedOrders" })}
            >
                <View style={styles.orderHeader}>
                    <Text style={styles.orderId}>{item.id}</Text>
                    <Text style={styles.orderDate}>
                        {new Date(item.createdAt?.toDate?.() || item.createdAt).toLocaleString(
                            "en-US",
                            {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "numeric",
                                hour12: true,
                            }
                        )}
                    </Text>
                </View>

                <View style={styles.productsPreview}>
                    {item.cartItems?.slice(0, 2).map((p, i) => (
                        <View key={i} style={styles.productRow}>
                            <Image source={{ uri: p.image }} style={styles.productImage} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.productTitle}>{p.title}</Text>
                                <Text style={styles.productDetails}>
                                    {p.options?.map((o) => `${o.name}: ${o.value}`).join(", ")}
                                </Text>
                                <Text style={styles.productPrice}>₹ {p.price}</Text>
                            </View>
                        </View>
                    ))}
                    {item.cartItems.length > 2 && (
                        <Text style={styles.moreProducts}>
                            +{item.cartItems.length - 2} more items
                        </Text>
                    )}
                </View>

                <View style={styles.orderFooter}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>₹ {item.total?.toFixed(2)}</Text>
                    <View
                        style={[
                            styles.statusBadge,
                            {
                                backgroundColor: "#eee",
                            },
                        ]}
                    >
                        <Text
                            style={{
                                color: "red",
                                fontWeight: "600",
                                fontSize: 11.5,
                                textTransform: "capitalize",
                            }}
                        >
                            {item.status}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (!user) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyIcon}>🔐</Text>
                <Text style={styles.emptyText}>Login Required</Text>
                <Text style={styles.emptySubText}>
                    Please log in to view your orders.
                </Text>
                <TouchableOpacity
                    onPress={() =>
                        navigation.navigate("BottomNavigation", {
                            screen: "Account",
                            params: { screen: "Login" },
                        })
                    }
                    style={styles.loginBtn}
                >
                    <Text style={styles.loginText}>Go to Login</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: "#F7F7F7" }}>
            <Header />
            <View style={styles.tabContainer}>
                <TouchableOpacity style={styles.tabBack} onPress={() => navigation.goBack()}>
                    <Image source={require('../assets/icons/back-grey.png')} style={{ height: 35, width: 35 }} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabPending} onPress={() => setActive(1)}>
                    <Text style={[styles.tabLabel, active === 1 && styles.activeTabLabel]}>Payment Failed Orders</Text>
                </TouchableOpacity>
                <Animated.View
                    style={[
                        styles.indicator,
                        { left: active === 0 ? "0%" : "30%" } // animate this value for smooth transition
                    ]}
                />
            </View>

            {loading ? (
                <FlatList
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.container}
                    data={[1, 2, 3, 4]}
                    keyExtractor={(item) => item.toString()}
                    renderItem={({ item, index }) => renderShimmerOrder(index)}
                    showsVerticalScrollIndicator={false}
                />
            ) : orders.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📦</Text>
                    <Text style={styles.emptyText}>No Orders Yet</Text>
                    <Text style={styles.emptySubText}>
                        When you place an order, it’ll appear here.
                    </Text>
                </View>
            ) : (
                <FlatList
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.container}
                    data={orders}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => renderOrderItem(item)}
                    showsVerticalScrollIndicator={false}
                />
            )}


        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    orderCard: {
        borderRadius: 16,
        padding: 16,
        marginVertical: 10,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
        elevation: 5,
    },
    orderHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    orderId: { fontSize: 14, fontWeight: "700", color: "#111" },
    orderDate: { fontSize: 12, color: "#777" },
    productsPreview: { marginBottom: 12 },
    productRow: { flexDirection: "row", marginBottom: 10 },
    productImage: { width: 60, height: 60, borderRadius: 8 },
    productTitle: { fontSize: 14, fontWeight: "600", color: "#111" },
    productDetails: { fontSize: 12, color: "#777", marginVertical: 2 },
    productPrice: { fontSize: 14, fontWeight: "600", color: "#000" },
    moreProducts: { fontSize: 12, color: "#999", fontStyle: "italic" },
    orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    totalLabel: { fontSize: 14, color: "#555", fontWeight: "600" },
    totalValue: { fontSize: 16, fontWeight: "700", color: "#000" },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
    emptyIcon: { fontSize: 50, marginBottom: 12 },
    emptyText: { fontSize: 20, fontWeight: "700", color: "#111" },
    emptySubText: { fontSize: 14, color: "#777", textAlign: "center" },
    centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    loginBtn: { backgroundColor: "#000", paddingVertical: 14, paddingHorizontal: 30, borderRadius: 10, marginTop: 15 },
    loginText: { color: "#fff", fontWeight: "600", fontSize: 16 },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "#fff",
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.09,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        height: 48,
    },
    tabBack: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        width: '30%'
    },
    tabPending: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        width: '70%'
    },
    tabLabel: {
        color: "#666",
        fontWeight: "600",
        fontSize: 14,
        textTransform: "capitalize",
        letterSpacing: 1,
    },
    activeTabLabel: {
        color: "#666",
    },
    indicator: {
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "70%",
        height: 1.5,
        backgroundColor: "#aaa",
        borderRadius: 1.5,
    },
});
