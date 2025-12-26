import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard
} from "react-native";
import { forgotPassword } from "../authentication/authService";

const ForgotPassScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Auto-redirect after success
  useEffect(() => {
    let timer;
    if (message) {
      timer = setTimeout(() => {
        navigation.replace('Login');
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [message, navigation]);

  const handleReset = async () => {
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await forgotPassword(email);
      setMessage("Check your inbox! A password reset link has been sent.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <Image
          source={require("../assets/images/knklogo.png")}
          style={styles.headerImage}
          resizeMode="contain"
        />

        <Text style={styles.title}>
          Let's Reset Your <Text style={styles.subtitle}>Account</Text> Password
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#C0C0C0"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {message && <Text style={styles.success}>{message} Redirecting...</Text>}

        <TouchableOpacity
          style={[styles.loginButton, loading && { backgroundColor: "#444" }]}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default ForgotPassScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff", justifyContent: "center" },
  headerImage: { width: "80%", height: 180, marginBottom: 100, alignSelf: "center" },
  title: { fontSize: 22, textAlign: "center", fontWeight: "600", marginBottom: 20 },
  subtitle: { fontSize: 22, color: "#f28a8d", fontWeight: "600" },
  input: {
    borderWidth: 1, borderColor: "#ccc", borderRadius: 10,
    padding: 12, marginTop: 20, fontSize: 16,
  },
  loginButton: {
    backgroundColor: "#000", padding: 15, borderRadius: 10, marginTop: 25, alignItems: "center"
  },
  loginButtonText: { color: "#fff", textAlign: "center", fontSize: 16, fontWeight: "600" },
  backLink: { color: "#f28a8d", fontWeight: "600", textAlign: "right", marginTop: 25 },
  error: { color: "red", marginTop: 10, textAlign: "center" },
  success: { color: "green", marginTop: 10, textAlign: "center" },
});
