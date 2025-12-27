import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  updateProfile,
  signOut,
  reload
} from "@react-native-firebase/auth";

import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from "@react-native-firebase/firestore";

import {
  getStorage,
  ref,
  getDownloadURL,
  putFile,
} from "@react-native-firebase/storage";
import * as ImagePicker from "react-native-image-picker";
import EditProfile from "./EditProfile";
import Modal from "react-native-modal";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LinearGradient from 'react-native-linear-gradient';

export default function AccountScreen({ navigation }) {
  const app = getApp();
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);

  const [userData, setUserData] = useState({
    name: "",
    email: "",
    photoURL: null,
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [logoutlink, setLogoutlink] = useState(
    require("../assets/icons/logout_grey.png")
  );

  useEffect(() => {
    setLoading(true);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const userRef = doc(firestore, "users", currentUser.uid);

        // Use onSnapshot for realtime updates
        const unsubscribeSnapshot = onSnapshot(
          userRef,
          (userSnap) => {
            if (userSnap.exists()) {
              const data = userSnap.data();
              setUserData({
                name: data.name || "",
                email: data.email || currentUser.email || "",
                photoURL: data.photoURL ?? currentUser.photoURL ?? null,
              });
              setIsAdmin(data.admin === true);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching user data:", error);
            setLoading(false);
          }
        );

        // Return the snapshot unsubscribe function
        return unsubscribeSnapshot;
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);


  const launchCameraOrGallery = async (type) => {
    try {
      const options = {
        mediaType: "photo",
        quality: 0.8,
        saveToPhotos: true,
        includeBase64: false,
      };

      const callback = async (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          console.warn("Picker error:", response.errorMessage);
          Alert.alert("Error", "Failed to open camera/gallery. Please try again.");
          return;
        }

        const asset = response.assets?.[0];
        if (!asset?.uri) return;

        try {
          const currentUser = auth.currentUser;
          if (!currentUser) return;

          setUploading(true);

          // ✅ Upload image
          const reference = ref(
            storage,
            `userPictures/${currentUser.uid}/${currentUser.uid}.jpg`
          );
          await putFile(reference, asset.uri);

          // ✅ Get download URL
          const downloadURL = await getDownloadURL(reference);

          // ✅ Update Firebase Auth + Firestore
          await updateProfile(currentUser, { photoURL: downloadURL });
          await setDoc(
            doc(firestore, "users", currentUser.uid),
            { photoURL: downloadURL },
            { merge: true }
          );

          // ✅ Update local UI
          setUserData((prev) => ({ ...prev, photoURL: downloadURL }));
        } catch (err) {
          console.error("Upload error:", err);
          Alert.alert("Error", "Failed to upload photo. Please try again.");
        } finally {
          setUploading(false);
        }
      };

      // ✅ Run picker safely with delay (avoid modal conflict)
      setTimeout(() => {
        if (type === "camera") {
          ImagePicker.launchCamera(options, callback);
        } else {
          ImagePicker.launchImageLibrary(options, callback);
        }
      }, 400);
    } catch (error) {
      console.error("Picker launch failed:", error);
    }
  };

  const handleSingleLogoutPress = () => {
    setLogoutlink(require("../assets/icons/logout_black.png"));
    Alert.alert("Signout", "Are you sure you want to Signout...", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes", onPress: () => handleLogout() },
    ]);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace("BottomNavigation", { screen: "Home" });
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeleteProfilePicture = async () => {
    Alert.alert(
      "Delete Profile Picture",
      "Are you sure you want to remove your profile picture?",
      [
        { text: "Cancel", style: "cancel", onPress: () => setModalVisible(true) },
        {
          text: "Yes",
          onPress: async () => {
            try {
              setUploading(true);
              const currentUser = auth.currentUser;
              if (!currentUser) return;

              await updateProfile(currentUser, { photoURL: null });
              await reload(currentUser);
              await setDoc(
                doc(firestore, "users", currentUser.uid),
                { photoURL: null },
                { merge: true }
              );
              setUserData((prev) => ({ ...prev, photoURL: null }));
              await AsyncStorage.removeItem("userProfile");

              setUploading(false);
            } catch (error) {
              console.error("Error deleting profile picture:", error);
              Alert.alert("Error", "Failed to delete profile picture.");
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          {/* ✅ Uploading Overlay */}
          {uploading && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.overlayText}>Processing...</Text>
            </View>
          )}

          <LinearGradient
            colors={['#000', '#000']}
            style={styles.navbar}>
            <View
              style={styles.navImgs}>

              <Image
                source={require("../assets/images/knklogo4.png")}
                style={styles.logoRight}
              />
            </View>
            <TouchableOpacity
              onPress={handleSingleLogoutPress}
              onLongPress={handleLogout}
            >
              <Image source={logoutlink} style={styles.back} />
            </TouchableOpacity>
          </LinearGradient >

          <ScrollView
            style={styles.container}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View onStartShouldSetResponder={() => true}>
              <View style={styles.header}>
                <ScrollView style={styles.profileWrapper}>
                  <Image
                    source={
                      userData?.photoURL !== null
                        ? { uri: userData.photoURL }
                        : require("../assets/icons/dummy_profile_picture.png")
                    }
                    style={styles.avatar}
                  />
                  <TouchableOpacity
                    style={styles.cameraIcon}
                    onPress={() => setModalVisible(true)}
                  >
                    <Image
                      source={require("../assets/icons/change-photo-white.png")}
                      style={styles.changeDp}
                    />
                  </TouchableOpacity>
                </ScrollView>
                {loading ? (
                  <ActivityIndicator
                    size="large"
                    color="#000"
                    style={{ marginTop: 10 }}
                  />
                ) : (
                  <View style={styles.details}>
                    <Text style={styles.name}>
                      {userData?.name || "No Name"}
                    </Text>
                    <Text style={styles.subtitle}>
                      {userData?.email || "No Email"}
                    </Text>
                  </View>
                )}
                <Image
                  source={require("../assets/icons/black_ribbon.png")}
                  style={styles.ribbon}
                />
              </View>

              {/* My Orders Section */}
              <View
                style={{
                  borderBottomWidth: 1,
                  borderColor: "#eee",
                  paddingBottom: 30,
                }}
              >
                <Text style={styles.sectionTitle}>My Orders</Text>
                <View style={styles.orderRow}>
                  <TouchableOpacity
                    style={styles.orderItem}
                    onPress={() => navigation.navigate("PendingPaymentOrders")}
                  >
                    <Image
                      source={require("../assets/icons/pending_payment.png")}
                      style={styles.orderIcon}
                    />
                    <Text style={styles.orderText}>Pending Payment</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.orderItem}
                    onPress={() =>
                      navigation.navigate("TopTabs", { screen: "Processing" })
                    }
                  >
                    <Image
                      source={require("../assets/icons/order_processing.png")}
                      style={styles.orderIcon}
                    />
                    <Text style={styles.orderText}>Processing</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.orderItem}
                    onPress={() =>
                      navigation.navigate("TopTabs", { screen: "Delivered" })
                    }
                  >
                    <Image
                      source={require("../assets/icons/delivered.png")}
                      style={styles.orderIcon}
                    />
                    <Text style={styles.orderText}>Delivered</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.orderRow}>
                  <TouchableOpacity
                    style={styles.orderItem}
                    onPress={() =>
                      navigation.navigate("TopTabs", { screen: "Cancelled" })
                    }
                  >
                    <Image
                      source={require("../assets/icons/order_cancelled.png")}
                      style={styles.orderIcon}
                    />
                    <Text style={styles.orderText}>Cancelled</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.orderItem}
                    onPress={() =>
                      navigation.navigate("BottomNavigation", {
                        screen: "Wishlist",
                      })
                    }
                  >
                    <Image
                      source={require("../assets/icons/heart-red.png")}
                      style={styles.orderIcon}
                    />
                    <Text style={styles.orderText}>Wishlist</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.orderItem}
                    onPress={() => navigation.navigate("CustomerCare")}
                  >
                    <Image
                      source={require("../assets/icons/customer_care.png")}
                      style={styles.orderIcon}
                    />
                    <Text style={styles.orderText}>Customer Care</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Options */}
              <TouchableOpacity
                style={styles.option}
                onPress={() => setProfileModal(true)}
              >
                <Image
                  source={require("../assets/icons/profile_icon.png")}
                  style={styles.optionIcon}
                />
                <Text style={styles.optionText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.option}
                onPress={() => navigation.navigate("ShippingAddresses")}
              >
                <Image
                  source={require("../assets/icons/ship_address.png")}
                  style={styles.optionIcon}
                />
                <Text style={styles.optionText}>Shipping Address</Text>
              </TouchableOpacity>

              {isAdmin && (
                <>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("AddProducts")}
                    style={styles.option}
                  >
                    <Image
                      source={require("../assets/icons/add_product.png")}
                      style={styles.optionIcon}
                    />
                    <Text style={styles.optionText}>Add New Product</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate("ManageOffers")}
                    style={styles.option}
                  >
                    <Image
                      source={require("../assets/icons/manage_offers_icon.png")}
                      style={styles.optionIcon}
                    />
                    <Text style={styles.optionText}>Manage Offers</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>

          {/* Profile Picture Modal */}
          <Modal
            isVisible={modalVisible}
            onSwipeComplete={() => setModalVisible(false)}
            swipeDirection="down"
            onBackdropPress={() => setModalVisible(false)}
            style={{ justifyContent: "flex-end", margin: 0 }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View
                  style={{
                    top: -15,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <View style={styles.topBorder}></View>
                </View>
                <Text style={styles.modalHeadingText}>
                  Edit Profile Picture
                </Text>
                <View style={styles.modalOptionContainer}>
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => {
                      setModalVisible(false);
                      launchCameraOrGallery("camera");
                    }}
                  >
                    <Text style={styles.modalText}>Take Photo</Text>
                    <Text style={styles.modalTextEmoji}>📸</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => {
                      setModalVisible(false);
                      launchCameraOrGallery("gallery");
                    }}
                  >
                    <Text style={styles.modalText}>Choose Photo</Text>
                    <Text style={styles.modalTextEmoji}>🖼️</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.modalOptionContainer, { marginTop: 10 }]}>
                  <TouchableOpacity
                    style={[styles.modalOption, { borderBottomWidth: 0 }]}
                    onPress={() => {
                      setModalVisible(false);
                      handleDeleteProfilePicture();
                    }}
                  >
                    <Text style={[styles.modalText, { color: "red" }]}>
                      Delete Photo
                    </Text>
                    <Text style={[styles.modalTextEmoji, { color: "red" }]}>
                      🗑️
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Edit Profile Modal */}
          <Modal
            isVisible={profileModal}
            onSwipeComplete={() => setProfileModal(false)}
            swipeDirection="down"
            onBackdropPress={() => setProfileModal(false)}
            style={{ justifyContent: "flex-end", margin: 0 }}
          >
            <View style={styles.profileModalOverlay}>
              <View style={styles.profileModalContent}>
                <View
                  style={{
                    top: -15,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <View style={styles.topBorder}></View>
                </View>
                <EditProfile onClose={() => setProfileModal(false)} />
              </View>
            </View>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 2,
    borderBottomColor: "#eee",
    width: "100%",
    paddingTop: 45,
  },
  navImgs: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

  },
  logoRight: { width: 250, height: 70, objectFit: 'contain' },

  logo: { width: 120, height: 50 },
  back: { width: 30, height: 30 },
  container: { flex: 1, backgroundColor: "#fff" },
  header: { backgroundColor: "#fff", alignItems: "center" },
  profileWrapper: { position: "relative", width: '100%', height: '250' },
  avatar: {
    width: '100%',
    height: '700',
    borderColor: "#eee",
    borderStyle: "solid",
    resizeMode: 'cover'
  },
  cameraIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    // backgroundColor: "#000",
    // borderRadius: 20,
    padding: 5,
    zIndex: 9
  },
  changeDp: {
    width: 50,
    height: 40
  },
  details: {
    bottom: 125,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
    paddingVertical: 5,
    justifyContent: 'flex-start',
    alignItems: 'center',
    height: 80,
    borderRadius: 20
  },
  name: { fontSize: 20, fontWeight: "bold", color: "#fff", zIndex: 2 },
  subtitle: { fontSize: 14, color: "#fff", zIndex: 2, marginTop: 5 },
  ribbon: { width: "100%", height: 150, position: 'absolute', bottom: 30 },
  sectionTitle: {
    marginLeft: 20,
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 25,
  },
  orderItem: { alignItems: "center", width: 90 },
  orderIcon: { width: 40, height: 40, marginBottom: 5 },
  orderText: { fontSize: 12, textAlign: "center", color: "#444" },
  option: {
    padding: 25,
    borderBottomWidth: 1,
    borderColor: "#eee",
    marginHorizontal: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  optionIcon: { width: 30, height: 30 },
  optionText: { fontSize: 16, color: "#333" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  modalContent: {
    backgroundColor: "#eee",
    width: "100%",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    paddingBottom: 60,
  },
  modalOptionContainer: { backgroundColor: "#fff", borderRadius: 5 },
  modalOption: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: "#ddd",
    borderBottomWidth: 1,
  },
  modalHeadingText: {
    fontSize: 18,
    color: "#000",
    fontWeight: "bold",
    marginBottom: 25,
  },
  modalText: { fontSize: 16, color: "#000" },
  modalTextEmoji: { fontSize: 20, color: "#000" },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    marginTop: "20%",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  profileModalContent: {
    width: "100%",
    backgroundColor: "#eee",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  topBorder: {
    width: 80,
    height: 5,
    backgroundColor: "#aaa",
    borderRadius: 10,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 99,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
  },
});