// Import necessary functions from firebase.js
import { auth, createUserWithEmailAndPassword, db, doc, setDoc } from './firebase.js';

// Function to handle user signup
async function handleSignup(event) {
    event.preventDefault(); // Prevent form from reloading

    // Retrieve input values
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validate password match
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    try {
        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Store additional user information in Firestore
        await setDoc(doc(db, "users", user.uid), {
            firstName,
            lastName,
            phone,
            email,
            createdAt: new Date()
        });

        alert('Signup successful!');
        window.location.href = '../html/login.html'; // Redirect to login
    } catch (error) {
        console.error('Signup Error:', error);
        alert('Error: ' + error.message);
    }
}

// Attach event listener after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    } else {
        console.error("Signup form not found in DOM!");
    }
});
