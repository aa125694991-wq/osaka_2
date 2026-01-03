import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwbjrrng_lBZG5cW3kbQAxJg3r_6QVgFY",
  authDomain: "tryosaka-21ceb.firebaseapp.com",
  databaseURL: "https://tryosaka-21ceb-default-rtdb.firebaseio.com",
  projectId: "tryosaka-21ceb",
  storageBucket: "tryosaka-21ceb.firebasestorage.app",
  messagingSenderId: "403784289230",
  appId: "1:403784289230:web:15c98b579ccf33c46fb99f",
  measurementId: "G-X6PQJNNSSK"
};

// 1. 初始化 Firebase App 實體
const app = initializeApp(firebaseConfig);

// 2. 初始化各項服務並導出
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// 3. 導出 Auth 相關功能函式
export { onAuthStateChanged, signInAnonymously };

export default app;
