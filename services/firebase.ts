import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
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

// Personal Credentials
const PERSONAL_EMAIL = "abrshethiodj44@gmail.com";
const PERSONAL_PASS = "cineTrack7";

export const signInPersonal = async () => {
  try {
    // Try to sign in first
    await signInWithEmailAndPassword(auth, PERSONAL_EMAIL, PERSONAL_PASS);
  } catch (error: any) {
    // If user doesn't exist or invalid credential (logic varies by SDK version/config)
    // we try to create the account.
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      try {
        await createUserWithEmailAndPassword(auth, PERSONAL_EMAIL, PERSONAL_PASS);
      } catch (createError: any) {
        // This will likely throw 'auth/operation-not-allowed' if the provider is disabled.
        // We throw it up so LoginScreen can catch it and switch to Local Mode.
        throw createError;
      }
    } else {
      // Throw other errors (network, operation-not-allowed, etc)
      throw error;
    }
  }
};

export const signInWithGoogle = async () => {
  await signInWithPopup(auth, googleProvider);
};

export const logout = async () => {
  await signOut(auth);
};
