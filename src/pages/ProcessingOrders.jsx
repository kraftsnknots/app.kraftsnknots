import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
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

export default function ProcessingOrders({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const db = getFirestore();
  const user = getAuth().currentUser;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const ordersQuery = query(
      collection(db, "successOrders"),
      where("userId", "==", user.uid),
      where("status", "==", "processing"),
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
        style={[styles.orderCard, { backgroundColor: "#fff"}]}
        onPress={() => navigation.navigate("OrderDetails", { orderId: item.id, pageName: "successOrders" })}
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
          <Text style={styles.totalLabel}>Total Paid</Text>
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
                color:"blue",
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
  emptyIcon: { fontSize: 70, marginBottom: 12 },
  emptyText: { fontSize: 20, fontWeight: "700", color: "#111" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loginBtn: { backgroundColor: "#000", paddingVertical: 14, paddingHorizontal: 30, borderRadius: 10, marginTop: 15 },
  loginText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  
});
