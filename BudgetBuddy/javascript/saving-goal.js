// saving-goal.js
import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();

function formatNumberWithCommas(value) {
    const numericValue = value.replace(/,/g, '');
    if (isNaN(numericValue)) return '';
    return parseFloat(numericValue).toLocaleString('en-US');
}

function attachCommaFormatting(input) {
    input.addEventListener('input', () => {
        const original = input.value.replace(/,/g, '');
        const formatted = formatNumberWithCommas(original);
        input.value = formatted;
        input.setSelectionRange(formatted.length, formatted.length);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const savingAmountField = document.getElementById("savingAmount");
    const savingDurationField = document.getElementById("savingDuration");
    const saveBtn = document.getElementById("save-savings");

    if (savingAmountField) attachCommaFormatting(savingAmountField);

    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            if (!savingAmountField || !savingDurationField) {
                console.error("❌ Input fields not found!");
                alert("เกิดข้อผิดพลาด: ไม่พบฟอร์มกรอกข้อมูล");
                return;
            }

            const savingAmount = parseFloat(savingAmountField.value.replace(/,/g, '')) || 0;
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
                    window.location.href = "in-ex.html";
                } catch (error) {
                    console.error("❌ Error saving data:", error);
                    alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
                }
            });
        });
    }

    const savingInfoBtn = document.getElementById("saving-info-button");
    const savingInfoModal = document.getElementById("saving-info-modal");
    const savingInfoClose = document.getElementById("saving-info-close");

    if (savingInfoBtn && savingInfoModal && savingInfoClose) {
        savingInfoBtn.addEventListener("click", () => {
          savingInfoModal.style.display = "flex";
        });

        savingInfoClose.addEventListener("click", () => {
          savingInfoModal.style.display = "none";
        });

        window.addEventListener("click", (e) => {
          if (e.target === savingInfoModal) {
            savingInfoModal.style.display = "none";
          }
        });
    }
});
