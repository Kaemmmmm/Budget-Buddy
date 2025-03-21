import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Logged-in user UID:", user.uid);
    const userRef = doc(db, "users", user.uid);

    try {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const fullName = `${userData.firstName} ${userData.lastName}`;
        const nameSpan = document.querySelector(".user-name");

        if (nameSpan) {
          nameSpan.textContent = fullName;
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  } else {
    console.log("No user is signed in.");
  }
});

// ✅ Toggle Dropdown on Click
document.addEventListener("DOMContentLoaded", () => {
    const userDropdown = document.querySelector(".user-dropdown");
  
    if (userDropdown) {
      userDropdown.addEventListener("click", () => {
        userDropdown.classList.toggle("active"); // ✅ This triggers both menu and arrow rotation
      });
  
      // Close dropdown if clicking outside
      document.addEventListener("click", (event) => {
        if (!userDropdown.contains(event.target)) {
          userDropdown.classList.remove("active");
        }
      });
    }
  
    // Sign Out Logic...
    const signOutBtn = document.getElementById("sign-out-btn");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", async () => {
        try {
          await signOut(auth);
          console.log("User signed out.");
          window.location.href = "login.html"; // Redirect to login page
        } catch (error) {
          console.error("Error signing out:", error);
        }
      });
    }
  });

// Keep your existing submenu code...

document.querySelectorAll('.toggle-submenu').forEach(menu => {
    menu.addEventListener('click', function(e) {
        e.preventDefault();
        
        let submenu = this.nextElementSibling;

        // Toggle submenu visibility
        submenu.classList.toggle('active');

        // Rotate the arrow
        this.classList.toggle('rotate');

        // Close other submenus when one is opened
        document.querySelectorAll('.submenu').forEach(sub => {
            if (sub !== submenu) {
                sub.classList.remove('active');
                sub.previousElementSibling.classList.remove('rotate');
            }
        });
    });
});