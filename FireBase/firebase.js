import { initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, GoogleAuthProvider, inMemoryPersistence, signInWithCredential } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const firebaseConfig = {
  apiKey: "AIzaSyD-N5fgJ2-ZoZN85wdp4v53xdJ-8jMHHcw",
  authDomain: "gymbroschedule-2.firebaseapp.com",
  projectId: "gymbroschedule-2",
  storageBucket: "gymbroschedule-2.firebasestorage.app",
  messagingSenderId: "598610094756",
  appId: "1:598610094756:web:3433bafab3c200a853d431",
  measurementId: "G-B5CW0ZXW1B"
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

const GOOGLE_WEB_CLIENT_ID = 'PASTE_YOUR_WEB_CLIENT_ID_HERE';
const isGoogleConfigured = GOOGLE_WEB_CLIENT_ID && !GOOGLE_WEB_CLIENT_ID.includes('PASTE_YOUR_WEB_CLIENT_ID_HERE');

if (isGoogleConfigured) {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['email', 'profile'],
  });
}

let auth;

try {
  auth = initializeAuth(app, {
    persistence: [inMemoryPersistence],
  });
} catch (error) {
  auth = getAuth(app);
}

// Firebase services
export { auth };
export const db = getFirestore(app);

export const signInWithGoogle = async () => {
  if (!isGoogleConfigured) {
    const error = new Error('Add your Google Web client ID in FireBase/firebase.js.');
    error.code = 'auth/missing-google-web-client-id';
    throw error;
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();

  if (response?.type !== 'success') {
    const error = new Error('Google sign-in was cancelled.');
    error.code = 'auth/cancelled';
    throw error;
  }

  const idToken = response?.data?.idToken;

  if (!idToken) {
    const error = new Error('Google sign-in did not return an idToken. Check the web client ID.');
    error.code = 'auth/missing-id-token';
    throw error;
  }

  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
};