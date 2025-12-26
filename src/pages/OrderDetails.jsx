import React, { useEffect, useState, useContext } from "react";
import {
    View,
    Text,
    Image,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Platform,
    Alert,
    Linking,
} from "react-native";
import RNFS from "react-native-fs";
import axios from "axios";
import { getAuth } from "@react-native-firebase/auth";
import { firestore, storage } from "../firebase/firebaseConfig";
import { doc, getDoc } from "@react-native-firebase/firestore";
import { ref, getDownloadURL } from "@react-native-firebase/storage";
import ShimmerPlaceHolder from "react-native-shimmer-placeholder";
import LinearGradient from "react-native-linear-gradient";
import Header from "../components/Header";
import { startDownloadAppSave } from 'react-native-ios-files-app-save';
import { WishlistCartContext } from "../services/WishlistCartContext";

export default function OrderDetails({ route, navigation }) {
    const { orderId, pageName } = route.params;
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [resending, setResending] = useState(false);
    const { moveToCart, addToCart } = useContext(WishlistCartContext);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                let docRef = '';
                if (pageName === "successOrders") {
                    docRef = doc(firestore, "successOrders", orderId);
                } else if (pageName === "failedOrders") {
                    docRef = doc(firestore, "failedOrders", orderId);
                }
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists) {
                    setOrder(null);
                    setLoading(false);
                    return;
                }

                const data = docSnap.data();

                const productsWithUrls = await Promise.all(
                    (data.cartItems || []).map(async (p) => {
                        let imageUrl = p.image;
                        if (imageUrl && !imageUrl.startsWith("http")) {
                            try {
                                imageUrl = await getDownloadURL(ref(storage, imageUrl));
                            } catch {
                                imageUrl = null;
                            }
                        }
                        return { ...p, image: imageUrl };
                    })
                );

                setOrder({ id: orderId, ...data, cartItems: productsWithUrls });
            } catch (error) {
                console.error("Error fetching order:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    const createdAt = new Date(order?.createdAt?.toDate?.() || order?.createdAt);

    if (loading) {
        return (
            <View style={styles.center}>
                <ShimmerPlaceHolder
                    LinearGradient={LinearGradient}
                    style={{ width: "90%", height: 150, borderRadius: 12 }}
                />
                <ActivityIndicator size="large" color="#000" style={{ marginTop: 20 }} />
            </View>
        );
    }

    if (!order) {
        return (
            <View style={styles.center}>
                <Text style={{ fontSize: 18, fontWeight: "600" }}>Order not found.</Text>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                >
                    <Text style={styles.backText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleResendInvoice = async () => {
        try {
            if (pageName === "failedOrders") {
                Alert.alert("Invoice is not available.", "Payment of this order was failed..");
                return;
            }
            setResending(true);
            const pdfUrl = order.invoiceUrl;
            await axios.post(
                "https://us-central1-ujaas-aroma.cloudfunctions.net/sendOrderConfirmation",
                { orderDetails: { ...order, invoiceUrl: pdfUrl } }
            );
            Alert.alert("Success", `Email has been resent to ${order.customerInfo.email}.`);
        } catch (error) {
            console.error("Error resending invoice:", error);
            Alert.alert("Error", "Unable to resend invoice. Please try again later.");
        } finally {
            setResending(false);
        }
    };


    const handleDownloadInvoice = async () => {
        try {
            const user = getAuth().currentUser;
            if (!user) {
                Alert.alert("Login Required", "You must be logged in to download invoices.");
                return;
            }

            if (!order.invoiceUrl) {
                Alert.alert("Invoice Not Available", "Payment of this order was failed.");
                return;
            }

            const fileRef = ref(storage, order.invoiceUrl);
            const downloadUrl = await getDownloadURL(fileRef);

            setDownloading(true);

            Alert.alert(
                "Invoice Options",
                "What would you like to do?",
                [
                    {
                        text: "Cancel",
                        style: "cancel",
                        onPress: () => setDownloading(false),
                    },
                    {
                        text: "Open",
                        onPress: async () => {
                            try {
                                await Linking.openURL(downloadUrl);
                            } catch (err) {
                                console.error("Error opening invoice:", err);
                                Alert.alert("Error", "Unable to open the invoice link.");
                            } finally {
                                setDownloading(false);
                            }
                        },
                    },
                    {
                        text: "Download",
                        onPress: async () => {
                            try {
                                setDownloading(true);
                                const fileName = `invoice_${order?.id || Date.now()}.pdf`;

                                if (Platform.OS === 'ios') {
                                    // iOS direct save to Files app
                                    const options = {
                                        url: downloadUrl,
                                        fileName: fileName,
                                        isBase64: false,
                                    };
                                    await startDownloadAppSave(options);

                                    Alert.alert(
                                        "Download Complete",
                                        "Invoice saved to: Files → On My iPhone → Ujaas Aroma/"
                                    );
                                } else {
                                    // Android - use RNFS
                                    const downloadDir = RNFS.DownloadDirectoryPath;
                                    const localPath = `${downloadDir}/${fileName}`;
                                    const result = await RNFS.downloadFile({
                                        fromUrl: downloadUrl,
                                        toFile: localPath,
                                    }).promise;

                                    if (result.statusCode === 200) {
                                        Alert.alert(
                                            "Download Complete",
                                            `Saved to:\n${localPath}`
                                        );
                                    } else {
                                        Alert.alert("Download Failed", "Could not save the file.");
                                    }
                                }
                            } catch (error) {
                                console.error("Download error:", error);
                                Alert.alert("Error", "Failed to download invoice.");
                            } finally {
                                setDownloading(false);
                            }
                        },
                    },
                ],
                { cancelable: true }
            );
        } catch (error) {
            console.error("Error preparing invoice:", error);
            Alert.alert("Error", "Unable to process your request. Please try again later.");
        }
    };


    const renderProduct = ({ item }) => (
        <View style={styles.productCard}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={{ flex: 1 }}>
                <View style={styles.productRow}>
                    <Text style={styles.productName}>{item.title}</Text>
                    <Text style={styles.productPrice}>₹ {item.price}</Text>
                </View>
                <Text style={styles.productDesc}>
                    {item.options?.map((opt) => `${opt.name}: ${opt.value}`).join(", ")}
                </Text>
                <Text style={styles.productSub}>Quantity: {item.quantity || 1}</Text>

            </View>
        </View>
    );

    const handleMoveToCart = async (orderItems) => {

        try {
            setLoading(true);

            // ✅ Use for...of loop for async/await
            for (const item of orderItems) {
                console.log(item);

                const productRef = doc(firestore, "products", item.productId);
                const docSnap = await getDoc(productRef);

                if (docSnap.exists()) {
                    const productData = { id: docSnap.id, ...docSnap.data() };
                    moveToCart({ ...productData, qty: item.quantity });
                } else {
                    console.warn("⚠️ Not Found:", item.productId);
                    Alert.alert("Not Found", "Product either discontinued or out of stock.");
                }
            }

            Alert.alert("Success", "All products moved to cart!");
        } catch (error) {
            console.error("❌ Error fetching product:", error);
            Alert.alert("Error", "Failed to load product details.");
        } finally {
            setLoading(false);
            navigation.navigate('BottomNavigation', { screen: "Cart" })
        }
    };


    return (
        <View style={{ flex: 1, backgroundColor: "#F7F7F7", paddingBottom: 100 }}>
            <Header />
            <FlatList
                ListHeaderComponent={
                    <>
                        {/* --- ORDER SUMMARY CARD --- */}
                        <View style={styles.summaryCard}>

                            <Text style={styles.heading}>Order Summary</Text>
                            <View style={styles.row}>
                                <Text style={styles.label}>Order ID:</Text>
                                <Text style={styles.value}>{order.id}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Date:</Text>
                                <Text style={styles.value}>{createdAt.toLocaleString()}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Subtotal:</Text>
                                <Text style={styles.value}>₹ {order.subtotal?.toFixed(2)}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Discount:</Text>
                                <Text style={styles.value}>₹ {order.discountValue?.toFixed(2)}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Shipping:</Text>
                                <Text style={styles.value}>₹ {order.shipping?.shippingCost || 0}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Tax (12%):</Text>
                                <Text style={styles.value}>₹ {order.tax?.toFixed(2)}</Text>
                            </View>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total</Text>
                                <Text style={styles.totalValue}>₹ {order.total?.toFixed(2)}</Text>
                            </View>
                        </View>
                        <Text style={[styles.heading, { marginLeft: 16 }]}>Products</Text>
                    </>
                }
                data={order.cartItems || []}
                renderItem={renderProduct}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
            />
            {pageName === "failedOrders" ?
                <>
                    <TouchableOpacity
                        style={styles.paymentBtn}
                        onPress={() => handleMoveToCart(order.cartItems)}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.paymentBtnText}>Move Order to Cart</Text>
                        )}
                    </TouchableOpacity>

                </> : <></>}
            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()} >
                    <Image source={require('../assets/icons/back-grey.png')} style={{ height: 35, width: 35 }} />
                    <Text style={{ color: '#fff', fontSize: 12 }}>Go Back</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backBtn} onPress={handleResendInvoice} disabled={resending}>
                    {resending ? (
                        <ActivityIndicator color="#fff" style={{ height: 40, width: 40 }} />
                    ) : (
                        <>
                            <Image source={require('../assets/icons/email-resend-white.png')} style={{ height: 35, width: 35 }} />
                            <Text style={{ color: '#fff', fontSize: 12 }}>Resend Invoice</Text>
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.backBtn} onPress={handleDownloadInvoice} disabled={downloading}>
                    {downloading ? (
                        <ActivityIndicator color="#fff" style={{ height: 40, width: 40 }} />
                    ) : (
                        <>
                            <Image source={require('../assets/icons/download-icon-white.png')} style={{ height: 35, width: 35 }} />
                            <Text style={{ color: '#fff', fontSize: 12 }}>Download PDF</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    heading: { fontSize: 18, fontWeight: "700", color: "#111", marginVertical: 10 },
    summaryCard: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 16,
        marginVertical: 10,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        elevation: 4,
    },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
    label: { color: "#6B7280", fontSize: 14 },
    value: { color: "#111827", fontSize: 14, fontWeight: "500" },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingTop: 10,
        marginTop: 10,
    },
    totalLabel: { fontSize: 16, fontWeight: "700" },
    totalValue: { fontSize: 16, fontWeight: "700", color: "#000" },
    actionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        position: 'absolute',
        bottom: 0,
        paddingBottom: 18,
        width: '100%',
        backgroundColor: '#000',
    },
    backBtn: { width: '33.33%', paddingVertical: 10, alignItems: "center" },
    productCard: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginVertical: 6,
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    image: { width: 65, height: 65, borderRadius: 8, marginRight: 12, resizeMode: "cover" },
    productRow: { flexDirection: "row", justifyContent: "space-between" },
    productName: { fontSize: 15, fontWeight: "600", color: "#111" },
    productPrice: { fontSize: 15, fontWeight: "600", color: "#111" },
    productDesc: { fontSize: 13, color: "#6B7280", marginVertical: 3 },
    productSub: { fontSize: 13, color: "#6B7280" },
    statusTag: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
    statusText: { fontSize: 12, fontWeight: "600" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    paymentBtn: {
        margin: 10,
        backgroundColor: '#000',
        paddingVertical: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    paymentBtnText: {
        paddingHorizontal: 15,
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
        textTransform: 'uppercase'
    },
});