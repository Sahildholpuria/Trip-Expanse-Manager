import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  EmailAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "settel-now",
  appId: "1:853045893831:web:98d1976c787d1f5acdbce2",
  storageBucket: "settel-now.firebasestorage.app",
  apiKey: "AIzaSyBh1KKZ2N2q0oQajDu9cGbIbhBYUp15aO0",
  authDomain: "settel-now.firebaseapp.com",
  messagingSenderId: "853045893831"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Auth Providers
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut
};
