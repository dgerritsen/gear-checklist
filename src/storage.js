import { auth, db } from "./firebase";
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";

const STORAGE_KEY = "gear-checklist-data";
const API_KEY_STORAGE_KEY = "gear-checklist-api-key";

// ─── localStorage ──────────────────────────────────────────────

export async function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveLocal(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Storage save failed:", e);
  }
}

export function loadLocalApiKey() {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || "";
}

export function saveLocalApiKey(key) {
  if (key && key.trim()) localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
  else localStorage.removeItem(API_KEY_STORAGE_KEY);
}

// ─── Firestore ─────────────────────────────────────────────────

function checklistDoc(uid) {
  return doc(db, "users", uid, "data", "checklist");
}

function settingsDoc(uid) {
  return doc(db, "users", uid, "data", "settings");
}

export function subscribeRemote(uid, onChange) {
  return onSnapshot(
    checklistDoc(uid),
    (snap) => {
      if (snap.exists()) onChange(snap.data());
      else onChange(null);
    },
    (err) => console.error("Firestore snapshot error:", err)
  );
}

export async function saveRemote(uid, data) {
  try {
    await setDoc(checklistDoc(uid), { ...data, updatedAt: Date.now() });
  } catch (e) {
    console.error("Firestore save failed:", e);
    throw e;
  }
}

export async function loadSettings(uid) {
  try {
    const snap = await getDoc(settingsDoc(uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("Firestore settings load failed:", e);
    return null;
  }
}

export async function saveSettings(uid, settings) {
  try {
    await setDoc(settingsDoc(uid), settings);
  } catch (e) {
    console.error("Firestore settings save failed:", e);
  }
}

// ─── Auth ──────────────────────────────────────────────────────

export function subscribeAuth(callback) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback({
        uid: user.uid,
        isAnonymous: user.isAnonymous,
        email: user.email,
      });
    } else {
      callback(null);
    }
  });
}

export async function signInAnon() {
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}

export async function signInEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user.uid;
}

export async function registerEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user.uid;
}

export async function linkEmail(email, password) {
  const credential = EmailAuthProvider.credential(email, password);
  await linkWithCredential(auth.currentUser, credential);
}

export async function signOut() {
  await firebaseSignOut(auth);
}
