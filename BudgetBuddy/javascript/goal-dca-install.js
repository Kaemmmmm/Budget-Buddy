// dca-install.js
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
    attachCommaFormatting(document.getElementById("monthly-investment"));
    attachCommaFormatting(document.getElementById("installment-amount"));

    if (!submitButton) {
        console.error("Error: Submit button not found.");
        return;
    }

    submitButton.addEventListener("click", (event) => {
        event.preventDefault();

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userId = user.uid;

                const monthlyInvestment = document.getElementById("monthly-investment").value.replace(/,/g, '');
                const investmentDate = document.getElementById("investment-date").value;
                const investmentDuration = document.getElementById("investment-duration").value;

                const assetType = document.getElementById("asset-type").value;
                const installmentDuration = document.getElementById("installment-duration").value;
                const installmentAmount = document.getElementById("installment-amount").value.replace(/,/g, '');

                if (!monthlyInvestment || !investmentDate || !investmentDuration || !assetType || !installmentDuration || !installmentAmount) {
                    alert("กรุณากรอกข้อมูลให้ครบทุกช่องก่อนดำเนินการต่อ");
                    console.error("Error: Some fields are missing.");
                    return;
                }

                try {
                    await setDoc(doc(db, "goal", userId), {
                        dca: {
                            monthlyInvestment: parseFloat(monthlyInvestment),
                            investmentDate: investmentDate,
                            investmentDuration: parseInt(investmentDuration),
                        },
                        installment: {
                            assetType: assetType,
                            installmentDuration: parseInt(installmentDuration),
                            assetPrice: parseFloat(installmentAmount),
                        },
                        timestamp: new Date(),
                    }, { merge: true });

                    console.log("✅ DCA & Installment data saved successfully!");
                    window.location.href = "../html/in-ex.html";
                } catch (error) {
                    console.error("❌ Error saving DCA & Installment data:", error);
                    alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
                }
            } else {
                console.log("❌ User not authenticated!");
                alert("กรุณาเข้าสู่ระบบก่อนดำเนินการต่อ");
            }
        });
    });
});

const comboInfoBtn = document.getElementById("combo-info-button");
const comboInfoModal = document.getElementById("combo-info-modal");
const comboInfoClose = document.getElementById("combo-info-close");

comboInfoBtn.addEventListener("click", () => {
  comboInfoModal.style.display = "flex";
});

comboInfoClose.addEventListener("click", () => {
  comboInfoModal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === comboInfoModal) {
    comboInfoModal.style.display = "none";
  }
});