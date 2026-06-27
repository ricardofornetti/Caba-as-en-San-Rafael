import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

export function ensureInitialized() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error("FATAL ERROR: Missing Firebase Admin environment variables.");
      process.exit(1);
    }

    const rawKey = process.env.FIREBASE_PRIVATE_KEY || "";
    const formattedPrivateKey = rawKey
      .replace(/\\\\n/g, "\n")  // caso: doble escape \\n
      .replace(/\\n/g, "\n")    // caso: escape simple \n
      .replace(/\n/g, "\n");    // caso: ya tiene saltos reales (no-op)

    console.log("Private key starts:", formattedPrivateKey.slice(0, 40));
    console.log("Private key ends:", formattedPrivateKey.slice(-30));
    console.log("Has real newlines:", formattedPrivateKey.includes("\n"));

    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      });
    } catch (err: any) {
      console.error("Error initializing Firebase Admin SDK:", err);
      process.exit(1);
    }
  }
}

// Proxies to lazily initialize only on first access
export const db = new Proxy({} as any, {
  get(target, prop, receiver) {
    ensureInitialized();
    const firestore = getFirestore();
    const value = Reflect.get(firestore, prop);
    if (typeof value === "function") {
      return value.bind(firestore);
    }
    return value;
  }
}) as Firestore;

export const auth = new Proxy({} as any, {
  get(target, prop, receiver) {
    ensureInitialized();
    const authService = getAuth();
    const value = Reflect.get(authService, prop);
    if (typeof value === "function") {
      return value.bind(authService);
    }
    return value;
  }
}) as Auth;

export default {
  firestore: () => db,
  auth: () => auth,
};
