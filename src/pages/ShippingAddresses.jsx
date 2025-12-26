import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  TextInput,
} from "react-native";

import { getApp } from "@react-native-firebase/app";
import { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "@react-native-firebase/firestore";

import Header from "../components/Header";

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export default function ShippingAddresses({ navigation }) {
  // Always declare hooks unconditionally at top level
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newAddress, setNewAddress] = useState({
    id: null,
    name: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });
  const [currentUser, setCurrentUser] = useState(null);


  useEffect(() => {
    // onAuthStateChanged callback is NOT async directly
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigation.replace("BottomNavigation", { screen: "Account" });
        setCheckingAuth(false);
        return;
      }
      setCurrentUser(user);

      // Define async function inside effect to load data
      async function loadAddresses() {
        try {
          const q = query(
            collection(db, "shippingAddresses"),
            where("userId", "==", user.uid)
          );
          const querySnap = await getDocs(q);
          const result = [];
          querySnap.forEach((docSnap) => {
            result.push({ id: docSnap.id, ...docSnap.data() });
          });
          setAddresses(result);
        } catch (error) {
          console.error("Error fetching addresses:", error);
          Alert.alert("Error", "Could not load shipping addresses.");
        }
        setCheckingAuth(false);
      }
      loadAddresses();
    });

    return unsubscribe;
  }, [auth, db, navigation]);

  const selectAddress = (id) => {
    setSelectedAddressId(id === selectedAddressId ? null : id);
  };

  const clearForm = () => {
    setNewAddress({
      id: null,
      name: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    });
  };

  const openAddModal = () => {
    clearForm();
    setIsEditMode(false);
    setModalVisible(true);
  };

  const openEditModal = (address) => {
    setNewAddress({ ...address });
    setIsEditMode(true);
    setModalVisible(true);
  };

  const onSaveAddress = async () => {
    const { id, name, address, city, state, postalCode, country } = newAddress;
    if (!name || !address || !city || !state || !postalCode || !country) {
      Alert.alert("Missing Fields", "Please fill all the address fields.");
      return;
    }
    if (!currentUser) {
      Alert.alert("Not logged in", "User must be logged in to save address.");
      return;
    }
    try {
      if (isEditMode && id) {
        const docRef = doc(db, "shippingAddresses", id);
        await updateDoc(docRef, {
          name,
          address,
          city,
          state,
          postalCode,
          country,
          updatedAt: serverTimestamp(),
        });
        setAddresses((prev) =>
          prev.map((addr) => (addr.id === id ? { ...addr, ...newAddress } : addr))
        );
      } else {
        const docRef = await addDoc(collection(db, "shippingAddresses"), {
          userId: currentUser.uid,
          email: currentUser.email,
          name,
          address,
          city,
          state,
          postalCode,
          country,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setAddresses((prev) => [
          ...prev,
          { id: docRef.id, ...newAddress, userId: currentUser.uid, email: currentUser.email },
        ]);
      }
      setModalVisible(false);
      clearForm();
      setIsEditMode(false);
      setSelectedAddressId(null);
    } catch (e) {
      console.error("Error saving address:", e);
      Alert.alert("Error", "Failed to save address.");
    }
  };

  const onDeleteAddress = async (id) => {
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "shippingAddresses", id));
              setAddresses((prev) => prev.filter((addr) => addr.id !== id));
              if (selectedAddressId === id) setSelectedAddressId(null);
              Alert.alert("Deleted", "Address deleted successfully.");
            } catch (e) {
              console.error("Error deleting address:", e);
              Alert.alert("Error", "Failed to delete address.");
            }
          },
        },
      ]
    );
  };

  if (checkingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <Header />
          <ScrollView
            style={styles.container}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View onStartShouldSetResponder={() => true}>
              {addresses.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Shipping Address</Text>
                  {addresses.map((addr) => (
                    <View key={addr.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <TouchableOpacity
                        style={[
                          styles.addressRow,
                          selectedAddressId === addr.id && { width: '60%' }
                        ]}
                        onPress={() => selectAddress(addr.id)}
                      >
                        <View
                          style={[
                            styles.radioOuter,
                            selectedAddressId === addr.id && styles.radioSelected,
                          ]}
                        >
                          {selectedAddressId === addr.id && (
                            <View style={styles.radioInner} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text>{addr.name}</Text>
                          <Text style={styles.addressText}>
                            {addr.address}, {addr.city}, {addr.state},{" "}
                            {addr.postalCode}, {addr.country}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {selectedAddressId === addr.id && (
                        <View style={styles.optionsRow}>
                          <TouchableOpacity
                            onPress={() => openEditModal(addr)}
                            style={[styles.optionButton, styles.changeButton]}
                          >
                            <Text style={styles.optionText}>Update</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => onDeleteAddress(addr.id)}
                            style={[styles.optionButton, styles.deleteButton]}
                          >
                            <Text style={styles.optionText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 20,
                    }}
                  >
                    <TouchableOpacity
                      style={styles.backBtn}
                      onPress={() => navigation.goBack()}
                    >
                      <Text style={styles.backBtnText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.addAddressBtn}
                      onPress={openAddModal}
                    >
                      <Text style={styles.addAddressBtnText}>Add New Address</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          <Modal
            visible={modalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setModalVisible(false)}
          >
            <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
              <View style={styles.modalOverlay} />
            </TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>
                {isEditMode ? "Edit Shipping Address" : "New Shipping Address"}
              </Text>
              {[
                "name",
                "address",
                "city",
                "state",
                "postalCode",
                "country",
              ].map((field, idx) => (
                <TextInput
                  key={idx}
                  style={styles.modalInput}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  value={newAddress[field]}
                  onChangeText={(text) =>
                    setNewAddress((addr) => ({ ...addr, [field]: text }))
                  }
                />
              ))}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => {
                    setModalVisible(false);
                    clearForm();
                    setIsEditMode(false);
                  }}
                >
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={onSaveAddress}>
                  <Text style={styles.saveBtnText}>
                    {isEditMode ? "Update" : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eee", padding: 5 },
  card: { backgroundColor: "#fff", padding: 15, borderRadius: 10, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#666",
    marginRight: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#000",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#000",
  },
  addressText: { color: "#555", fontSize: 14 },

  optionsRow: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 5
  },
  optionButton: {
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRadius: 20,
    width: 90,
    alignItems: "center",
  },
  changeButton: {
    backgroundColor: "#555",
  },
  deleteButton: {
    backgroundColor: "#F44336",
  },
  optionText: {
    color: "#fff",
    fontWeight: "600",
  },

  addAddressBtn: {
    paddingVertical: 14,
    paddingHorizontal:20,
    backgroundColor: "#000",
    width: "50%",
    alignItems: "center",
    borderTopRightRadius: 50,
    borderBottomRightRadius: 50,
  },
  addAddressBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  backBtn: {
    paddingVertical: 14,
    paddingHorizontal:20,
    backgroundColor: "#eee",
    borderTopLeftRadius: 50,
    borderBottomLeftRadius: 50,
    width: "50%",
    alignItems: "center",
  },
  backBtnText: { color: "#000", fontWeight: "bold", fontSize: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    position: "absolute",
    top: '10%',
    left: "2.5%",
    width: "95%",
    textAlign: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
    backgroundColor: "#fafcff",
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#000",
    borderTopRightRadius: 35,
    borderBottomRightRadius: 35,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  closeBtn: {
    flex: 1,
    backgroundColor: "#eee",
    borderTopLeftRadius: 35,
    borderBottomLeftRadius: 35,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeBtnText: {
    color: "#888",
    fontWeight: "600",
    fontSize: 16,
  },
});
