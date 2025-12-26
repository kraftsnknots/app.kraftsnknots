import React, { useContext, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard
} from "react-native";
import { WishlistCartContext } from "../services/WishlistCartContext";
import Header from "../components/Header";
import FlashMessage from "../components/flashMessage";

export default function WishlistPage({ navigation }) {
  const { addToCart, wishlist, toggleWishlist } = useContext(WishlistCartContext);

  const [justAdded, setJustAdded] = useState({});
  const [flashMessage, setFlashMessage] = useState(null);

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
        <View style={styles.container}>
          {wishlist.length > 0 ? (
            <FlatList
              data={wishlist}
              keyExtractor={(item) => item.id}
              numColumns={2} // fixed columns
              key={"2-columns"} // 👈 prevents "changing numColumns" crash
              columnWrapperStyle={{ justifyContent: "space-between" }}
              contentContainerStyle={{ padding: 10 }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.card}
                  onPress={() =>
                    navigation.navigate("BottomNavigation", {
                      screen: "Home",
                      params: {
                        screen: "Details",
                        params: { productId: item.id, pagelink: "WishlistScreen" },
                      },
                    })
                  }
                >

                  {/* Heart Icon (toggle remove) */}
                  <TouchableOpacity
                    style={styles.heart}
                    onPress={() => handleToggle(item)}
                  >
                    <Image
                      source={require("../assets/icons/cross-white.png")}
                      style={styles.crossIcon}
                    />
                  </TouchableOpacity>

                  {/* Product Image */}
                  <Image source={{ uri: item.images[0] }} style={styles.image} />

                  {/* Title */}
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.priceCart}>
                    {/* Price */}
                    <Text style={styles.price}>&#x20B9; {item.price}</Text>
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
                </Pressable >
              )
              }
            />

          ) : (<View style={styles.emptyContainer}>
            <Image style={styles.emptyIcon} source={require("../assets/images/wishlist.webp")} />
            <Text style={styles.emptyText}>Your Wishlist is Empty</Text>
            <Text style={styles.emptySubText}>
              Only products with filled red heart can be seen here only
            </Text>
          </View>)}
        </View>
       <FlashMessage message={flashMessage} />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  card: {
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
  bag: {
    width: 32,
    height: 30,
  },
  heart: {
    position: "absolute",
    top: -10,
    right: -10,
    zIndex: 1,
    padding: 10,
    backgroundColor: '#000',
    borderRadius: 20
  },
  crossIcon: {
    width: 15,
    height: 15,
  },
  image: {
    width: "100%",
    height: 200,
    resizeMode: "contain",
    marginBottom: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  title: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    marginLeft: 10,
    marginBottom: 4,
  },
  price: {
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
  flashContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#565147",
    padding: 25,
    borderRadius: 8,
    alignItems: "center",
  },
  flashText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  emptySubText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },

});
