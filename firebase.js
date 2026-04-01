// ============================================================
// firebase.js — Configuração e inicialização do Firebase
// Projeto: Mikami Sushi
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyA2NZjr6ACdBhTE8yqy2LJpqituUnHChb4",
  authDomain:        "mikami-sushi.firebaseapp.com",
  projectId:         "mikami-sushi",
  storageBucket:     "mikami-sushi.firebasestorage.app",
  messagingSenderId: "1008214343375",
  appId:             "1:1008214343375:web:bbb7cdd7cbc7aa393641ba"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

export {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  increment
};
