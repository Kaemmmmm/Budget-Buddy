// saving.js
import { db, setDoc, doc } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const auth = getAuth();

document.addEventListener("DOMContentLoaded", () => {
    const submitButton = document.querySelector(".submit-button");

    if (!submitButton) {
        console.error("Error: Submit button not found.");
        return;
    }

    submitButton.addEventListener("click", () => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userId = user.uid;
                const income = document.getElementById("income").value;
                const expense = document.getElementById("expense").value;
                const debt = document.getElementById("debt").value;

                // Debugging: Check user inputs
                console.log("User ID:", userId);
                console.log("Income:", income);
                console.log("Expense:", expense);
                console.log("Debt:", debt);

                if (!income || !expense || !debt) {
                    alert("กรุณากรอกข้อมูลให้ครบทุกช่องก่อนดำเนินการต่อ");
                    console.error("Error: Some fields are missing.");
                    return;
                }

                try {
                    await setDoc(doc(db, "goal", userId), {
                        income: parseFloat(income),
                        expense: parseFloat(expense),
                        debt: parseFloat(debt),
                        timestamp: new Date(),
                    }, { merge: true });

                    console.log("✅ Financial data saved successfully!");

                    // Redirect after saving data
                    window.location.href = "../html/dashboardsav(before).html";
                } catch (error) {
                    console.error("❌ Error saving financial data:", error);
                    alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
                }
            } else {
                console.log("❌ User not authenticated!");
                alert("กรุณาเข้าสู่ระบบก่อนดำเนินการต่อ");
            }
        });
    });
});
