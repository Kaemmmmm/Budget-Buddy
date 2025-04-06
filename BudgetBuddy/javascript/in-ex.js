// saving.js
import { db, setDoc, doc } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
// นำเข้า getDoc จาก firebase-firestore แทน firebase-auth
import { getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

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

                    // ดึงข้อมูลจาก document "goal" ที่มีข้อมูลเป้าหมายจากหน้าที่ user เลือกไว้
          const goalDocRef = doc(db, "goal", userId);
          const goalSnapshot = await getDoc(goalDocRef);
          const goalData = goalSnapshot.data();

          // ดึงค่า goal จาก Firestore (ฟิลด์ "goal")
          const firestoreGoal = goalData.goal ? goalData.goal.toLowerCase() : "";
          let totalCommitment = 0;

          // คำนวณ totalCommitment จากหน้าที่ user เลือก (ตามฟิลด์ที่เก็บข้อมูลในแต่ละหน้า)
          if (firestoreGoal === "dca") {
            totalCommitment = goalData.dca ? parseFloat(goalData.dca.monthlyInvestment) || 0 : 0;
          } else if (firestoreGoal === "installment trial") {
            totalCommitment = goalData.installment ? parseFloat(goalData.installment.assetPrice) || 0 : 0;
          } else if (firestoreGoal === "dca & installment trial") {
            totalCommitment = (goalData.dca ? parseFloat(goalData.dca.monthlyInvestment) || 0 : 0)
                            + (goalData.installment ? parseFloat(goalData.installment.assetPrice) || 0 : 0);
          } else if (firestoreGoal === "saving") {
            totalCommitment = goalData.savings ? parseFloat(goalData.savings.savingAmount) || 0 : 0;
          }

          // คำนวณรายรับสุทธิ
          const netIncome = parseFloat(income) - parseFloat(expense) - parseFloat(debt);

          console.log("Total Commitment (from page data):", totalCommitment);
          console.log("Net Income:", netIncome);

          // ตรวจสอบว่า totalCommitment เกินรายรับสุทธิหรือไม่
          if (totalCommitment > netIncome) {
            if (confirm("จำนวนเงินในเป้าหมายที่คุณกรอกไว้เกินรายรับสุทธิ\nกด OK เพื่อกลับไปแก้ไขข้อมูล")) {
              let redirectURL = "../html/saving.html"; // ค่า default
              if (firestoreGoal === "dca") {
                redirectURL = "../html/dca.html";
              } else if (firestoreGoal === "installment trial") {
                redirectURL = "../html/installment.html";
              } else if (firestoreGoal === "dca & installment trial") {
                redirectURL = "../html/dca-install.html";
              } else if (firestoreGoal === "saving") {
                redirectURL = "../html/saving(goal).html";
              }
              window.location.href = redirectURL;
            }
            return; 
          }
                    console.log("✅ Financial data saved successfully!");

                    // Redirect after saving data
                    window.location.href = "../html/dashboard.html";
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
