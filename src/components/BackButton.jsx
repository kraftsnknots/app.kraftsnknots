import React, { useRef, useEffect } from "react";
import { Animated, TouchableOpacity, Image, Text, StyleSheet } from "react-native";

export default function BackButton({ onPress }) {
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scale, { toValue: 1.1, duration: 800, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View style={[styles.actionRow, { transform: [{ scale }] }]}>
            <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.backBtn}>
                <Image source={require("../assets/icons/back-grey.png")} style={{ height: 30, width: 30 }} />
                <Text style={{ color: "#ccc", fontSize: 12 }}>Go Back</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    actionRow: {
        position: "absolute",
        bottom: 0,
        alignSelf: "center",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: 80,
        height: 50,
        backgroundColor: "#000",
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        zIndex: 999,
        elevation: 10,
    },
    backBtn: { alignItems: "center", }
});
