import React, { useContext, useMemo } from "react";
import {
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet,
  TouchableWithoutFeedback,
  Keyboard
} from "react-native";
import { WishlistCartContext } from "../services/WishlistCartContext";
import { getAuth } from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';
import Header from "../components/Header";



export default function CartPage({ navigation }) {
  const { cart, updateQty, removeFromCart, clearCart } = useContext(WishlistCartContext);
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
        <Header />
        <View style={styles.container}>
          {cart.length > 0 ? (
            <FlatList
              data={cart}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  {/* Product Image */}
                  <Image source={{ uri: item.images[0] }} style={styles.productImage} />

                  {/* Product Details */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{item.title}</Text>
                    {/* <Text style={styles.brand}>{item.options[0].name}: {item.options[0].value}, {item.options[1].name}: {item.options[1].value}</Text> */}
                    <Text style={styles.price}>₹ {item.price}</Text>

                    {/* Quantity Controls */}
                    <View style={styles.qtyContainer}>
                      <TouchableOpacity onPress={() => updateQty(item.id, item.qty - 1)}>
                        <Text style={styles.qtyBtn}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qty}>{item.qty}</Text>
                      <TouchableOpacity onPress={() => updateQty(item.id, item.qty + 1)}>
                        <Text style={styles.qtyBtn}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Remove Button */}
                  <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.removeBtn}>
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          ) : (<View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyText}>Your Cart is Empty</Text>
            <Text style={styles.emptySubText}>
              Start adding products to see them here
            </Text>
          </View>)}

          {/* Footer */}
          {cart.length > 0 && (
            <View style={styles.footer}>
              {/* Amount Summary */}
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Subtotal Amount:</Text>
                <Text style={styles.amountValue}>₹ {total.toFixed(2)}</Text>
              </View>

              {/* Checkout Button */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.checkoutBtn, { backgroundColor: '#eee', borderTopLeftRadius: 35, borderBottomLeftRadius: 35 }]}
                  onPress={() => clearCart()}>
                  <Text style={[styles.checkoutText, { color: '#000' }]}>Clear Cart</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.checkoutBtn, { borderTopRightRadius: 35, borderBottomRightRadius: 35 }]}
                  onPress={() => {
                    const auth = getAuth(getApp());
                    if (auth.currentUser) {
                      navigation.replace('Checkout');
                    } else {
                      navigation.navigate('BottomNavigation', { screen: 'Account', params: { screen: 'Login' } });
                    }
                  }}
                >
                  <Text style={styles.checkoutText}>Check Out ({cart.length})</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ textAlign: 'center', fontSize: 14, color: 'silver', marginTop: 10 }}>🔒 Secure checkout</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 100,
    // backgroundColor: '#fff'
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
    resizeMode: "contain",
  },
  brand: {
    fontSize: 12,
    color: "#777",
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333",
  },
  price: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  qtyBtn: {
    fontSize: 20,
    color: "#000",
    fontWeight: "bold",
    paddingHorizontal: 10,
  },
  qty: {
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 6,
  },
  removeBtn: {
    marginLeft: 8,
    padding: 4,
  },
  removeText: {
    fontSize: 18,
    color: "#000",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingRight: 16,
    paddingLeft: 16,
    paddingBottom: 5,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  amountContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 14,
    color: "#555",
  },
  amountValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  checkoutBtn: {
    width: '50%',
    backgroundColor: "#000",
    paddingVertical: 15,
    alignItems: "center",
  },
  checkoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIcon: {
    fontSize: 50,
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
