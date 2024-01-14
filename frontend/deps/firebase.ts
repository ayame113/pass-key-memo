// @deno-types="npm:firebase@10.7.1/app"
import {
  initializeApp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// @deno-types="npm:firebase@10.7.1/auth"
import {
  browserLocalPersistence,
  initializeAuth,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// @deno-types="npm:firebase@10.7.1/auth"
export {
  onAuthStateChanged,
  signInWithCustomToken,
  type User,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBc3xyNcO5PPyTdH-Sbh8r0L8d-iVF2C9I",
  authDomain: "pass-key-memo.firebaseapp.com",
  projectId: "pass-key-memo",
  storageBucket: "pass-key-memo.appspot.com",
  messagingSenderId: "928954068838",
  appId: "1:928954068838:web:f2a235ea2d453b2419e2a7",
  measurementId: "G-ZXDFBVTKND",
};

const app = initializeApp(firebaseConfig);

// https://firebase.google.com/docs/auth/web/custom-dependencies?hl=ja
export const auth = initializeAuth(app, {
  persistence: [browserLocalPersistence],
});
