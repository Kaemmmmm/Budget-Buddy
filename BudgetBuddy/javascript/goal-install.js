// installment.js
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
    const assetPriceInput = document.getElementById("asset-price");
    if (assetPriceInput) attachCommaFormatting(assetPriceInput);

    if (!submitButton) {
        console.error("Error: Submit button not found.");
        return;
    }

    submitButton.addEventListener("click", () => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userId = user.uid;
                const assetType = document.getElementById("asset-type").value;
                const assetPrice = assetPriceInput?.value.replace(/,/g, '') || "";
                const installmentDuration = document.getElementById("installment-duration").value;

                if (!assetType || !assetPrice || !installmentDuration) {
                    alert("กรุณากรอกข้อมูลให้ครบทุกช่องก่อนดำเนินการต่อ");
                    console.error("Error: Some fields are missing.");
                    return;
                }

                try {
                    await setDoc(doc(db, "goal", userId), {
                        installment:{
                        assetType: assetType,
                        assetPrice: parseFloat(assetPrice),
                        installmentDuration: parseInt(installmentDuration),
                    },
                        timestamp: new Date(),
                    }, { merge: true });

                    console.log(" Installment data saved successfully!");
                    window.location.href = "../html/in-ex.html";
                } catch (error) {
                    console.error("❌ Error saving installment data:", error);
                    alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
                }
            } else {
                console.log("❌ User not authenticated!");
                alert("กรุณาเข้าสู่ระบบก่อนดำเนินการต่อ");
            }
        });
    });
});

const installmentInfoBtn = document.getElementById("installment-info-button");
const installmentInfoModal = document.getElementById("installment-info-modal");
const installmentInfoClose = document.getElementById("installment-info-close");

if (installmentInfoBtn && installmentInfoModal && installmentInfoClose) {
    installmentInfoBtn.addEventListener("click", () => {
      installmentInfoModal.style.display = "flex";
    });

    installmentInfoClose.addEventListener("click", () => {
      installmentInfoModal.style.display = "none";
    });

    window.addEventListener("click", (e) => {
      if (e.target === installmentInfoModal) {
        installmentInfoModal.style.display = "none";
      }
    });
}