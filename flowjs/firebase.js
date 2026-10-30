// Inicialização do Firebase e re-exportação das funções usadas pelo app (uma única versão do SDK em todo o projeto).
//teste
import { firebaseConfig } from './config.js';

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, collection, addDoc, setDoc, deleteDoc, doc, updateDoc, onSnapshot,
    serverTimestamp, query, orderBy, increment, arrayUnion, arrayRemove, writeBatch, getDocs, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ hd: 'leveros.com.br', prompt: 'select_account' });

export {
    signInWithPopup, onAuthStateChanged, signOut,
    collection, addDoc, setDoc, deleteDoc, doc, updateDoc, onSnapshot,
    serverTimestamp, query, orderBy, increment, arrayUnion, arrayRemove, writeBatch, getDocs, where
};
