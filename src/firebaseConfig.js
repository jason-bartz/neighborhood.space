// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyCL7wTtcIlMmAm8JQB2p4z9wVaCUrm5w1Q",
  authDomain: "www.goodneighbor.fund",
  projectId: "gnf-app-9d7e3",
  storageBucket: "gnf-app-9d7e3.firebasestorage.app",
  messagingSenderId: "431730670558",
  appId: "1:431730670558:web:12c980966bfe5dfb9c7b4f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { app, db, auth, storage, functions };
