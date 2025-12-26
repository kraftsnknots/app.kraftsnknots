import React from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity, StatusBar } from "react-native";


export default function Home({ navigation }) {

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      {/* Candle Image */}
      <View style={styles.imageContainer}>
        <Image
          source={require("../assets/images/knklogo.png")} // <- put your candle image in assets
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* Text */}
      <View style={styles.textContainer}>
        <Text style={styles.textMain}>Personalized Crafted Collection</Text>
      </View>

      {/* Arrow Button */}
      <View style={styles.txtbtn}>
        <Text style={styles.textSub}>Each of the Ujaas Aroma wick is crafted with love. Explore our unique fragrances!</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('BottomNavigation', { screen: 'Home' })}>
          <Image source={require('../assets/icons/homepage-icon.png')} style={styles.arrow} />
        </TouchableOpacity>
      </View>
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000", // dark background
    padding: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: 'center',
    alignItems: "center",
    marginTop: 50,
  },
  logo: {
    fontSize: 32,
    color: "#fff",
    marginRight: 8,
    fontWeight: "bold",
  },
  brand: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
    letterSpacing: 1,
  },
  subBrand: {
    fontSize: 12,
    color: "#aaa",
    letterSpacing: 2,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: 300,
    height: 300,
  },
  logoImage: {
    width: 450,
  },
  textContainer: {
    marginBottom: 50
  },
  textMain: {
    fontSize: 25,
    color: "#f8b2b1ff",
    fontWeight: "600",
    // fontFamily: 'Topheader'
  },
  txtbtn: {
    justifyContent: 'space-between'
  },
  textSub: {
    fontSize: 18,
    color: "#f8b2b1ff",
    fontWeight: "400",
    marginBottom: 20,
    textAlign: 'justify',
    width: '70%'
  },

  button: {
    position: "absolute",
    bottom: 25,
    right: 0,
    borderWidth: 2,
    borderColor: '#f8b2b1ff',
    backgroundColor: '#f8b2b1ff',
    borderRadius: 45,
    padding:5
  },
  arrow: {
    width: 45,
    height: 45,
  },
});
