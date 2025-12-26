import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard
} from "react-native";
import { logIn, resendVerification } from "../authentication/authService";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      await logIn(email, password);
      navigation.replace("BottomNavigation", { screen: "Account" });
    } catch (err) {
      if (err.code === "EMAIL_NOT_VERIFIED") {
        Alert.alert(
          "Email Not Verified",
          "Please verify your email before logging in.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Resend Email",
              onPress: async () => {
                try {
                  const success = await resendVerification();
                  if (success) {
                    Alert.alert("Verification Sent", "Check your inbox again.");
                  } else {
                    Alert.alert("Error", "Unable to resend verification email.");
                  }
                } catch (resendErr) {
                  Alert.alert("Error", resendErr.message);
                }
              },
            },
          ]
        );
      } else if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        Alert.alert("Login Failed", "Invalid email or password.");
      } else {
        Alert.alert("Login Failed", "Invalid email or password.");
      }
    }
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <Image
            source={require("../assets/images/knklogo.png")}
            style={styles.headerImage}
            resizeMode="contain"
          />

          <Text style={styles.title}>
            Login to Access Your <Text style={styles.subtitle}>Account</Text>
          </Text>

          <TextInput
            placeholder="Enter your email"
            placeholderTextColor="#C0C0C0"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
          />
          <TextInput
            placeholder="Enter your password"
            placeholderTextColor="#C0C0C0"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          <View style={styles.optionsRow}>
            <TouchableOpacity onPress={() => navigation.navigate("ForgotPass")}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          {/* <Text style={styles.orText}>or login with</Text>

      <View style={styles.socialButtons}>
        <TouchableOpacity style={styles.googleButton}>
          <Text style={styles.socialText}>Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.facebookButton}>
          <Text style={styles.socialText}>Facebook</Text>
        </TouchableOpacity>
      </View> */}

          <TouchableOpacity
            style={styles.signupTextContainer}
            onPress={() => navigation.navigate("Signup")}
          >
            <Text style={styles.signupText}>
              Don't have an account?{" "}
              <Text style={styles.signupLink}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff", justifyContent: "center" },
  headerImage: { width: "100%", height: 230, marginBottom: 100, alignSelf: "center" },
  title: { fontSize: 22, textAlign: "center", fontWeight: "600", marginBottom: 20 },
  subtitle: { fontSize: 22, color: "#f28a8d", fontWeight: "600" },
  input: {
    borderWidth: 1, borderColor: "#ccc", borderRadius: 10,
    padding: 12, marginBottom: 12, fontSize: 16, color: '#000'
  },
  optionsRow: {
    flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginBottom: 15,
  },
  forgotText: { color: "#f28a8d" },
  loginButton: {
    backgroundColor: "#000", padding: 15, borderRadius: 10, marginBottom: 15,
  },
  loginButtonText: { color: "#fff", textAlign: "center", fontSize: 16, fontWeight: "600" },
  orText: { textAlign: "center", marginVertical: 10, color: "#999" },
  socialButtons: { flexDirection: "row", justifyContent: "space-evenly", marginBottom: 20 },
  googleButton: {
    backgroundColor: "#fff", borderColor: "#ccc", borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10,
  },
  facebookButton: {
    backgroundColor: "#fff", borderColor: "#ccc", borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10,
  },
  socialText: { color: "#000", fontWeight: "500" },
  signupTextContainer: { padding: 10 },
  signupText: { textAlign: "center", color: "#999" },
  signupLink: { color: "#f28a8d", fontWeight: "600" },
});
