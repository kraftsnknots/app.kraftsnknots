import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard
} from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import { Picker } from "@react-native-picker/picker";
import RNFS from "react-native-fs";

// ✅ Explicit App Binding
import { getApp } from "@react-native-firebase/app";
import { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from "@react-native-firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "@react-native-firebase/storage";
import Header from "../components/Header";

const app = getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

export default function AddProductPage({ navigation }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [sku, setSku] = useState("");
  const [weight, setWeight] = useState("");
  const [ribbon, setRibbon] = useState("");
  const [images, setImages] = useState([]);
  const [uploadedUrls, setUploadedUrls] = useState([]);
  const [size, setSize] = useState("M");
  const [color, setColor] = useState("Red");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) navigation.replace("BottomNavigation", { screen: "Account" });
      setCheckingAuth(false);
    });
    return unsubscribe;
  }, []);

  if (checkingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const getFilePath = async (uri) => {
    if (Platform.OS === "android" && uri.startsWith("content://")) {
      const destPath = `${RNFS.TemporaryDirectoryPath}/${Date.now()}.jpg`;
      await RNFS.copyFile(uri, destPath);
      return destPath;
    }
    return uri;
  };

  const handleImagePick = () => {
    launchImageLibrary({ mediaType: "photo", selectionLimit: 5 }, (response) => {
      if (!response.didCancel && response.assets) {
        const uris = response.assets.map((a) => a.uri);
        setImages((prev) => [...prev, ...uris]);
      }
    });
  };

  // ✅ Upload all images under 'products/{productId}/'
  const uploadImagesToStorage = async (productId) => {
    const urls = [];
    for (let i = 0; i < images.length; i++) {
      const filePath = await getFilePath(images[i]);
      const fileName = `${Date.now()}_${i}.jpg`;
      const storageRef = ref(storage, `products/${productId}/${fileName}`);
      const img = await fetch(images[i]);
      const blob = await img.blob();

      await new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, blob);
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            setUploadProgress((prev) => ({ ...prev, [i]: progress }));
          },
          (error) => {
            console.error("Upload error:", error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(storageRef);
            urls.push(downloadURL);
            resolve();
          }
        );
      });
    }
    return urls;
  };

  const saveProduct = async () => {
    if (!title || !price) {
      Alert.alert("Validation", "Title and Price are required!");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create Firestore document to get productDocId
      const newDocRef = doc(collection(firestore, "products"));
      const productDocId = newDocRef.id;

      // Step 2: Upload images under the folder using productDocId
      const urls = await uploadImagesToStorage(productDocId);

      // Step 3: Save product data in Firestore with the same productDocId
      await setDoc(newDocRef, {
        title,
        subtitle,
        description,
        ribbon: ribbon || null,
        images: urls,
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : null,
        SKU: sku || null,
        weight: weight ? parseInt(weight) : null,
        options: [
          { name: "Size", value: size },
          { name: "Color", value: color },
        ],
        createdAt: serverTimestamp(),
      });

      Alert.alert("✅ Success", "Product saved successfully!");
      setImages([]);
      setUploadedUrls(urls);
      navigation.navigate("MainScreen");
    } catch (err) {
      console.error("Error saving product:", err);
      Alert.alert("❌ Error", "Could not save product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
              <View style={styles.formCard}>
                <Text style={styles.header}>Add New Product</Text>

                <TextInput placeholder="Title *" placeholderTextColor="#C0C0C0" style={styles.input} value={title} onChangeText={setTitle} />
                <TextInput placeholder="Subtitle" placeholderTextColor="#C0C0C0" style={styles.input} value={subtitle} onChangeText={setSubtitle} />
                <TextInput placeholder="Ribbon" placeholderTextColor="#C0C0C0" style={styles.input} value={ribbon} onChangeText={setRibbon} />
                <TextInput placeholder="Description" placeholderTextColor="#C0C0C0" style={[styles.input, { height: 80 }]} value={description} onChangeText={setDescription} multiline />
                <TextInput placeholder="Price *" placeholderTextColor="#C0C0C0" style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} />
                <TextInput placeholder="Discount Price" placeholderTextColor="#C0C0C0" style={styles.input} keyboardType="numeric" value={discountPrice} onChangeText={setDiscountPrice} />
                <TextInput placeholder="SKU" placeholderTextColor="#C0C0C0" style={styles.input} value={sku} onChangeText={setSku} />
                <TextInput placeholder="Weight (gms)" placeholderTextColor="#C0C0C0" style={styles.input} keyboardType="numeric" value={weight} onChangeText={setWeight} />

                <Text style={styles.label}>Size</Text>
                <Picker selectedValue={size} onValueChange={(val) => setSize(val)} style={styles.picker}>
                  <Picker.Item label="Small" value="S" color="#000" />
                  <Picker.Item label="Medium" value="M" color="#000" />
                  <Picker.Item label="Large" value="L" color="#000" />
                </Picker>

                <Text style={styles.label}>Color</Text>
                <Picker selectedValue={color} onValueChange={(val) => setColor(val)} style={styles.picker}>
                  <Picker.Item label="Red" value="Red" color="#000" />
                  <Picker.Item label="Blue" value="Blue" color="#000" />
                  <Picker.Item label="Black" value="Black" color="#000" />
                </Picker>

                <ScrollView horizontal>
                  {images.map((img, index) => (
                    <View key={index} style={{ alignItems: "center", marginRight: 10 }}>
                      <Image source={{ uri: img }} style={styles.previewImage} />
                      {uploadProgress[index] ? (
                        <Text style={{ fontSize: 12, marginTop: 4 }}>
                          {uploadProgress[index]}%
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity style={styles.uploadBtn} onPress={handleImagePick}>
                  <Text style={styles.uploadText}>+ Upload Images</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 40, marginBottom: 100 }}>
                  <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={{ color: "black" }}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveProduct} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Product</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eee", padding: 5 },
  formCard: { backgroundColor: "#fff", padding: 15, borderRadius: 10, elevation: 3 },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, marginBottom: 15, backgroundColor: "#f9f9f9" },
  label: { marginBottom: 5, fontWeight: "bold", color: "#333" },
  picker: { backgroundColor: "#f9f9f9", marginBottom: 15 },
  uploadBtn: { borderWidth: 1, borderColor: "#aaa", borderRadius: 10, padding: 12, alignItems: "center", backgroundColor: "#f1f1f1" },
  uploadText: { color: "#333" },
  previewImage: { width: 80, height: 80, marginRight: 10, borderRadius: 10, marginBottom: 10 },
  saveBtn: { backgroundColor: "#000", padding: 17, borderTopRightRadius: 35, borderBottomRightRadius: 35, alignItems: "center", width: "50%" },
  saveText: { color: "#fff", fontWeight: "bold" },
  backBtn: { backgroundColor: "#eee", padding: 17, borderTopLeftRadius: 35, borderBottomLeftRadius: 35, alignItems: "center", width: "50%" },
});
