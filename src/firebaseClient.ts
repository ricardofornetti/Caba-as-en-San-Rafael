import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  User,
  onAuthStateChanged
} from "firebase/auth";

// Expose Client-Side Firebase Configuration
const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID,
};

// Check if variables are configured
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app;
let auth: any = null;
const googleProvider = new GoogleAuthProvider();

// Configurar prompt select_account para permitir elegir la cuenta siempre
googleProvider.setCustomParameters({
  prompt: "select_account"
});

if (isFirebaseConfigured) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    }
    auth = getAuth();
  } catch (error) {
    console.error("Error al inicializar Firebase Client SDK:", error);
  }
} else {
  console.warn("Firebase Client SDK: Las credenciales (VITE_FIREBASE_*) no están configuradas.");
}

export { auth, googleProvider, isFirebaseConfigured, signInWithPopup, signOut, onAuthStateChanged };
export type { User };
