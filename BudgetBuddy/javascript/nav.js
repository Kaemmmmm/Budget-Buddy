import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (user) {
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
// Sidebar JavaScript functionality
// Sidebar functionality
document.addEventListener('DOMContentLoaded', function() {
  // Handle submenu toggles
  const submenuToggle = document.querySelectorAll('.toggle-submenu');
  
  submenuToggle.forEach(function(toggle) {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Toggle the rotate class for the dropdown arrow
      this.classList.toggle('rotate');
      
      // Find the submenu
      const parent = this.parentElement;
      if (parent.classList.contains('has-submenu')) {
        const submenu = parent.querySelector('.submenu');
        submenu.classList.toggle('active');
      }
    });
  });
  
  // User dropdown functionality
  const userDropdown = document.querySelector('.user-dropdown');
  if (userDropdown) {
    userDropdown.addEventListener('click', function() {
      this.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
      if (!userDropdown.contains(event.target)) {
        userDropdown.classList.remove('active');
      }
    });
  }
  
  // Load user name from localStorage (if available)
  const userName = document.querySelector('.user-name');
  if (userName) {
    const storedName = localStorage.getItem('userName');
    if (storedName) {
      userName.textContent = storedName;
    }
  }
  
  // Sign out functionality
  const signOutBtn = document.getElementById('sign-out-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', function() {
      // Clear user data from localStorage
      localStorage.removeItem('userName');
      localStorage.removeItem('userToken');
      
      // Redirect to login page
      window.location.href = 'login.html';
    });
  }
  
  // Highlight active menu item based on current URL
  const currentPage = window.location.pathname.split('/').pop();
  const menuLinks = document.querySelectorAll('.menu a');
  
  menuLinks.forEach(function(link) {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
      
      // If it's in a submenu, open the parent menu
      const submenuParent = link.closest('.submenu');
      if (submenuParent) {
        submenuParent.classList.add('active');
        const parentToggle = submenuParent.parentElement.querySelector('.toggle-submenu');
        if (parentToggle) {
          parentToggle.classList.add('rotate');
        }
      }
    }
  });
});