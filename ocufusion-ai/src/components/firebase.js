// Firebase core + auth helpers used across the app
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDF9r-uoynd4hpBAZ9ekbIvT02YQGeEBLU",
  authDomain: "vrtryon-demo.firebaseapp.com",
  projectId: "vrtryon-demo",
  storageBucket: "vrtryon-demo.firebasestorage.app",
  messagingSenderId: "153814518203",
  appId: "1:153814518203:web:87b8dc72d87629018d1c9e",
};

// Initialize Firebase and expose the auth instance
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
