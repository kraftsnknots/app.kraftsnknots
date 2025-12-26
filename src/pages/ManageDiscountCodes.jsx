import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  Switch,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
} from "@react-native-firebase/firestore";
import { app } from "../firebase/firebaseConfig"; // adjust path if needed
import Header from "../components/Header";

const auth = getAuth(app);
const db = getFirestore(app);

export default function ManageDiscountCodes({ navigation }) {
  const [discountName, setDiscountName] = useState("");
  const [discountType, setDiscountType] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [status, setStatus] = useState("Active");
  const [discountCodes, setDiscountCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigation.replace("BottomNavigation", { screen: "Account" });
      }
      setCheckingAuth(false);
    });

    fetchDiscountCodes();

    return () => unsubscribeAuth();
  }, []);

  // Fetch discount codes
  const fetchDiscountCodes = async () => {
    setListLoading(true);
    try {
      const discountRef = collection(db, "discountCodes");
      const q = query(discountRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const codes = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setDiscountCodes(codes);
    } catch (error) {
      console.error("Error fetching discount codes:", error);
      Alert.alert("Error", "Could not fetch discount codes");
    } finally {
      setListLoading(false);
    }
  };

  // Save discount code
  const saveDiscountCode = async () => {
    if (!discountName || !discountCode || !discountValue) {
      Alert.alert("Validation", "Name, Code, and Value are required!");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "discountCodes"), {
        name: discountName,
        type: discountType,
        code: discountCode,
        value: parseFloat(discountValue),
        status,
        createdAt: serverTimestamp(),
      });

      Alert.alert("✅ Success", "Discount code saved successfully!");
      setDiscountName("");
      setDiscountType("Percentage");
      setDiscountCode("");
      setDiscountValue("");
      setStatus("Active");

      fetchDiscountCodes();
    } catch (err) {
      console.error("Error saving discount code:", err);
      Alert.alert("❌ Error", "Could not save discount code");
    } finally {
      setLoading(false);
    }
  };

  // Toggle status active/inactive
  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const ref = doc(db, "discountCodes", id);
      await updateDoc(ref, { status: newStatus });

      setDiscountCodes((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: newStatus } : item
        )
      );
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Could not update status");
    }
  };

  if (checkingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Header />

        <ScrollView style={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View onStartShouldSetResponder={() => true}>
            <View style={styles.formCard}>
              <Text style={styles.header}>Add New Discount Code</Text>

              <TextInput
                placeholder="Discount Name *"
                placeholderTextColor="#C0C0C0"
                style={styles.input}
                value={discountName}
                onChangeText={setDiscountName}
              />

              <Text style={styles.label}>Discount Type</Text>
              <Picker
                selectedValue={discountType}
                onValueChange={(val) => setDiscountType(val)}
                style={styles.picker}
              >
                <Picker.Item label="Select Discount Type" value="" color="#C0C0C0" disabled />
                <Picker.Item label="Percentage (%)" value="Percentage" color="#000" />
                <Picker.Item label="Flat (₹)" value="Flat" color="#000" />
              </Picker>

              <TextInput
                placeholder="Discount Code *"
                placeholderTextColor="#C0C0C0"
                style={[styles.input, { textTransform: "uppercase" }]}
                value={discountCode}
                onChangeText={setDiscountCode}
              />

              <TextInput
                placeholder="Discount Value *"
                placeholderTextColor="#C0C0C0"
                style={styles.input}
                keyboardType="numeric"
                value={discountValue}
                onChangeText={setDiscountValue}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={{ color: 'black' }}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={saveDiscountCode}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveText}>Save Discount Code</Text>
                  )}
                </TouchableOpacity>

              </View>
            </View>

            <View style={{ marginTop: 30, paddingHorizontal: 10, marginBottom: 30 }}>
              <Text style={[styles.header, { fontSize: 20 }]}>Discount Codes</Text>
              {listLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : discountCodes.length === 0 ? (
                <Text>No discount codes found.</Text>
              ) : (
                discountCodes.map(({ id, name, code, status }) => (
                  <View key={id} style={styles.discountItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "bold" }}>{name}</Text>
                      <Text style={{ color: "#555" }}>{code}</Text>
                    </View>
                    <Switch
                      value={status === "Active"}
                      onValueChange={() => toggleStatus(id, status)}
                      thumbColor={status === "Active" ? "#4caf50" : "#f44336"}
                      trackColor={{ false: "#ffcdd2", true: "#a5d6a7" }}
                    />
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: "#eee", padding: 5 },
  formCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
  },
  label: { marginBottom: 5, fontWeight: "bold", color: "#333" },
  picker: { backgroundColor: "#f9f9f9", marginBottom: 15 },
  saveBtn: {
    backgroundColor: "#000",
    padding: 15,
    borderBottomRightRadius: 35,
    borderTopRightRadius: 35,
    alignItems: "center",
    width: '50%',
  },
  saveText: { color: "#fff", fontWeight: "bold" },
  discountItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  backBtn: {
    backgroundColor: "#eee",
    padding: 15,
    borderBottomLeftRadius: 35,
    borderTopLeftRadius: 35,
    alignItems: "center",
    width: '50%',
  },
});
