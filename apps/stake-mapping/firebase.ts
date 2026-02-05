import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword, signInAnonymously, signOut, onAuthStateChanged, User } from 'firebase/auth';

// --------------------------------------------------------
// CONFIGURAZIONE FIREBASE
// Le credenziali sono caricate da variabili ambiente (.env)
// Vedi .env.example per il template
// --------------------------------------------------------

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// --------------------------------------------------------

// Controllo per verificare se la configurazione è presente.
export const isFirebaseConfigured = () => {
    // Verifica che le variabili ambiente siano configurate
    return Boolean(
        firebaseConfig.apiKey &&
        firebaseConfig.databaseURL &&
        firebaseConfig.apiKey !== 'your_api_key_here'
    );
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);
export const auth = getAuth(app);

// --- Auth Helpers ---

export const loginAdmin = async (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
};

export const loginAnonymous = async () => {
    return signInAnonymously(auth);
};

export const logoutAdmin = async () => {
    return signOut(auth);
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};