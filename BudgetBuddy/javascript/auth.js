import { loginUser } from './firebase.js';

async function handleLogin(event) {
    event.preventDefault(); // Prevent form submission from reloading the page

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    console.log("Attempting login with:", email, password); // Debugging log

    try {
        const user = await loginUser(email, password);

        if (user) {
            console.log("User authenticated:", user);
            alert(`Welcome, ${user.email}!`);
            window.location.href = '../html/start.html'; // Redirect after successful login
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
