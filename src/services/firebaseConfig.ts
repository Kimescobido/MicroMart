// src/services/firebaseConfig.ts
// src/services/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDbNY1rfuNyKBgKcIcdCCBPQa89EvH98FU",
  authDomain: "micromart-1f8ec.firebaseapp.com",
  projectId: "micromart-1f8ec",
  storageBucket: "micromart-1f8ec.firebasestorage.app",
  messagingSenderId: "269876208282",
  appId: "1:269876208282:web:17de03790087bb34b17523",
  measurementId: "G-HS9EV4SFKM"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Auth with React Native AsyncStorage to keep users logged in
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore database
export const db = getFirestore(app);
export const storage = getStorage(app);
