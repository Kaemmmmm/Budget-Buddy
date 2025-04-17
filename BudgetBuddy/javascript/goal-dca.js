// dca.js
import { db, setDoc, doc } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

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
    const submitButton = document.querySelector(".submit-button");
    const investmentAmountInput = document.getElementById("investment-amount");
    if (investmentAmountInput) attachCommaFormatting(investmentAmountInput);

    if (!submitButton) {
        console.error("Error: Submit button not found.");
        return;
    }

    submitButton.addEventListener("click", () => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userId = user.uid;
                const investmentAmount = investmentAmountInput.value.replace(/,/g, '');
                const investmentDate = document.getElementById("investment-date").value;
                const investmentDuration = document.getElementById("investment-duration").value;

                if (!investmentAmount || !investmentDate || !investmentDuration) {
                    alert("กรุณากรอกข้อมูลให้ครบทุกช่องก่อนดำเนินการต่อ");
                    return;
                }

                try {
                    await setDoc(doc(db, "goal", userId), {
                        dca: {
                            monthlyInvestment: investmentAmount,
                            investmentDate: investmentDate,
                            investmentDuration: investmentDuration,
                        },
                        timestamp: new Date(),
                    }, { merge: true });

                    console.log("DCA investment data saved successfully!");
                    window.location.href = "../html/in-ex.html";
                } catch (error) {
                    console.error("Error saving DCA data:", error);
                    alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
                }
            } else {
                console.log("User not authenticated!");
                alert("กรุณาเข้าสู่ระบบก่อนดำเนินการต่อ");
            }
        });
    });
});

// DCA Info Modal Logic
const dcaInfoModal = document.getElementById("dca-info-modal");
const dcaInfoBtn = document.getElementById("dca-info-button");
const dcaInfoClose = document.getElementById("dca-info-close");

dcaInfoBtn.addEventListener("click", () => {
  dcaInfoModal.style.display = "flex";
});

dcaInfoClose.addEventListener("click", () => {
  dcaInfoModal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === dcaInfoModal) {
    dcaInfoModal.style.display = "none";
  }
});