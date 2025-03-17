// installment.js
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
                const assetType = document.getElementById("asset-type").value;
                const assetPrice = document.getElementById("asset-price").value;
                const installmentDuration = document.getElementById("installment-duration").value;

                // Debugging: Check user inputs
                console.log("User ID:", userId);
                console.log("Asset Type:", assetType);
                console.log("Asset Price:", assetPrice);
                console.log("Installment Duration:", installmentDuration);

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

                    console.log("✅ Installment data saved successfully!");

                    // Redirect after saving data
                    window.location.href = "../html/saving.html";
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
