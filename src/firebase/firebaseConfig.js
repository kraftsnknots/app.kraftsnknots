// firebaseConfig.js
import { initializeApp, getApps, getApp } from "@react-native-firebase/app";
import { getAuth, onAuthStateChanged as authStateChanged } from "@react-native-firebase/auth";
import { getFirestore } from "@react-native-firebase/firestore";
import { getStorage } from "@react-native-firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase credentials
const firebaseConfig = {
  apiKey: "AIzaSyCAG9rGNmG_IK0Pgmr0Yhop4zL83Q_32Mo",
  authDomain: "kraftsnknots-921a0.firebaseapp.com",
  projectId: "kraftsnknots-921a0",
  storageBucket: "kraftsnknots-921a0.firebasestorage.app",
  messagingSenderId: "566392222908",
  appId: "1:566392222908:web:9232182df7666eed3f4cb9",
  measurementId: "G-ZD2BFRMN24"
};

// Initialize Firebase app
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

// Auth persistence with AsyncStorage
const authPersistence = () => {
    return authStateChanged(auth, async (user) => {
        if (user) {
            await AsyncStorage.setItem('user', JSON.stringify(user));
        } else {
            await AsyncStorage.removeItem('user');
        }
    });
};

// Export modular Firebase services
export { app, auth, firestore, storage, authPersistence };
