// authService.js
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "@react-native-firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "@react-native-firebase/firestore";
import { getApp } from "@react-native-firebase/app";

// Initialize modular instances
const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * ✅ Signup with Email Verification
 */
export const signUp = async (email, password, name) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = userCredential;

  // Save user profile in Firestore
  await setDoc(doc(db, "users", user.uid), {
    name,
    email,
    createdAt: serverTimestamp(),
    phone: null,
    emailVerified: user.emailVerified,
    photoURL:null, //
  });

  // Send verification email if not verified
  if (!user.emailVerified) {
    await sendEmailVerification(user);
  }

  return user;
};

/**
 * ✅ Login
 */
export const logIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;

    if (!user.emailVerified) {
      const error = new Error("Email not verified");
      error.code = "EMAIL_NOT_VERIFIED";
      throw error;
    }

    return user;
  } catch (err) {
    throw err;
  }
};

/**
 * ✅ Logout
 */
export const logOut = async () => {
  return await signOut(auth);
};

/**
 * ✅ Resend verification email
 */
export const resendVerification = async () => {
  const user = auth.currentUser;

  if (!user) {
    const error = new Error("No logged in user");
    error.code = "NO_USER";
    throw error;
  }

  if (user.emailVerified) {
    return false; // already verified
  }

  await sendEmailVerification(user);
  return true;
};

/**
 * ✅ Forgot password
 */
export const forgotPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (err) {
    throw err;
  }
};
