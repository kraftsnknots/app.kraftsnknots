import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard
} from "react-native";
import { getAuth, updateProfile, updateEmail } from "@react-native-firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "@react-native-firebase/firestore";
import { getApp } from "@react-native-firebase/app";

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const EditProfile = ({onClose}) => {
  const user = auth.currentUser;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return; // ✅ No conditional hook return
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setName(userData.name || "");
          setEmail(user.email || "");
          setPhone(userData.phone || "");

        }
      } catch (error) {
        Alert.alert("Error", "Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Name cannot be empty");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Validation", "Email cannot be empty");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("Validation", "Phone cannot be empty");
      return;
    }


    setLoading(true);
    try {
      await updateProfile(user, { displayName: name });

      if (user.email !== email) {
        await updateEmail(user, email);
      }

      await updateDoc(doc(db, "users", user.uid), {
        name,
        email,
        phone,
      });

      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <Text style={styles.title}>Edit Profile</Text>

        <View style={styles.card}>
          {/* Name */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Enter your name"
          />

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            style={styles.input}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            readOnly
          />

          {/* Phone */}
          <Text style={styles.label}>Phone</Text>
          <TextInput
            value={phone}
            onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ""))}
            style={styles.input}
            placeholder="Enter phone number"
            keyboardType="numeric"
          />
        </View>

        {/* Save Button */}
        <View style={styles.modalButtonsRow}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
          >
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>
              Save Changes
            </Text>
          </TouchableOpacity>
        </View>
        </View>
    </TouchableWithoutFeedback>
  );
};

export default EditProfile;

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    color: "#111827",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
  },
  radioGroup: {
    flexDirection: "row",
    marginBottom: 16,
  },
  radioButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    marginRight: 10,
  },
  radioSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  radioText: {
    color: "#374151",
    fontWeight: "500",
  },
  radioTextSelected: {
    color: "#FFFFFF",
  },
  dobRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dobPicker: {
    flex: 1,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
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
