import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

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
  
  // Initialize App Check if site key is provided
  if (typeof window !== 'undefined') {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (siteKey) {
      try {
        // Enable debug token for AI Studio, localhost, and the user's explicit Vercel domains
        const hostname = window.location.hostname;
        if (
          hostname === 'localhost' || 
          hostname.includes('run.app') || 
          hostname.includes('shofibirbid.site') || 
          hostname.includes('vercel.app')
        ) {
          (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
          console.log("AppCheck Debug Mode Enabled for hostname:", hostname);
        }

        initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
        console.log("Firebase App Check with reCAPTCHA Enterprise initialized successfully.");
      } catch (appCheckError) {
        console.warn("App Check initialization failed:", appCheckError);
      }
    }
  }

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

