// productservice.js
import { getApp } from '@react-native-firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
} from '@react-native-firebase/firestore';

// initialize Firestore instance
const firestore = getFirestore(getApp());

/**
 * Listen to featured products live
 */
export const listenFeaturedProducts = (callback) => {
  const q = query(
    collection(firestore, 'products'),
    where('ribbon', '==', 'New')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(products);
    },
    (error) => {
      console.error('Firestore listenFeaturedProducts error:', error);
    }
  );
};

export const listenTrendingProducts = (callback) => {
  const q = query(
    collection(firestore, 'products'),
    where('ribbon', '!=', 'New')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(products);
    },
    (error) => {
      console.error('Firestore listenTrendingProducts error:', error);
    }
  );
};
