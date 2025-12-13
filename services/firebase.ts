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
  } catch (error) {
    console.error("Error signing in", error);
    alert("Failed to sign in. Check console for details.");
  }
};

export const logout = async () => {
  await signOut(auth);
};
