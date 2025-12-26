import React, { useContext, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { WishlistCartContext } from "../services/WishlistCartContext";

export default function ProductPageFooter({ product }) {
    const { addToCart } = useContext(WishlistCartContext);
    const [added, setAdded] = useState(false);

    const handleAddToCart = () => {
        addToCart(product);
        setAdded(true);

        // switch back after 3s
        setTimeout(() => setAdded(false), 3000);
    };

    return (
        <View style={styles.footer}>
            <Text style={styles.price}>&#x20B9; {product.price} / Piece</Text>
            <TouchableOpacity
                style={[styles.buyButton, added && styles.addedButton]}
                onPress={handleAddToCart}
                disabled={added} // prevent spam clicking
            >
                <Text style={styles.buyText}>
                    {added ? "ADDED" : "BUY NOW"}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    footer: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: '#000'
    },
    price: {
        fontSize: 20,
        fontWeight: "bold",
        backgroundColor: "#565147",
        width: "50%",
        padding: 25,
        textAlign: "center",
        color: "#fff",
    },
    buyButton: {
        backgroundColor: "#000",
        width: "50%",
    },
    addedButton: {
        backgroundColor: "#333", // slightly lighter when added
    },
    buyText: {
        color: "#e7b81cff",
        fontWeight: "bold",
        padding: 25,
        textAlign: "center",
        fontSize: 20,
    },
});
