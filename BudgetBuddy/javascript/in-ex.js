import { db, setDoc, doc, getDoc } from "../javascript/firebase.js";
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
            if (!user) {
                alert("กรุณาเข้าสู่ระบบก่อนดำเนินการต่อ");
                console.log("❌ User not authenticated!");
                return;
            }

            const userId = user.uid;
            const income = document.getElementById("income").value;
            const expense = document.getElementById("expense").value;
            const debt = document.getElementById("debt").value;

            if (!income || !expense || !debt) {
                alert("กรุณากรอกข้อมูลให้ครบทุกช่องก่อนดำเนินการต่อ");
                console.error("Error: Some fields are missing.");
                return;
            }

            try {
                // Save financial input
                await setDoc(doc(db, "goal", userId), {
                    income: parseFloat(income),
                    expense: parseFloat(expense),
                    debt: parseFloat(debt),
                    timestamp: new Date(),
                }, { merge: true });

                // Fetch goal data
                const goalSnapshot = await getDoc(doc(db, "goal", userId));
                const goalData = goalSnapshot.data();
                const firestoreGoal = goalData.goal ? goalData.goal.toLowerCase() : "";

                let totalCommitment = 0;
                let annualRate = 0;
                let principal = 0;
                let dcaAmount = 0;
                let monthlyInstallment = 0;

                if (firestoreGoal === "dca") {
                    dcaAmount = goalData.dca ? parseFloat(goalData.dca.monthlyInvestment) || 0 : 0;
                    totalCommitment = dcaAmount;

                } else if (firestoreGoal === "installment trial" || firestoreGoal === "dca & installment trial") {
                    dcaAmount = firestoreGoal.includes("dca") && goalData.dca ? parseFloat(goalData.dca.monthlyInvestment) || 0 : 0;

                    if (goalData.installment) {
                        const { assetPrice, assetType, installmentDuration } = goalData.installment;
                        const months = parseInt(installmentDuration) * 12 || 60;
                        principal = parseFloat(assetPrice) || 0;

                        // Assign rate
                        if (assetType === "house") {
                            annualRate = months <= 36 ? 0.03 : 0.07;
                        } else if (assetType === "car") {
                            annualRate = months <= 36 ? 0.04 : 0.09;
                        }

                        const interest = principal * annualRate * (months / 12);
                        const totalPayable = principal + interest;
                        monthlyInstallment = totalPayable / months;
                    }

                    totalCommitment = dcaAmount + principal;
                } else if (firestoreGoal === "saving") {
                    totalCommitment = goalData.savings ? parseFloat(goalData.savings.savingAmount) || 0 : 0;
                }

                const netIncome = parseFloat(income) - parseFloat(expense) - parseFloat(debt);

                let monthlyPayment = 0;
                if (firestoreGoal === "dca") {
                    monthlyPayment = dcaAmount;
                } else if (firestoreGoal === "installment trial") {
                    monthlyPayment = monthlyInstallment;
                } else if (firestoreGoal === "dca & installment trial") {
                    monthlyPayment = dcaAmount + monthlyInstallment;
                } else if (firestoreGoal === "saving") {
                    const savingDuration = goalData.savings ? parseFloat(goalData.savings.savingDuration) || 1 : 1;
                    monthlyPayment = totalCommitment / savingDuration;
                }

                console.log("Total Commitment:", totalCommitment);
                console.log("Net Income:", netIncome);
                console.log("Monthly Payment:", monthlyPayment);
                console.log("Goal:", firestoreGoal);
                console.log("DCA Amount:", dcaAmount);
                console.log("Installment Monthly:", monthlyInstallment);
                console.log("Total Monthly Payment:", monthlyPayment);
                console.log("Net Income:", netIncome);

                if (monthlyPayment > netIncome) {
                    if (confirm(`ยอดผ่อนต่อเดือนของคุณ (${monthlyPayment.toFixed(2)}) เกินยอดคงเหลือต่อเดือน (${netIncome.toFixed(2)})\nกด OK เพื่อกลับไปแก้ไขข้อมูล\nกด Cancel เพื่อดำเนินการต่อ`)) {
                        let redirectURL = "../html/in-ex.html";
                        if (firestoreGoal === "dca") redirectURL = "../html/dca.html";
                        else if (firestoreGoal === "installment trial") redirectURL = "../html/installment.html";
                        else if (firestoreGoal === "dca & installment trial") redirectURL = "../html/dca-install.html";
                        else if (firestoreGoal === "saving") redirectURL = "../html/saving(goal).html";
                        return (window.location.href = redirectURL);
                    } else {
                        if (confirm("คุณต้องการดำเนินการต่อหรือไม่?\nกด OK เพื่อไปที่ Dashboard")) {
                            return (window.location.href = "../html/dashboard.html");
                        }
                    }
                }

                console.log("✅ Financial data saved successfully!");
                window.location.href = "../html/dashboard.html";

            } catch (error) {
                console.error("❌ Error saving financial data:", error);
                alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
            }
        });
    });
});