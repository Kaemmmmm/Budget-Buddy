import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();
let transactionChart;

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            loadTransactionData(user.uid);
        } else {
            console.error("User not authenticated.");
        }
    });

    document.getElementById("saveButton").addEventListener("click", updateTransactionData);
});

async function loadTransactionData(userId) {
    const userDoc = doc(db, "goal", userId);

    try {
        const docSnap = await getDoc(userDoc);
        if (docSnap.exists()) {
            const data = docSnap.data();

            // Fill input fields with existing data
            document.getElementById("income").value = data.income || 0;
            document.getElementById("expense").value = data.expense || 0;
            document.getElementById("savings").value = data.savings || 0;
            document.getElementById("debt").value = data.debt || 0;

            updateChart([data.income, data.expense, data.savings, data.debt, (data.income - data.expense - data.savings - data.debt)]);
        } else {
            console.error("No data found for user.");
            updateChart([0, 0, 0, 0, 0]); // Empty chart if no data
        }
    } catch (error) {
        console.error("Error fetching financial data:", error);
    }
}

async function updateTransactionData() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            alert("กรุณาเข้าสู่ระบบก่อนอัปเดตข้อมูล");
            return;
        }

        const userId = user.uid;
        const income = parseFloat(document.getElementById("income").value) || 0;
        const expense = parseFloat(document.getElementById("expense").value) || 0;
        const savings = parseFloat(document.getElementById("savings").value) || 0;
        const debt = parseFloat(document.getElementById("debt").value) || 0;
        const remaining = income - expense - savings - debt;

        try {
            await setDoc(doc(db, "goal", userId), {
                income, expense, savings, debt, remaining,
                timestamp: new Date()
            }, { merge: true });

            console.log("✅ Data successfully updated!");
            alert("ข้อมูลได้รับการอัปเดตเรียบร้อย!");
            updateChart([income, expense, savings, debt, remaining]);

        } catch (error) {
            console.error("❌ Error updating data:", error);
            alert("เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
        }
    });
}

function updateChart(financialData) {
    const ctx = document.getElementById("transactionChart").getContext("2d");

    if (transactionChart) {
        transactionChart.destroy();
    }

    transactionChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["รายรับ", "รายจ่าย", "เงินออม", "หนี้สิน", "เงินคงเหลือ"],
            datasets: [{
                label: "จำนวนเงิน (บาท)",
                data: financialData,
                backgroundColor: [
                    "#28a745", // Income (Green)
                    "#dc3545", // Expense (Red)
                    "#007bff", // Savings (Blue)
                    "#ff0000", // Debt (Dark Red)
                    "#ffc107"  // Remaining (Yellow)
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + " บาท";
                        }
                    }
                }
            }
        }
    });
}
