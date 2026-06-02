import 'react-native-get-random-values';
import { getApps, initializeApp, getApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  signInWithCredential,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const firebaseConfig = {
  apiKey: "AIzaSyD-N5fgJ2-ZoZN85wdp4v53xdJ-8jMHHcw",
  authDomain: "gymbroschedule-2.firebaseapp.com",
  projectId: "gymbroschedule-2",
  storageBucket: "gymbroschedule-2.firebasestorage.app",
  messagingSenderId: "598610094756",
  appId: "1:598610094756:web:3433bafab3c200a853d431",
  measurementId: "G-B5CW0ZXW1B",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const persistence = getReactNativePersistence(AsyncStorage);
const auth = initializeAuth(app, { persistence });
const db = getFirestore(app);

GoogleSignin.configure({
  webClientId: '598610094756-0r0vqpubcrv5s5kvnpgj9phit8e4c1dd.apps.googleusercontent.com',
  scopes: ['email', 'profile'],
});

export { auth, db };
export const getDb = () => db;

export const signInWithGoogle = async () => {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();

  if (response?.type !== 'success') {
    const error = new Error('Google sign-in was cancelled.');
    error.code = 'auth/cancelled';
    throw error;
  }

  const idToken = response?.idToken ?? response?.data?.idToken;
  if (!idToken) {
    const error = new Error('Google sign-in did not return an idToken.');
    error.code = 'auth/missing-id-token';
    throw error;
  }

  const googleCredential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, googleCredential);
};