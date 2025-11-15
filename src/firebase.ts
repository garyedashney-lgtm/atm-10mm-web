// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA6wJ7xyiGO03xGTY7YruW7wQSr-R-Xq2g",
  authDomain: "mm-app-df86a.firebaseapp.com",
  projectId: "mm-app-df86a",
  storageBucket: "mm-app-df86a.firebasestorage.app",
  messagingSenderId: "848650492391",
  appId: "1:848650492391:web:1e6476bcce3b9cf01a0542",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;