import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  TouchableWithoutFeedback,
  Keyboard
} from "react-native";
import { signUp } from "../authentication/authService";

export default function SignupScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const user = await signUp(email, password, name);

      if (user && !user.emailVerified) {
        Alert.alert(
          "Verify Your Email",
          `A verification link has been sent to ${email}. Please verify before logging in.`
        );

        // ✅ Correct nested navigation to Login screen inside AccountStack
        navigation.navigate("BottomNavigation", {
          screen: "Account",
          params: { screen: "Login" },
        });
      } else {
        navigation.replace("MainScreen");
      }
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
          Create an account to <Text style={styles.highlight}>place orders</Text>
        </Text>

        <TextInput
          placeholder="Enter your name"
          placeholderTextColor="#C0C0C0"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          placeholder="Enter your email"
          placeholderTextColor="#C0C0C0"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          placeholder="Enter your password"
          placeholderTextColor="#C0C0C0"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor="#C0C0C0"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.signupButton, loading && { opacity: 0.6 }]}
          onPress={handleSignup}
          disabled={loading}
        >
          <Text style={styles.signupButtonText}>
            {loading ? "Signing up..." : "Sign Up"}
          </Text>
        </TouchableOpacity>

        {/* <TouchableOpacity onPress={handleResendVerification}>
        <Text style={styles.resendText}>Resend verification email</Text>
      </TouchableOpacity> */}

        <TouchableOpacity
          style={styles.loginTextContainer}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.loginText}>
            Already have an account?
            <Text style={styles.loginLink}> Login </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  headerImage: {
    width: "80%",
    height: 150,
    marginBottom: 40,
    alignSelf: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
    color: "#000",
  },
  highlight: { color: "#f28a8d", fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  signupButton: {
    backgroundColor: "#1c1c35",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 20,
  },
  signupButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "red", marginBottom: 10, textAlign: "center" },
  resendText: {
    color: "#f28a8d",
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "500",
  },
  loginTextContainer: { padding: 10 },
  loginText: { textAlign: "center", color: "#666" },
  loginLink: { color: "#f28a8d", fontWeight: "600" },
});
