import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "@react-native-firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  getDownloadURL,
} from "@react-native-firebase/storage";
import Header from "../components/Header";

export default function PaymentSuccess({ route, navigation }) {
  const { paymentData, orderNumber } = route.params;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const app = getApp();
        const db = getFirestore(app);

        const ordersRef = collection(db, "successOrders");
        const q = query(ordersRef, where("orderNumber", "==", orderNumber), limit(1));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          setOrder(snapshot.docs[0].data());
        } else {
          console.warn("No order found with this orderNumber");
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ fontSize: 16, color: "#333" }}>Order not found.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.replace("BottomNavigation", { screen: "Home" })}
        >
          <Text style={styles.buttonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Header />
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.successText}>✅ Payment Successful!</Text>
          <Text style={styles.orderNumber}>Order Number: {orderNumber}</Text>
          <Text style={styles.paymentId}>
            Payment ID: {paymentData}
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Info</Text>
            <Text>{order.customerInfo?.name}</Text>
            <Text>{order.customerInfo?.email}</Text>
            <Text>{order.customerInfo?.phone}</Text>
            <Text>
              {order.customerInfo?.shipping_address.address}, {order.customerInfo?.shipping_address.city},{" "}
              {order.customerInfo?.shipping_address.postalCode}, {order.customerInfo?.shipping_address.country}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items Purchased</Text>
            <FlatList
              data={order.cartItems || []}
              keyExtractor={(item, idx) => idx.toString()}
              renderItem={({ item }) => (
                <View style={styles.itemRow}>
                  <Text style={styles.itemTitle}>
                    {item.title}{" "}
                    {item.options?.length
                      ? `(${item.options.map(o => `${o.name}: ${o.value}`).join(", ")})`
                      : ""}
                  </Text>
                  <Text>
                    Qty: {item.quantity} | ₹{(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              )}
              scrollEnabled={false}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.summaryRow}>
              <Text>Subtotal</Text>
              <Text>₹ {order.subtotal?.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Shipping</Text>
              <Text>₹ {order.shipping.shippingCost?.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Tax</Text>
              <Text>₹ {order.tax?.toFixed(2)}</Text>
            </View>
            {order.discountValue > 0 && (
              <View style={styles.summaryRow}>
                <Text>Discount ({order.discountCode})</Text>
                <Text>− ₹ {order.discountValue?.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, { marginTop: 8 }]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹ {order.total?.toFixed(2)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.replace("BottomNavigation", { screen: "Home" })}
          >
            <Text style={{ color: "#fff" }}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              try {
                setDownloading(true);
                const app = getApp();
                const authInstance = getAuth(app);
                const storageInstance = getStorage(app);

                const user = authInstance.currentUser;
                if (!user) {
                  Alert.alert("Error", "You must be logged in to access your invoice.");
                  return;
                }
                const invoicePath = order.invoiceUrl;
                if (!invoicePath) {
                  Alert.alert("Invoice not available yet.");
                  return;
                }
                const fileRef = storageRef(storageInstance, invoicePath);
                const downloadUrl = await getDownloadURL(fileRef);
                await Linking.openURL(downloadUrl);
              } catch (error) {
                console.error("Error opening invoice:", error);
                Alert.alert("Error", "Unable to open invoice. Please try again later.");
              } finally {
                setDownloading(false);
              }
            }}
            style={[
              styles.button,
              {
                backgroundColor: "#8B5CF6",
                paddingVertical: 12,
                borderRadius: 8,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: "white", fontWeight: "bold" }}>Download Invoice PDF</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f9f9f9" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  successText: {
    fontSize: 20,
    fontWeight: "700",
    color: "green",
    marginBottom: 8,
    textAlign: "center",
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  paymentId: {
    fontSize: 14,
    color: "#555",
    marginBottom: 12,
    textAlign: "center",
  },
  section: { marginVertical: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  itemRow: { marginBottom: 8 },
  itemTitle: { fontWeight: "500" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 2 },
  totalLabel: { fontSize: 16, fontWeight: "700" },
  totalValue: { fontSize: 16, fontWeight: "700" },
  button: { marginTop: 20, backgroundColor: "#000", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
