import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyAyuv5lbljtdjok2DnO7iiD8JsHgfWR2GQ",
  authDomain: "gear-checklist-59eed.firebaseapp.com",
  projectId: "gear-checklist-59eed",
  storageBucket: "gear-checklist-59eed.firebasestorage.app",
  messagingSenderId: "880499099145",
  appId: "1:880499099145:web:17981870a754d708e1dad8"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Firestore persistence unavailable: multiple tabs open");
  } else if (err.code === "unimplemented") {
    console.warn("Firestore persistence unavailable: browser not supported");
  }
});
