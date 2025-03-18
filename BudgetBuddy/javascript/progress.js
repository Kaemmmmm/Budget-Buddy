import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.error("User not authenticated.");
            return;
        }

        const userId = user.uid;
        const userDoc = doc(db, "goal", userId);

        try {
            const docSnap = await getDoc(userDoc);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const goal = data.goal || "No Goal";

                // Redirect based on goal
                if (goal === "DCA") {
                    window.location.href = "dca-progress.html";
                } else if (goal === "Installment Trial") {
                    window.location.href = "install-progress.html";
                } else if (goal === "DCA & Installment Trial") {
                    window.location.href = "dca-install-progress.html";
                } else if (goal === "Saving") {
                    window.location.href = "saving-progress.html";
                } else if (goal === "No Goal") {
                    console.warn("คุณยังไม่ได้ตั้งเป้าหมาย", goal);
                    alert("คุณยังไม่ได้ตั้งเป้าหมาย");
                    window.location.href = "dashboardsav(before).html";
                } else {
                    console.warn("Unknown goal:", goal);
                    document.body.innerHTML = "<h2>ไม่พบข้อมูลเป้าหมาย</h2>";
                }
            } else {
                console.error("No data found for user.");
                document.body.innerHTML = "<h2>ไม่พบข้อมูลเป้าหมาย</h2>";
            }
        } catch (error) {
            console.error("Error fetching financial data:", error);
            document.body.innerHTML = "<h2>เกิดข้อผิดพลาดในการโหลดข้อมูล</h2>";
        }
    });
});
