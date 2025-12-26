import React, { useEffect, useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import {
  listenFeaturedProducts,
  listenTrendingProducts,
} from "../services/productService";
import { WishlistCartContext } from "../services/WishlistCartContext";
import Header from "../components/Header";
import FlashMessage from "../components/flashMessage";

import ShimmerPlaceholder from "react-native-shimmer-placeholder";
import LinearGradient from "react-native-linear-gradient";

export default function MainPage({ navigation }) {
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { addToCart, toggleWishlist, wishlist } = useContext(WishlistCartContext);
  const [justAdded, setJustAdded] = useState({});
  const [flashMessage, setFlashMessage] = useState(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    // simulate refresh — since listeners auto-update, just wait
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  useEffect(() => {
    const unsubscribeFeatured = listenFeaturedProducts(setFeatured);
    const unsubscribeTrending = listenTrendingProducts(setTrending);

    return () => {
      unsubscribeFeatured();
      unsubscribeTrending();
    };
  }, []);

  // Loading flags
  const loadingFeatured = featured.length === 0;
  const loadingTrending = trending.length === 0;

  // Reusable shimmer placeholder component for cards
  const ShimmerCard = () => (
    <View style={styles.shimmerCard}>
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        style={styles.shimmerImage}
        shimmerColors={["#ebebeb", "#c5c5c5", "#ebebeb"]}
      />
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        style={styles.shimmerTextTitle}
        shimmerColors={["#ebebeb", "#c5c5c5", "#ebebeb"]}
      />
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        style={styles.shimmerTextPrice}
        shimmerColors={["#ebebeb", "#c5c5c5", "#ebebeb"]}
      />
    </View>
  );

  const handleToggle = (product) => {
    toggleWishlist(product, (msg) => {
      setFlashMessage(msg);
      setTimeout(() => setFlashMessage(null), 3000);
    });
  };


  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
        <Header />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          style={{ flexGrow: 1, }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.container} onStartShouldSetResponder={() => true}>
            {/* Featured Section */}
            {loadingFeatured ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[...Array(3)].map((_, i) => (
                  <ShimmerCard key={"shimmer-featured-" + i} />
                ))}
              </ScrollView>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {featured.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.featuredCard}
                    onPress={() =>
                      navigation.navigate("BottomNavigation", {
                        screen: "Home",
                        params: {
                          screen: "Details",
                          params: { productId: item.id, pagelink: "MainScreen" },
                        },
                      })
                    }
                  >
                    <TouchableOpacity
                      style={styles.heart}
                      onPress={() => handleToggle(item)}
                    >
                      <Image
                        source={
                          wishlist.find((p) => p.id === item.id)
                            ? require("../assets/icons/pure-heart-red.png") // filled heart
                            : require("../assets/icons/pure-heart-black.png")
                        }
                        style={styles.heartIcon}
                      />
                    </TouchableOpacity>

                    <Image
                      source={{ uri: item.images[0] }}
                      style={styles.featuredImage}
                    />

                    {/* Linear Gradient Ribbon */}
                    <LinearGradient
                      colors={
                        item.ribbon === "New"
                          ? ["#eee", "#ccc"]
                          : ["#000", "#000"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.ribbon}
                    >
                      <Text style={styles.ribbonTitle}>
                        {item.ribbon === "New" ? "Newly Launched" : "Featuring"}
                      </Text>
                    </LinearGradient>

                    <View style={styles.textContainer}>
                      <View style={styles.titlePrice}>
                        <Text style={styles.featuredTitle}>{item.title}</Text>
                        <Text style={styles.featuredPrice}>&#x20B9; {item.price}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          addToCart(item);

                          // show tick temporarily
                          setJustAdded((prev) => ({ ...prev, [item.id]: true }));
                          setTimeout(() => {
                            setJustAdded((prev) => ({ ...prev, [item.id]: false }));
                          }, 3000);

                          // show flash message
                          setFlashMessage(`Added to Cart Successfully`);
                          setTimeout(() => setFlashMessage(null), 3000);
                        }}
                      >
                        <Image
                          source={
                            justAdded[item.id]
                              ? require("../assets/icons/tick.png")
                              : require("../assets/icons/add-to-cart-white.png")
                          }
                          style={styles.bag}
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Trending Product Title */}
            <Text style={styles.trendingTitle}>Trending Products</Text>

            {/* Trending Products Grid */}
            <View style={styles.trendingContainer}>
              {loadingTrending
                ? [...Array(4)].map((_, i) => <ShimmerCard key={"shimmer-trending-" + i} />)
                : trending.map((item) => (

                  <TouchableOpacity
                    key={item.id}
                    style={styles.trendingCard}
                    onPress={() =>
                      navigation.navigate("Details", { productId: item.id })

                    }
                  >
                    <TouchableOpacity
                      style={styles.heart}
                      onPress={() => handleToggle(item)} >
                      <Image
                        source={
                          wishlist.find((p) => p.id === item.id)
                            ? require("../assets/icons/pure-heart-red.png") // filled heart
                            : require("../assets/icons/pure-heart-black.png")
                        }
                        style={styles.heartIcon}
                      />
                    </TouchableOpacity>

                    <Image
                      source={{ uri: item.images[0] }}
                      style={styles.trendingImage}
                    />
                    <Text style={styles.trendingName}>{item.title}</Text>
                    <View style={styles.priceCart}>
                      <Text style={styles.trendingPrice}>&#x20B9; {item.price}</Text>

                      <TouchableOpacity
                        onPress={() => {
                          addToCart(item);

                          // show tick temporarily
                          setJustAdded((prev) => ({ ...prev, [item.id]: true }));
                          setTimeout(() => {
                            setJustAdded((prev) => ({ ...prev, [item.id]: false }));
                          }, 3000);
                          // show flash message
                          setFlashMessage(`Added to Cart Successfully`);
                          setTimeout(() => setFlashMessage(null), 3000);
                        }}
                      >
                        <Image
                          source={
                            justAdded[item.id]
                              ? require("../assets/icons/tick.png")
                              : require("../assets/icons/add-to-cart-black.png")
                          }
                          style={styles.bag}
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        </ScrollView>
        <FlashMessage message={flashMessage} />
      </View >
    </TouchableWithoutFeedback >
  );
}

const styles = StyleSheet.create({
  bag: {
    width: 32,
    height: 30,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
  },
  featuredCard: {
    width: 350,
    height: 350,
    marginTop: 20,
    marginRight: 1,
    marginLeft: 8,
    overflow: "hidden",
    position: "relative",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  ribbon: {
    position: "absolute",
    top: 12,
    left: 0,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    borderColor: "#fff",
  },
  ribbonTitle: {
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  textContainer: {
    width: "100%",
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    bottom: 0,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  titlePrice: {
    maxWidth:'85%'
  },
  featuredTitle: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  featuredPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 2,
  },
  trendingTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 30,
  },
  trendingContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  trendingCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    paddingBottom: 10,
    marginBottom: 15,
    alignItems: "flex-start",
    position: "relative",
  },
  heart: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
    padding: 5,
  },
  heartIcon: {
    width: 35,
    height: 35,
  },
  trendingImage: {
    width: "100%",
    height: 200,
    resizeMode: "contain",
    marginBottom: 8,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  trendingName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    marginLeft: 10,
    marginBottom: 4,
  },
  trendingPrice: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  priceCart: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  shimmerCard: {
    width: 150,
    marginHorizontal: 8,
    marginTop: 20,
  },
  shimmerImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  shimmerTextTitle: {
    width: 130,
    height: 20,
    marginBottom: 6,
    borderRadius: 4,
  },
  shimmerTextPrice: {
    width: 80,
    height: 20,
    borderRadius: 4,
  },
});
