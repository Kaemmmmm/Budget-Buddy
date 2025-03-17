import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();

document.addEventListener("DOMContentLoaded", () => {
    

    document.getElementById("save-savings").addEventListener("click", async () => {
        

        // 🔹 Ensure elements exist before accessing .value
        const savingAmountField = document.getElementById("savingAmount");
        const savingDurationField = document.getElementById("savingDuration");

        if (!savingAmountField || !savingDurationField) {
            console.error("❌ Input fields not found!");
            alert("เกิดข้อผิดพลาด: ไม่พบฟอร์มกรอกข้อมูล");
            return;
        }

        const savingAmount = parseFloat(savingAmountField.value) || 0;
        const savingDuration = parseFloat(savingDurationField.value) || 0;

        if (savingAmount <= 0 || savingDuration <= 0) {
            alert("กรุณากรอกข้อมูลให้ถูกต้อง");
            console.warn("⚠️ Invalid input: savingAmount or savingDuration is 0 or less");
            return;
        }

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                alert("กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล");
                console.error("❌ User is not authenticated");
                return;
            }

            const userId = user.uid;

            try {
                console.log("📤 Saving data to Firebase...");
                await setDoc(doc(db, "goal", userId), {
                    savings:{
                    savingAmount,
                    savingDuration,
                },
                timestamp: new Date(),
                }, { merge: true });

                console.log("✅ Data saved successfully!");
                alert("บันทึกข้อมูลเรียบร้อย!");
                window.location.href = "saving.html"; // Redirect after saving
            } catch (error) {
                console.error("❌ Error saving data:", error);
                alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            }
        });
    });
});
