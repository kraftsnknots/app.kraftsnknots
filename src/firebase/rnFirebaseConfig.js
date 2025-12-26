// rnfirebaseConfig.js
import { getApp, initializeApp } from "@react-native-firebase/app";
import { getFirestore } from "@react-native-firebase/firestore";

// Ensure Firebase is initialized only once
let app;
try {
  app = getApp();
} catch (err) {
  app = initializeApp();
}

const db = getFirestore(app);

export { db };
