import React, { useEffect, useState, useContext, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  TextInput,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  Alert
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  addDoc,
  query,
  orderBy,
} from "@react-native-firebase/firestore";
import Footer from "../components/ProductPageFooter";
import { WishlistCartContext } from "../services/WishlistCartContext";
import { getAuth } from '@react-native-firebase/auth';
import ShimmerPlaceholder from "react-native-shimmer-placeholder";
import LinearGradient from "react-native-linear-gradient";

const firestore = getFirestore(getApp());

export default function ProductDetailsPage({ navigation }) {
  const route = useRoute();
  const { productId, pagelink } = route.params;
  const { cart, toggleWishlist, wishlist } = useContext(WishlistCartContext);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState();
  console.log(selectedProduct);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    name: "",
    email: "",
    reviewText: "",
  });
  const [reviewCharCount, setReviewCharCount] = useState(0);
  const MAX_REVIEW_LENGTH = 700;

  const cartCount = cart?.length || 0;
  const cartAnim = useRef(new Animated.Value(1)).current;

  // Animate cart badge
  useEffect(() => {
    if (cartCount > 0) {
      Animated.sequence([
        Animated.spring(cartAnim, { toValue: 1.4, useNativeDriver: true }),
        Animated.spring(cartAnim, { toValue: 1, useNativeDriver: true }),
      ]).start();
    }
  }, [cartCount]);

  // Fetch product
  useEffect(() => {
    const productRef = doc(collection(firestore, "products"), productId);
    const unsubscribe = onSnapshot(
      productRef,
      (docSnap) => {
        if (docSnap.exists) {
          const data = docSnap.data();
          setProduct({ id: docSnap.id, ...data });
          setSelectedProduct(data.images[0])
          if (data.colors?.length > 0) setSelectedColor(data.colors[0]);
        } else setProduct(null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, [productId]);

  // Fetch reviews
  useEffect(() => {
    if (!productId) return;
    const reviewsRef = collection(firestore, "products", productId, "reviews");
    const q = query(reviewsRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (querySnapshot.empty) {
        setReviews([]);
        setAverageRating(0);
        return;
      }
      let total = 0,
        revs = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        total += data.rating;
        revs.push({ id: doc.id, ...data });
      });
      setReviews(revs);
      setAverageRating(total / revs.length);
    });
    return () => unsubscribe();
  }, [productId]);

  // Render stars
  const renderStars = (rating) => {
    const stars = [];
    const rounded = Math.round(rating);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Image
          key={i}
          source={
            i <= rounded
              ? require("../assets/icons/star_filled.png")
              : require("../assets/icons/star_outline.png")
          }
          style={styles.starIcon}
        />
      );
    }
    return <View style={{ flexDirection: "row" }}>{stars}</View>;
  };

  // Loading shimmer component for product image and text
  const ProductDetailsShimmer = () => (
    <View style={styles.shimmerContainer}>
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        style={styles.mainImage}
        shimmerColors={["#ebebeb", "#c5c5c5", "#ebebeb"]}
      />
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        style={styles.shimmerTitle}
        shimmerColors={["#ebebeb", "#c5c5c5", "#ebebeb"]}
      />
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        style={styles.shimmerDescription}
        shimmerColors={["#ebebeb", "#c5c5c5", "#ebebeb"]}
      />
    </View>
  );

  if (loading) return <ProductDetailsShimmer />;
  if (!product)
    return (
      <View style={styles.center}>
        <Text>Product not found</Text>
      </View>
    );

  const handleReview = () => {
    const auth = getAuth(getApp());
    if (auth.currentUser) {
      setReviewModalVisible(true)
    } else {
      Alert.alert(
        "Login Required",
        "Please log in to leave a review.\nYour feedback helps us serve you better.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Login Now",
            onPress: () => navigation.navigate('BottomNavigation', { screen: 'Account', params: { screen: 'Login' } })
          },
        ],
        { cancelable: true }
      );
    }

  }

  return (
    <>
      {/* Review Modal */}
      <Modal
        visible={reviewModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <View style={styles.starsInputRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewForm({ ...reviewForm, rating: star })}
                  >
                    <Image
                      source={
                        star <= reviewForm.rating
                          ? require("../assets/icons/star_filled.png")
                          : require("../assets/icons/star_outline.png")
                      }
                      style={styles.starIconLarge}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                placeholder="Name"
                placeholderTextColor="#C0C0C0"
                style={styles.input}
                value={reviewForm.name}
                onChangeText={(text) => setReviewForm({ ...reviewForm, name: text })}
              />
              <TextInput
                placeholder="Email"
                placeholderTextColor="#C0C0C0"
                style={styles.input}
                keyboardType="email-address"
                value={reviewForm.email}
                onChangeText={(text) => setReviewForm({ ...reviewForm, email: text })}
              />
              <TextInput
                placeholder="Write your review"
                placeholderTextColor="#C0C0C0"
                style={[styles.input, { height: 100 }]}
                multiline
                maxLength={MAX_REVIEW_LENGTH}
                value={reviewForm.reviewText}
                onChangeText={(text) => {
                  setReviewForm({ ...reviewForm, reviewText: text });
                  setReviewCharCount(text.length);
                }}
              />
              <Text style={styles.charCount}>
                {reviewCharCount} / {MAX_REVIEW_LENGTH}
              </Text>
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => setReviewModalVisible(false)}
                >
                  <Text style={[styles.modalButtonText, { color: "#333" }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButtonSubmit, !reviewForm.rating && { opacity: 0.5 }]}
                  disabled={!reviewForm.rating}
                  onPress={async () => {
                    try {
                      const reviewsRef = collection(
                        firestore,
                        "products",
                        productId,
                        "reviews"
                      );
                      await addDoc(reviewsRef, {
                        rating: reviewForm.rating,
                        name: reviewForm.name || "Anonymous",
                        email: reviewForm.email || "",
                        review: reviewForm.reviewText,
                        createdAt: new Date(),
                      });
                      setReviewModalVisible(false);
                      setReviewForm({ rating: 0, name: "", email: "", reviewText: "" });
                      setReviewCharCount(0);
                    } catch (error) {
                      alert("Failed to submit review");
                    }
                  }}
                >
                  <Text style={styles.modalButtonText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.backWrapper}
          onPress={() => {
            if (pagelink === "MainScreen") navigation.goBack();
            else if (pagelink === "WishlistScreen")
              navigation.replace("BottomNavigation", { screen: "Wishlist" });
            else navigation.goBack();
          }}
        >
          <Image source={require("../assets/icons/back-grey.png")} style={styles.back} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoWrapper}>
          <Image source={require("../assets/images/knklogo4.png")} style={styles.logo} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.cartWrapper} onPress={() => navigation.navigate("BottomNavigation", { screen: "Cart" })}>
          <Image source={require("../assets/icons/cart-white.png")} style={styles.cart} />
          {cartCount > 0 && (
            <Animated.View
              style={{
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
                transform: [{ scale: cartAnim }],
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>{cartCount}</Text>
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>

      {/* FlatList for reviews and product info */}
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.singleReview}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingBottom: 5 }}>
              <Image
                source={require("../assets/icons/dummy_profile_picture.png")}
                style={styles.optionIcon}
              />
              <Text style={styles.reviewName}>{item.name}</Text>
            </View>
            <View style={{ padding: 5, gap: 5 }}>
              {renderStars(item.rating)}
              <Text style={{ fontWeight: "bold" }}>
                {item.createdAt?.toDate
                  ? item.createdAt.toDate().toLocaleString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  : ""}
              </Text>
            </View>
            <Text style={styles.reviewText}>{item.review}</Text>
          </View>
        )}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.container}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10' }}>
              <View style={styles.reviewStarsRow}>
                {renderStars(averageRating)}
                <Text style={styles.reviewAverageText}>
                  {averageRating > 0 ? averageRating.toFixed(1) : "0"}
                </Text>
              </View>
              {product.images ? (
                <LinearGradient
                  colors={["#555", "#333"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ribbonGradient}
                >
                  <Text style={styles.ribbon}>{product.ribbon === 'New' ? "Newly Launched" : "Trending"}</Text>
                </LinearGradient>
              ) : null}
            </View>
            <Image source={{ uri: selectedProduct }} style={styles.mainImage} />
            {/* {product.colors && product.colors.length > 0 && (
              <View style={styles.colorRow}>
                {product.colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color },
                      selectedColor === color && styles.selectedCircle,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>
            )} */}
            {product.images && (
              <FlatList
                data={product.images}
                horizontal
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) =>
                  <TouchableOpacity onPress={() => setSelectedProduct(item)}>
                    <Image source={{ uri: item }} style={styles.thumbnail} />
                  </TouchableOpacity>}
                contentContainerStyle={{ marginVertical: 15 }}
                showsHorizontalScrollIndicator={false}
              />
            )}
            <View
              style={{
                paddingTop: 20,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={styles.title}>{product.title}</Text>
              <TouchableOpacity onPress={() => toggleWishlist(product)}>
                <Image
                  source={
                    wishlist.find((p) => p.id === product.id)
                      ? require("../assets/icons/pure-heart-red.png") // filled heart
                      : require("../assets/icons/pure-heart-black.png")
                  }
                  style={styles.heartIcon}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>{product.description}</Text>
            <View
              style={{
                marginTop: 50,
                borderTopWidth: 1,
                borderTopColor: "#ccc",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 15,
                }}
              >
                <Text style={{ fontSize: 22, fontWeight: "bold" }}>Customers Review</Text>
                <TouchableOpacity
                  style={styles.leaveReviewButton}
                  onPress={handleReview}
                >
                  <Text style={styles.leaveReviewButtonText}>Leave A Review</Text>
                </TouchableOpacity>
              </View>
              {reviews.length === 0 && (
                <Text
                  style={styles.noReviewsText}
                  onPress={handleReview}
                >
                  No Review yet, Be the first to review
                </Text>
              )}
            </View>
          </View>
        }
      />
      <Footer product={product} />
    </>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#000",
    width: "100%",
    paddingTop: 45,
  },
  backWrapper: {
    width: "10%"
  },
  logoWrapper: {
    width: '80%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cartWrapper: {
    width: '10%'
  },
  logo: { width: '70%', height: 70, objectFit: 'contain' },
  cart: { width: 30, height: 30 },
  back: { width: 30, height: 30 },
  container: { backgroundColor: "#fff", padding: 15 },
  mainImage: {
    width: "100%",
    height: 300,
    alignSelf: "center",
    resizeMode: "contain",
    marginVertical: 10
  },
  shimmerContainer: {
    padding: 15,
  },
  shimmerTitle: {
    width: "60%",
    height: 30,
    borderRadius: 8,
    marginTop: 15,
    marginBottom: 10,
  },
  shimmerDescription: {
    width: "100%",
    height: 80,
    borderRadius: 8,
  },
  ribbonGradient: {
    borderRadius: 5
  },
  ribbon: {
    color: "#fff",
    textTransform: "uppercase",
    fontWeight: "bold",
    paddingHorizontal: 10,
    paddingVertical: 5,
    textAlign: 'center'
  },
  colorRow: { flexDirection: "row", marginTop: 10 },
  colorCircle: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  selectedCircle: { borderWidth: 2, borderColor: "#000" },
  thumbnail: {
    width: 80,
    height: 80,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    resizeMode: "contain",
  },
  title: { fontSize: 24, fontWeight: "bold", marginVertical: 5 },
  description: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginVertical: 20,
    textAlign: "justify",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  heartIcon: { width: 35, height: 35 },
  reviewStarsRow: {
    flexDirection: "row",
    alignItems: 'flex-start'
  },
  starIcon: { width: 16, height: 16, marginRight: 3 },
  starIconLarge: { width: 30, height: 30, marginHorizontal: 5 },
  reviewAverageText: { marginLeft: 8, fontSize: 14, fontWeight: "600" },
  noReviewsText: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 35,
    textAlign: "center",
  },
  leaveReviewButton: {
    borderRadius: 20,
    alignSelf: "center",
    paddingHorizontal: 10,
    marginVertical: 0,
  },
  leaveReviewButtonText: {
    color: "blue",
    fontWeight: "bold",
    fontStyle: "italic",
    borderBottomWidth: 1,
    borderBottomColor: "blue",
  },
  singleReview: { paddingHorizontal: 20, paddingVertical: 20, backgroundColor: "#fff" },
  reviewName: { fontWeight: "700", marginLeft: 8 },
  reviewText: {
    marginTop: 5,
    marginLeft: 5,
    fontSize: 16,
    color: "#000000",
    paddingBottom: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalContent: {
    backgroundColor: "white",
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 20,
    width: "80%",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  starsInputRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 5,
    fontSize: 16,
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: 12,
    color: "#888",
    marginBottom: 10,
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: "#ddd",
    padding: 12,
    borderRadius: 6,
    marginRight: 10,
    alignItems: "center",
  },
  modalButtonSubmit: {
    flex: 1,
    backgroundColor: "#000",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  modalButtonText: { color: "white", fontWeight: "bold" },
  optionIcon: { width: 30, height: 30 },
});
