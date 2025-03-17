// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail, 
    signInWithEmailAndPassword, 
    confirmPasswordReset,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCzweQFQb-y7vXMzHfHEhCfcYz2t05frQM",
    authDomain: "budgetbuddy-cac4f.firebaseapp.com",
    projectId: "budgetbuddy-cac4f",
    storageBucket: "budgetbuddy-cac4f.firebasestorage.app",
    messagingSenderId: "785181671270",
    appId: "1:785181671270:web:f7a9cac1029431dd3752a7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is logged in:", user.uid);
    } else {
        console.log("No user logged in.");
    }
});

// **Login User Function**
function loginUser(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("User signed in:", userCredential.user); // Debugging log
            return userCredential.user; // Return the user
        })
        .catch((error) => {
            console.error("Login error:", error.code, error.message);
            throw error; // Ensure error is caught in auth.js
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

// Export Firebase functions
export { app, db, auth, loginUser, createUserWithEmailAndPassword, sendResetEmail, resetUserPassword, doc, setDoc };

export async function fetchFinancialData(userId) {
    const docRef = doc(db, "users", userId, "financialData", "summary");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      throw new Error("No financial data found");
    }
  }