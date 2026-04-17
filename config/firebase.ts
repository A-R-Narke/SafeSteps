// firebase/config.js

import { getApps, initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";  // ✅ Realtime Database
import AsyncStorage from "@react-native-async-storage/async-storage";

// 🔹 Use environment variables (Expo public env)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL, 
};

// 🔹 Initialize app safely
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// 🔹 Initialize Firebase Auth with AsyncStorage persistence
let auth;
try {
  // Try to initialize with persistence (this will only work if auth hasn't been initialized yet)
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error: any) {
  // If auth is already initialized, get the existing instance
  if (error?.code === "auth/already-initialized") {
    auth = getAuth(app);
  } else {
    // For any other error, try getAuth as fallback
    console.warn("Error initializing auth with persistence, using default:", error);
    auth = getAuth(app);
  }
}

const db = getDatabase(app, process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL);


// 🔹 Export both
export { app, auth, db };
export default app;
