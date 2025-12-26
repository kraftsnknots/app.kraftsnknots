import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const WishlistCartContext = createContext();

export const WishlistCartProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [cart, setCart] = useState([]);
  const [loaded, setLoaded] = useState(false);


  // Load data on start
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedWishlist = await AsyncStorage.getItem("@wishlist");
        const storedCart = await AsyncStorage.getItem("@cart");
        if (storedWishlist) setWishlist(JSON.parse(storedWishlist));
        if (storedCart) setCart(JSON.parse(storedCart));
      } catch (err) {
        console.log("Error loading storage:", err);
      } finally {
        setLoaded(true); // ✅ now we can allow saving
      }
    };
    loadData();
  }, []);

  // Save data on changes (only after loaded)
  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem("@wishlist", JSON.stringify(wishlist));
    }
  }, [wishlist, loaded]);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem("@cart", JSON.stringify(cart));
    }
  }, [cart, loaded]);

  // --- Wishlist ---
  const toggleWishlist = (product, onMessage) => {
    const title = product.title;
    
    setWishlist((prev) => {
      const exists = prev.find((p) => p.id === product.id);

      if (exists) {
        onMessage?.(title + " is removed from Wishlist ❌");
        return prev.filter((p) => p.id !== product.id);
      } else {
        onMessage?.(title + " is added to Wishlist ❤️");
        return [...prev, product];
      }
    });
  };



  // --- Cart ---

  const clearCart = () => {
    setCart([]);
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, qty: p.qty + 1 } : p
        );
      } else {
        return [...prev, { ...product, qty: 1 }];
      }
    });
  };

  const moveToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id
            ? { ...p, qty: p.qty + (product.qty || 1) }
            : p
        );
      } else {
        return [...prev, { ...product, qty: product.qty || 1 }];
      }
    });
  };


  const removeFromCart = (id) => {
    console.log(id);

    setCart((prev) => prev.filter((p) => p.id !== id));
  };


  const updateQty = (id, qty) => {
    if (qty <= 0) return removeFromCart(id);
    setCart((prev) =>
      prev.map((p) => (p.id === id ? { ...p, qty } : p))
    );
  };

  return (
    <WishlistCartContext.Provider
      value={{
        wishlist,
        toggleWishlist,
        clearCart,
        cart,
        addToCart,
        removeFromCart,
        updateQty,
        moveToCart
      }}
    >
      {children}
    </WishlistCartContext.Provider>
  );
};
