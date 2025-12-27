import React, { useContext, useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
} from "react-native";
import { WishlistCartContext } from "../services/WishlistCartContext";
import { WebView } from 'react-native-webview';
import { getAuth } from "@react-native-firebase/auth";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
  updateDoc,
  runTransaction,
  setDoc,
} from "@react-native-firebase/firestore";

import RazorpayCheckout from "react-native-razorpay";
import axios from "axios";
import Header from "../components/Header";

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export default function Checkout({ navigation }) {
  const { cart, clearCart } = useContext(WishlistCartContext);
  const [loading, setLoading] = useState(false);
  const [shippingTypes, setShippingTypes] = useState({ standard: 300, express: 1200 });
  const [selectedShippingType, setSelectedShippingType] = useState("standard");
  const logoHeight = Platform.OS === "ios" ? 340 : 250;
  const [isDevelopment, setIsDevelopment] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    email: "",
    name: "",
    phone: "",
    shipping_address: "",
    notes: "",
  });


  // New states for addresses modal and list handling
  const [modalVisible, setModalVisible] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [newAddress, setNewAddress] = useState({
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const fetchUserData = async () => {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setCustomerInfo(userDocSnap.data());
        } else {
          setCustomerInfo({
            email: user.email || "",
            name: user.displayName || "",
            phone: user.phoneNumber || "",
          });
        }
      };

      fetchUserData().catch(console.error);
    }
  }, []);


  // Fetch existing shipping addresses for the user email on customerInfo.email change
  useEffect(() => {
    if (!customerInfo.email) return;
    const fetchAddresses = async () => {
      try {
        const addressesRef = collection(db, "shippingAddresses");
        const q = query(addressesRef, where("email", "==", customerInfo.email));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAddresses(list);
        if (list.length > 0) {
          const sortedList = [...list].sort(
            (a, b) => b.updatedAt?.toMillis?.() - a.updatedAt?.toMillis?.()
          );

          setSelectedAddressId(sortedList[0].id);
          setCustomerInfo((info) => ({
            ...info,
            name: sortedList[0].name,
            shipping_address: {
              address: sortedList[0].address,
              city: sortedList[0].city,
              state: sortedList[0].state,
              postalCode: sortedList[0].postalCode,
              country: sortedList[0].country,
            }
          }));
        }
      } catch (e) {
        console.error("Error fetching addresses:", e);
      }
    };
    fetchAddresses();
  }, [customerInfo.email]);

  useEffect(() => {
    const docRef = doc(db, "paymentMode", "razorpay");

    // 👇 Realtime snapshot listener
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsDevelopment(data.isDevelopment ?? false);
        } else {
          console.warn("⚠️ paymentMode/config document not found!");
        }
        setLoading(false);
      },
      (error) => {
        console.error("❌ Error listening to paymentMode/config:", error);
        setLoading(false);
      }
    );

    // 🧹 Cleanup listener on unmount
    return () => unsubscribe();
  }, [db]);

  useEffect(() => {
    const fetchShippingTypes = async () => {
      try {
        const standardDoc = await getDoc(doc(db, "shippingTypes", "standard"));
        const expressDoc = await getDoc(doc(db, "shippingTypes", "express"));

        setShippingTypes({
          standard: standardDoc.exists() ? standardDoc.data().price : 300,
          express: expressDoc.exists() ? expressDoc.data().price : 1200,
        });
      } catch (err) {
        console.error("Error fetching shipping types:", err);
        setShippingTypes({ standard: 150, express: 300 }); // fallback default prices
      }
    };
    fetchShippingTypes();
  }, []);


  // Select an address from the existing list
  const selectAddress = (id) => {
    setSelectedAddressId(id);
    const addr = addresses.find((a) => a.id === id);
    if (addr) {
      setCustomerInfo((info) => ({
        ...info,
        name: addr.name,
        shipping_address: {
          address: addr.address,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
          country: addr.country,
        }
      }));
    }
  };

  // Save new address to Firestore
  const saveNewAddress = async () => {
    const { address, city, state, postalCode, country } = newAddress;
    if (!address || !city || !state || !postalCode || !country) {
      Alert.alert("Missing Fields", "Please fill all the address fields.");
      return;
    }
    if (!auth.currentUser) {
      Alert.alert("Not logged in", "User must be logged in to save address.");
      return;
    }
    try {
      const docRef = await addDoc(collection(db, "shippingAddresses"), {
        ...newAddress,
        userId: auth.currentUser.uid,
        name: customerInfo.name,
        email: customerInfo.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setAddresses((prev) => [
        ...prev,
        {
          id: docRef.id,
          ...newAddress,
          userId: auth.currentUser.uid,
          name: customerInfo.name,
          email: customerInfo.email,
        },
      ]);
      selectAddress(docRef.id);
      setModalVisible(false);
      setNewAddress({
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      });
    } catch (e) {
      console.error("Error saving address:", e);
      Alert.alert("Error", "Failed to save new address.");
    }
  };

  const [discountCode, setDiscountCode] = useState("");
  const [discountValue, setDiscountValue] = useState(0);
  const [appliedCode, setAppliedCode] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [agreed, setAgreed] = useState(false);

  const { subtotal, tax, totalBeforeDiscount } = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const tax = subtotal * 0.12;
    const totalBeforeDiscount = subtotal + tax;
    return { subtotal, tax, totalBeforeDiscount };
  }, [cart]);

  const ttotal = Math.max(totalBeforeDiscount - discountValue, 0);
  const shipping = selectedShippingType === "express" ? shippingTypes.express : shippingTypes.standard;
  const shippingCharges = selectedShippingType === "standard" && ttotal > 2500 ? 0 : shipping;
  const freeShippingThreshold = 2500;
  const enjoyFreeShipping = freeShippingThreshold - ttotal;
  const total = ttotal + shippingCharges;

  // ======================================================
  // 🔹 Apply Discount Code
  // ======================================================
  const handleApplyDiscount = async () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) {
      Alert.alert("Enter Code", "Please enter a promo or gift card code.");
      return;
    }
    try {
      const discountRef = collection(db, "discountCodes");
      const discountQuery = query(discountRef, where("code", "==", code));
      const querySnapshot = await getDocs(discountQuery);
      if (querySnapshot.empty) {
        Alert.alert("Invalid Code", "This promo code does not exist.");
        return;
      }
      const data = querySnapshot.docs[0].data();
      if (data.status !== "Active") {
        Alert.alert("Inactive Code", "This promo code is not active currently.");
        return;
      }

      let value = 0;
      const type = data.type?.toLowerCase();
      if (type === "percentage") {
        value = totalBeforeDiscount * (data.value / 100);
      } else if (type === "flat") {
        value = data.value;
      }

      setDiscountValue(value);
      setAppliedCode(code);
      setAppliedName(data.name || "");
      Alert.alert(
        "Discount Applied",
        `${data.name || "Promo"} (${code}) applied — ${type === "percentage" ? data.value + "%" : "₹" + data.value
        } off`
      );
    } catch (error) {
      console.error("Error applying discount:", error);
      Alert.alert("Error", "Something went wrong. Please try again later.");
    }
  };

  // ======================================================
  // 🔹 Get Next Order Number
  // ======================================================
  const getNextOrderNumber = async () => {
    const counterRef = doc(db, "counters", "orders");
    const newOrderNumber = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists) throw "Counter document does not exist!";
      const lastNumber = counterDoc.data().lastOrderNumber || 1000;
      const nextNumber = lastNumber + 1;
      transaction.update(counterRef, { lastOrderNumber: nextNumber });
      return nextNumber;
    });
    return `#UA${newOrderNumber}`;
  };

  // ======================================================
  // 🔹 Payment Start (test payment)
  // ======================================================

  const startPayment = async () => {
    try {
      const orderNumber = await getNextOrderNumber();

      // ✅ Create Razorpay Order from Cloud Function (v2 endpoint)
      const response = await axios.post(
        "https://us-central1-kraftsnknots-921a0.cloudfunctions.net/createRazorpayOrder",
        { amount: total, receipt: `receipt_order_${Date.now()}` }
      );

      const order = response.data;

      const options = {
        description: "Payment for your order",
        image: "https://firebasestorage.googleapis.com/v0/b/kraftsnknots-921a0.appspot.com/o/logos%2FPicture1.png?alt=media",
        currency: order.currency,
        key: "rzp_test_RPpvui3mN5LNHr",
        amount: order.amount,
        order_id: order.id,
        name: "Krafts  & Knots",
        prefill: {
          email: customerInfo.email,
          contact: customerInfo.phone,
          name: customerInfo.name,
        },
        theme: { color: "#000000" },
      };

      RazorpayCheckout.open(options)
        .then(async (paymentData) => {
          const safeOrderDetails = {

            orderNumber,
            orderDate: new Date().toLocaleDateString(),
            userId: auth.currentUser?.uid || null,
            customerInfo,
            cartItems: cart.map((item) => ({
              productId: item.id,
              title: item.title,
              price: item.price,
              quantity: item.qty,
              options: item.options || [],
              image: item.images?.[0] || null,
            })),
            subtotal,
            shipping: {
              shippingType: selectedShippingType,
              shippingCost: shippingCharges
            },
            tax,
            discountCode: appliedCode || null,
            discountValue,
            total,
            payment: {
              razorpay_payment_id: paymentData.razorpay_payment_id,
              razorpay_order_id: paymentData.razorpay_order_id,
              razorpay_signature: paymentData.razorpay_signature,
              status: "success",
            },
            status: "processing",
            createdAt: serverTimestamp(),
          };

          try {
            // ✅ Step 1: Save to Firestore
            await setDoc(doc(db, "successOrders", orderNumber), safeOrderDetails);
            await updateDoc(doc(db, "shippingAddresses", selectedAddressId), {
              updatedAt: serverTimestamp(),
            });

            // ✅ Step 2: Generate Invoice + Send Email via Cloud Functions (v2)
            const invoiceRes = await axios.post(
              "https://us-central1-kraftsnknots-921a0.cloudfunctions.net/generateInvoicePDF",
              { orderDetails: { ...safeOrderDetails, orderNumber } }
            );

            const pdfUrl = invoiceRes.data.storagePath;

            // ✅ Step 3: Update Firestore with PDF URL
            if (pdfUrl) {
              await updateDoc(doc(db, "successOrders", orderNumber), {
                invoiceUrl: pdfUrl,
              });
            }

            // ✅ Step 4: Send Email Confirmation
            await axios.post(
              "https://us-central1-kraftsnknots-921a0.cloudfunctions.net/sendOrderConfirmation",
              { orderDetails: { ...safeOrderDetails, invoiceUrl: pdfUrl } }
            );

            // ✅ Step 5: Clear cart & go to success page
            clearCart();
            setLoading(false);
            navigation.replace("PaymentSuccess", {
              paymentData: paymentData.razorpay_order_id, orderNumber
            });
          } catch (dbErr) {
            console.error("Error saving order:", dbErr);
            Alert.alert(
              "Order Saved Error",
              "Payment succeeded, but order could not be saved. Please contact support."
            );
          }
        })
        .catch(async (error) => {
          const failedOrder = {
            orderNumber,
            orderDate: new Date().toLocaleDateString(),
            userId: auth.currentUser?.uid || null,
            customerInfo,
            cartItems: cart.map((item) => ({
              productId: item.id,
              title: item.title,
              price: item.price,
              quantity: item.qty,
              options: item.options || [],
              image: item.images?.[0] || null,
            })),
            subtotal,
            shipping: {
              shippingType: selectedShippingType,
              shippingCost: shippingCharges
            },
            tax,
            discountCode: appliedCode || null,
            discountValue,
            total,
            payment: {
              razorpay_order_id: order.id,
              status: "failed",
              error: {
                code: error.code || null,
                description: error.description || null,
              },
            },
            status: "failed",
            createdAt: serverTimestamp(),
          };

          await setDoc(doc(db, "successOrders", orderNumber), failedOrder);
          Alert.alert("Payment Failed", error.description || "Payment was not completed.");
          setLoading(false);
        });
    } catch (err) {
      console.error("Error in initiating payment", err);
      Alert.alert("Error", "Unable to initiate payment. Please try again later.");
    }
  };

  // const startPayment = async () => {
  //   const orderNumber = await getNextOrderNumber();

  //   try {
  //     // ✅ Create fake success order data
  //     const safeOrderDetails = {
  //       orderNumber,
  //       orderDate: new Date().toLocaleDateString(),
  //       userId: auth.currentUser?.uid || null,
  //       customerInfo,
  //       cartItems: cart.map((item) => ({
  //         productId: item.id,
  //         title: item.title,
  //         price: item.price,
  //         quantity: item.qty,
  //         options: item.options || [],
  //         image: item.images?.[0] || null,
  //       })),
  //       subtotal,
  //       shipping: {
  //         shippingType: selectedShippingType,
  //         shippingCost: shippingCharges
  //       },
  //       tax,
  //       discountCode: appliedCode || null,
  //       discountValue,
  //       total,
  //       payment: {
  //         razorpay_payment_id: "test_payment_id",
  //         razorpay_order_id: "test_order_id",
  //         razorpay_signature: "test_signature",
  //         status: "success",
  //       },
  //       status: "processing",
  //       createdAt: serverTimestamp(),
  //     };

  //     // ✅ Step 1: Save to Firestore Orders
  //     await setDoc(doc(db, "successOrders", orderNumber), safeOrderDetails);
  //     await updateDoc(doc(db, "shippingAddresses", selectedAddressId), {
  //       updatedAt: serverTimestamp(),
  //     });

  //     // ✅ Step 2: Generate PDF via Cloud Function
  //     const invoiceRes = await axios.post(
  //       "https://us-central1-kraftsnknots-921a0.cloudfunctions.net/generateInvoicePDF",
  //       { orderDetails: { ...safeOrderDetails, orderNumber } }
  //     );

  //     const pdfUrl = invoiceRes.data.storagePath;

  //     // ✅ Step 3: Update Firestore with PDF URL
  //     if (pdfUrl) {
  //       await updateDoc(doc(db, "successOrders", orderNumber), {
  //         invoiceUrl: pdfUrl,
  //       });
  //     }

  //     // ✅ Step 4: Send Email Confirmation
  //     await axios.post(
  //       "https://us-central1-kraftsnknots-921a0.cloudfunctions.net/sendOrderConfirmation",
  //       { orderDetails: { ...safeOrderDetails, invoiceUrl: pdfUrl } }
  //     );

  //     // ✅ Step 5: Clear cart & go to success page
  //     clearCart();
  //     setLoading(false);
  //     navigation.replace("PaymentSuccess", {
  //       paymentData: "test_payment_id", orderNumber
  //     });
  //   } catch (err) {
  //     const failedOrderDetails = {
  //       orderNumber,
  //       orderDate: new Date().toLocaleDateString(),
  //       userId: auth.currentUser?.uid || null,
  //       customerInfo,
  //       cartItems: cart.map((item) => ({
  //         productId: item.id,
  //         title: item.title,
  //         price: item.price,
  //         quantity: item.qty,
  //         options: item.options || [],
  //         image: item.images?.[0] || null,
  //       })),
  //       subtotal,
  //       shipping: {
  //         shippingType: selectedShippingType,
  //         shippingCost: shippingCharges
  //       },
  //       tax,
  //       discountCode: appliedCode || null,
  //       discountValue,
  //       total,
  //       paymentAttempt: {
  //         razorpay_order_id: "testing_failed",
  //         status: "failed",
  //         error: {
  //           code: err.code || null,
  //           description: err.description || null,
  //         },
  //       },
  //       status: "failed",
  //       createdAt: serverTimestamp(),
  //     };

  //     await setDoc(doc(db, "failedOrders", orderNumber), failedOrderDetails);
  //     Alert.alert("Payment Failed", err.description || "Payment was not completed.");
  //     console.error("❌ Error in test payment:", err)
  //   }
  // };

  // ======================================================
  // 🔹 Proceed Button
  // ======================================================


  const handleProceed = () => {
    const { email, name, phone, shipping_address } = customerInfo;
    if (!email || !name || !phone || !shipping_address) {
      Alert.alert("Incomplete Info", "Please complete all required fields.");
      return;
    }
    if (!agreed) {
      Alert.alert("Agreement Required", "Please agree to the Terms & Conditions.");
      return;
    }
    setLoading(true);
    startPayment().finally();
  };

  // ======================================================
  // 🔹 UI
  // ======================================================
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      {loading ? (
        <View style={styles.loaderContainer}>
          <WebView
            source={{
              html: `
          <html>
            <body style="margin-top:70%; padding:10; text-align:center;">
              <img src="https://firebasestorage.googleapis.com/v0/b/kraftsnknots-921a0.firebasestorage.app/o/logos%2Fknklogo1.png?alt=media&token=d0f6a710-3de5-41d9-a96e-9f1a6741d0da" 
                   style="width:100%; height:${logoHeight}px;"/>
              <img src="https://firebasestorage.googleapis.com/v0/b/kraftsnknots-921a0.firebasestorage.app/o/logos%2Floading.gif?alt=media&token=9c00a9a5-76ab-4203-b4d2-5570a671ca77" 
                   style="width:100px; height:100px; margin-top:50px;"/>
            </body>
          </html>
        `,
            }}
            style={styles.loader}
            originWhitelist={['*']}
            scalesPageToFit={false}
          />
        </View>
      ) : null}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, paddingBottom: 10 }}>
          <Header />

          <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
            <View onStartShouldSetResponder={() => true}>
              {/* Contact Info */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                {["email", "name", "phone"].map((field, idx) => (
                  <TextInput
                    key={idx}
                    style={styles.input}
                    placeholder={
                      field === "postalCode"
                        ? "Pin code"
                        : field.charAt(0).toUpperCase() + field.slice(1)
                    }
                    placeholderTextColor="#C0C0C0"
                    value={customerInfo[field]}
                    onChangeText={(text) => setCustomerInfo((info) => ({ ...info, [field]: text }))}
                    keyboardType={field === "email" ? "email-address" : field === "phone" ? "phone-pad" : "default"}
                    readOnly={field === "email" && !!auth.currentUser?.email}
                  />
                ))}
              </View>

              {/* Existing addresses list with radio buttons */}
              {addresses.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Shipping Address</Text>
                  {addresses.map((addr) => (
                    <TouchableOpacity
                      key={addr.id}
                      style={styles.addressRow}
                      onPress={() => selectAddress(addr.id)}
                    >
                      <View
                        style={[
                          styles.radioOuter,
                          selectedAddressId === addr.id && styles.radioSelected,
                        ]}
                      >
                        {selectedAddressId === addr.id && <View style={styles.radioInner} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text>
                          {addr.name}
                        </Text>
                        <Text style={styles.addressText}>
                          {addr.address}, {addr.city}, {addr.state}, {addr.postalCode}, {addr.country}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.addAddressBtn} onPress={() => setModalVisible(true)}>
                    <Text style={styles.addAddressBtnText}>Add New Address</Text>
                  </TouchableOpacity>
                </View>
              )}



              {/* Notes input moved after addresses list as before */}
              <View style={styles.card}>
                <TextInput
                  style={styles.input}
                  placeholder="Special Notes"
                  placeholderTextColor="#C0C0C0"
                  value={customerInfo.notes}
                  onChangeText={(text) => setCustomerInfo((info) => ({ ...info, notes: text }))}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Shipping Type</Text>

                {["standard", "express"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.addressRow}
                    onPress={() => setSelectedShippingType(type)}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        selectedShippingType === type && styles.radioSelected,
                      ]}
                    >
                      {selectedShippingType === type && <View style={styles.radioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addressText}>
                        {type === "standard"
                          ? `Standard Shipping (8-15 Days) - ₹${shippingTypes.standard ?? "..."}`
                          : `Express Shipping (2-3 Days) - ₹${shippingTypes.express ?? "..."}`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>


              {/* Order Summary */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Order Summary</Text>
                {cart.map((item, idx) => (
                  <View key={idx} style={styles.orderRow}>
                    <Image source={{ uri: item.images?.[0] }} style={styles.orderImage} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderTitle}>{item.title}</Text>
                      <Text style={styles.orderSubText}>
                        {item.options?.map((opt) => `${opt.name}: ${opt.value}`).join(", ")}
                      </Text>
                      <View style={styles.orderPrice}>
                        <Text>₹ {(item.price * item.qty).toFixed(2)}</Text>
                        <Text>(Qty: {item.qty})</Text>
                      </View>
                    </View>
                  </View>
                ))}

                <View style={styles.discountRow}>
                  <TextInput
                    style={[styles.promoInput, { flex: 1, textTransform: "uppercase" }]}
                    placeholder="Promo code or gift card"
                    placeholderTextColor="#C0C0C0"
                    value={discountCode}
                    onChangeText={setDiscountCode}
                  />
                  <TouchableOpacity style={styles.applyBtn} onPress={handleApplyDiscount}>
                    <Text style={styles.applyText}>Apply</Text>
                  </TouchableOpacity>
                </View>

                {appliedCode ? (
                  <Text style={styles.appliedText}>
                    ✅ {appliedName || appliedCode} — ₹{discountValue.toFixed(2)} off
                  </Text>
                ) : null}

                <View style={styles.divider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>₹ {subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>GST (12%)</Text>
                  <Text style={styles.summaryValue}>₹ {tax.toFixed(2)}</Text>
                </View>
                {discountValue > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: "green" }]}>
                      Discount ({appliedCode})
                    </Text>
                    <Text style={[styles.summaryValue, { color: "green" }]}>
                      − ₹{discountValue.toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>shipping ({selectedShippingType})</Text>
                  <Text style={styles.summaryValue}>₹ {shippingCharges.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryTotal}>Total</Text>
                  <Text style={styles.summaryTotal}>₹ {total.toFixed(2)}</Text>
                </View>
                {ttotal > 2500 ? (
                  <Text style={{ fontSize: 12, color: "green", marginTop: 6, textAlign: 'center' }}>
                    Hoorrrayyy.. You have earned free standard shipping.
                  </Text>
                ) : (
                  <Text style={{ fontSize: 12, color: "green", marginTop: 6, textAlign: 'center' }}>
                    Add <Text style={{ fontWeight: 'bold' }}>₹ {enjoyFreeShipping.toFixed(2)}</Text> more to enjoy free shipping.
                  </Text>
                )
                }
              </View>

              {/* Agreement */}
              <View style={styles.agreeSection}>
                <TouchableOpacity onPress={() => setAgreed(!agreed)} style={styles.agreeRow}>
                  <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                    {agreed && (
                      <Image
                        source={require("../assets/icons/greentick.png")}
                        style={styles.tickIcon}
                      />
                    )}
                  </View>
                  <Text style={styles.agreeText}>
                    I agree to the Terms & Conditions and Privacy Policy
                  </Text>
                </TouchableOpacity>
              </View>
              {/* Buttons */}
              <View style={styles.checkoutBtns}>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleProceed} disabled={!agreed}>
                  <Text style={[styles.confirmText, !agreed ? { color: '#2b2b2b' } : { color: '#fff' },]}>
                    {loading ? "Processing..." : `Proceed To Pay - ₹ ${total.toFixed(2)}`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => navigation.replace("BottomNavigation", { screen: "Cart" })}
                >
                  <Text style={styles.backText}>Back to Cart</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Modal for New Address */}
          <Modal
            visible={modalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setModalVisible(false)}
          >
            <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
              <View style={styles.modalOverlay} />
            </TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>New Shipping Address</Text>
              {["address", "city", "state", "postalCode", "country"].map((field, idx) => (
                <TextInput
                  key={idx}
                  style={styles.modalInput}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  value={newAddress[field]}
                  onChangeText={(text) => setNewAddress((addr) => ({ ...addr, [field]: text }))}
                />
              ))}
              <View style={styles.modalButtonsRow}>

                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveNewAddress}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

        </View>
      </TouchableWithoutFeedback >
    </KeyboardAvoidingView >
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 200 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  input: {
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    backgroundColor: "#fafcff",
    fontSize: 15,
  },
  promoInput: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    backgroundColor: "#fafcff",
    fontSize: 15,
  },
  orderRow: { flexDirection: "row", marginBottom: 14, alignItems: "center" },
  orderImage: { width: 64, height: 64, borderRadius: 10, marginRight: 10, resizeMode: "contain" },
  orderTitle: { fontSize: 15, fontWeight: "600", color: "#111" },
  orderSubText: { color: "#777", fontSize: 13 },
  orderPrice: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  discountRow: { flexDirection: "row", marginTop: 10, alignItems: "center", justifyContent: 'space-between' },
  applyBtn: {
    backgroundColor: "#000",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginLeft: 10,
  },
  applyText: { color: "#fff", fontWeight: "600" },
  appliedText: { color: "green", fontSize: 14, marginTop: 6, fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 10 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3,
  },
  summaryLabel: { color: "#444", fontSize: 14, textTransform: "capitalize" },
  summaryValue: { fontWeight: "500", color: "#111" },
  summaryTotal: { fontSize: 17, fontWeight: "700", color: "#111" },
  agreeSection: { marginBottom: 18 },
  agreeRow: { flexDirection: "row", alignItems: "center" },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: "#999",
    borderRadius: 10,
    marginRight: 10,
  },
  checkboxActive: { borderWidth: 0 },
  tickIcon: { width: 20, height: 20 },
  agreeText: { fontSize: 13, color: "#444", flex: 1 },
  checkoutBtns: {
    width: '100%',
    paddingHorizontal: 5,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 50
  },
  confirmBtn: {
    backgroundColor: "#000",
    paddingVertical: 16,
    alignItems: "center",
    width: '65%',
    borderTopRightRadius: 35,
    borderBottomRightRadius: 35
  },
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  backBtn: {
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#ccc",
    width: '35%',
    borderTopLeftRadius: 35,
    borderBottomLeftRadius: 35
  },
  backText: {
    color: "#444",
    fontSize: 16,
    fontWeight: "600",
  },

  // Added styles
  addAddressBtn: {
    width: "100%",
    paddingTop: 14,
    borderRadius: 12,
    alignItems: "flex-end",
  },
  addAddressBtnText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 16,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#999",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioSelected: {
    borderColor: "#000",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#000",
  },
  addressText: {
    color: "#444",
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    position: "absolute",
    top: 100,
    left: '2.5%',
    width: "95%",
    textAlign: 'center',
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
    backgroundColor: "#fafcff",
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#000",
    borderTopRightRadius: 35,
    borderBottomRightRadius: 35,
    paddingVertical: 14,
    alignItems: "center",
    marginRight: 10,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  closeBtn: {
    flex: 1,
    backgroundColor: "#eee",
    borderTopLeftRadius: 35,
    borderBottomLeftRadius: 35,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeBtnText: {
    color: "#888",
    fontWeight: "600",
    fontSize: 16,
  },
  loaderContainer: {
    position: 'absolute',
    flex: 1,
    zIndex: 99999999,
    backgroundColor: '#fff',
    opacity: 0.9,
    width: '100%',
    height: '100%',
  },
  loader: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center'
  },
});
