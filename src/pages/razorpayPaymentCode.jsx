const startPayment = async () => {
    try {
        const orderNumber = await getNextOrderNumber();

        // ✅ Create Razorpay Order from Cloud Function (v2 endpoint)
        const response = await axios.post(
            "https://us-central1-ujaas-aroma.cloudfunctions.net/createRazorpayOrder",
            { amount: total, receipt: `receipt_order_${Date.now()}` }
        );

        const order = response.data;

        const options = {
            description: "Payment for your order",
            image: "https://firebasestorage.googleapis.com/v0/b/ujaas-aroma.appspot.com/o/logos%2FPicture1.png?alt=media",
            currency: order.currency,
            key: "rzp_test_RPpvui3mN5LNHr", // replace with live key in production
            amount: order.amount,
            order_id: order.id,
            name: "Ujaas Aroma",
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
                    status: "paid",
                    createdAt: serverTimestamp(),
                };

                try {
                    // ✅ Step 1: Save to Firestore
                    const docRef = await addDoc(collection(db, "successOrders"), safeOrderDetails);
                    const documentId = docRef.id;
                    await updateDoc(doc(db, "users", auth.currentUser.uid), {
                        shipping_address: {
                            address: customerInfo.address,
                            city: customerInfo.city,
                            state: customerInfo.state,
                            postalcode: customerInfo.postalCode,
                            country: customerInfo.country
                        },
                    });

                    // ✅ Step 2: Generate Invoice + Send Email via Cloud Functions (v2)
                    const invoiceRes = await axios.post(
                        "https://us-central1-ujaas-aroma.cloudfunctions.net/generateInvoicePDF",
                        { orderDetails: { ...safeOrderDetails, documentId } }
                    );

                    const pdfUrl = invoiceRes.data.storagePath;

                    // ✅ Step 3: Update Firestore with PDF URL
                    if (pdfUrl) {
                        await updateDoc(doc(db, "successOrders", documentId), {
                            invoiceUrl: pdfUrl,
                        });
                    }

                    // ✅ Step 4: Send Email Confirmation
                    await axios.post(
                        "https://us-central1-ujaas-aroma.cloudfunctions.net/sendOrderConfirmation",
                        { orderDetails: { ...safeOrderDetails, invoiceUrl: pdfUrl } }
                    );

                    // ✅ Step 5: Clear cart & go to success page
                    clearCart();
                    setLoading(false);
                    navigation.replace("PaymentSuccess", {
                        orderNumber,
                        pdfUrl,
                        documentId,
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
                    paymentAttempt: {
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

                await addDoc(collection(db, "failedOrders", orderNumber), failedOrder);
                Alert.alert("Payment Failed", error.description || "Payment was not completed.");
            });
    } catch (err) {
        console.error("Error in initiating payment", err);
        Alert.alert("Error", "Unable to initiate payment. Please try again later.");
    }
};