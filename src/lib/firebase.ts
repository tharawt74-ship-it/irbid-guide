import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDDswaCceyey9mjAC7ERlkPQ0dIkNsbquw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "irbid-7f4dd.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "irbid-7f4dd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "irbid-7f4dd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "422374274279",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:422374274279:web:2c7854ce7eeb2c7b10de42",
};

// Initialize Firebase safely
let app;
let auth;
let db;
let storage;
let messaging;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  // Check if messaging is supported in the current environment
  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported && app) {
        try {
          messaging = getMessaging(app);
        } catch (e) {
          console.warn("FCM Messaging initialization error:", e);
        }
      }
    }).catch(() => {});
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

export { app, auth, db, storage, messaging };
