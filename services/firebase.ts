import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDP-b6VHq9bzFa0iHfe3Ed-5ONtQ5MkjFY",
  authDomain: "controle-de-gastos-e2287.firebaseapp.com",
  projectId: "controle-de-gastos-e2287",
  storageBucket: "controle-de-gastos-e2287.firebasestorage.app",
  messagingSenderId: "1053104962161",
  appId: "1:1053104962161:web:e8a2782ec3243c2231f9d0",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
