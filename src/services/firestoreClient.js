// firestoreClient.js (v22+ modular API)

import { getApp } from '@react-native-firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
} from '@react-native-firebase/firestore';

// Get Firestore instance
const app = getApp();
export const db = getFirestore(app);

// Generic helpers
export const getCollection = (name) => collection(db, name);
export const getDocById = (collectionName, id) =>
  getDoc(doc(db, collectionName, id));
