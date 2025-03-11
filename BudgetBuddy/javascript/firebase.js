// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import {getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, confirmPasswordReset } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzweQFQb-y7vXMzHfHEhCfcYz2t05frQM",
  authDomain: "budgetbuddy-cac4f.firebaseapp.com",
  projectId: "budgetbuddy-cac4f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function loginUser(email, password) {
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("User signed in:", userCredential.user);
        })
        .catch((error) => {
            console.error("Login error:", error.message);
        });
}

// **Forgot Password: Send Reset Email**
function sendResetEmail(email) {
    return sendPasswordResetEmail(auth, email)
        .then(() => {
            alert("Password reset link sent! Check your email.");
        })
        .catch((error) => {
            console.error("Error:", error);
            alert("Error: " + error.message);
        });
}


// **Confirm Password Reset**
function resetUserPassword(oobCode, newPassword) {
    return confirmPasswordReset(auth, oobCode, newPassword);
}

export { app, db, auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, doc, setDoc, sendResetEmail, resetUserPassword  };
