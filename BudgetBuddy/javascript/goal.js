// start.js
import { db, setDoc, doc } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const auth = getAuth();
let selectedGoal = null; // Track the selected goal

document.addEventListener("DOMContentLoaded", () => {
    const optionButtons = document.querySelectorAll(".option-button");
    const submitButton = document.querySelector(".submit-button");

    if (optionButtons.length === 0) {
        console.error("Error: No goal buttons found.");
        return;
    }

    optionButtons.forEach((button) => {
        button.addEventListener("click", async () => {
            // Remove 'selected' class from all buttons
            optionButtons.forEach((btn) => btn.classList.remove("selected"));

            // Add 'selected' class to the clicked button
            button.classList.add("selected");

            // Store the selected goal
            selectedGoal = button.dataset.goal;
            console.log("User selected:", selectedGoal); // Debugging log

            // Determine the correct redirect page
            let nextPage = getNextPage(selectedGoal);
            console.log("Redirecting to:", nextPage); // Debugging log

            // Save to Firebase and redirect
            saveGoalAndRedirect(selectedGoal, nextPage);
        });
    });

    // "ถัดไป" button - Saves "No Goal" if nothing was selected
    if (!submitButton) {
        console.error("Error: Submit button not found.");
        return;
    }

    submitButton.addEventListener("click", () => {
        if (!selectedGoal) {
            console.log("No goal selected, saving as 'No Goal'.");
            saveGoalAndRedirect("No Goal", "../html/saving.html");
        } else {
            let nextPage = getNextPage(selectedGoal);
            console.log("Redirecting user to:", nextPage); // Debugging log
            window.location.href = nextPage;
        }
    });
});

// Function to determine the correct next page based on selected goal
function getNextPage(goalValue) {
    switch (goalValue) {
        case "DCA":
            return "../html/dca.html";
        case "Installment Trial":
            return "../html/installment.html";
        case "DCA & Installment Trial":
            return "../html/dca-install.html";
        case "Saving":
            return "../html/saving(goal).html";
        default:
            return "../html/saving.html"; // Default if no selection
    }
}

// Function to save goal and redirect
function saveGoalAndRedirect(goalValue, nextPage) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userId = user.uid;

            try {
                await setDoc(doc(db, "goal", userId), {
                    goal: goalValue,
                    timestamp: new Date(),
                });

                console.log("Goal saved successfully:", goalValue);
            } catch (error) {
                console.error("Error saving goal:", error);
            }

            // Move to the correct next page
            console.log("Redirecting user to:", nextPage); // Debugging log
            window.location.href = nextPage;
        } else {
            console.log("User not authenticated!");
            alert("กรุณาเข้าสู่ระบบก่อนดำเนินการต่อ");
        }
    });
}
