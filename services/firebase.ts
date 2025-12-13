import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyArYktDktkUhvHJWFd10L5wu4wAJy_iO4Q",
  authDomain: "cinetracker-d6456.firebaseapp.com",
  projectId: "cinetracker-d6456",
  storageBucket: "cinetracker-d6456.firebasestorage.app",
  messagingSenderId: "699177659824",
  appId: "1:699177659824:web:07cc51c502507902d0ba75",
  measurementId: "G-CSVRLT8YJX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error("Error signing in", error);
    
    // Handle specific error codes for better user guidance
    if (error.code === 'auth/configuration-not-found') {
        alert("Configuration Error: Google Sign-In is not enabled in the Firebase Console.\n\nPlease enable it in Authentication > Sign-in method > Google.");
    } else if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to alert
        return;
    } else if (error.code === 'auth/operation-not-allowed') {
        alert("Operation Error: The Google provider is disabled in Firebase Console.");
    } else {
        alert(`Failed to sign in: ${error.message}`);
    }
  }
};

export const logout = async () => {
  await signOut(auth);
};
