import { loginUser, db, doc, getDoc } from './firebase.js';

async function handleLogin(event) {
    event.preventDefault(); // Prevent form submission from reloading the page

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    console.log("Attempting login with:", email, password); // Debugging log

    try {
        const user = await loginUser(email, password);

        if (user) {
            console.log("User authenticated:", user);

            // Reference to user's document in Firestore
            const userDocRef = doc(db, "goal", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data(); // Get user data
                
                // Check if "goal" field exists and is not empty
                if (userData.goal && Object.keys(userData.goal).length > 0) {
                    console.log("Goal exists, redirecting to dashboardsav(before).html");
                    window.location.href = '../html/dashboardsav(before).html'; // Redirect if goal exists
                } else {
                    console.log("No goal found, redirecting to start.html");
                    window.location.href = '../html/start.html'; // Redirect if no goal
                }
            } else {
                console.log("No user document found, redirecting to start.html");
                window.location.href = '../html/start.html'; // Redirect if no document
            }
        } else {
            console.warn("No user returned from Firebase.");
            alert("Authentication failed. Please check your credentials.");
        }
    } catch (error) {
        console.error("Firebase Authentication Error:", error.code, error.message);

        if (error.code === "auth/user-not-found") {
            alert("User not found. Please check your email.");
        } else if (error.code === "auth/wrong-password") {
            alert("Incorrect password. Please try again.");
        } else {
            alert("Login failed: " + error.message);
        }
    }
}

// Ensure the form event listener is properly attached
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.error("Login form not found in DOM!");
    }
});
