import { db } from "../javascript/firebase.js";  // Import Firestore from firebase.js
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

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
});

async function loadTransactionData(userId) {
    const userDoc = doc(db, "goal", userId);
    
    try {
        const docSnap = await getDoc(userDoc);
        if (docSnap.exists()) {
            const data = docSnap.data();

            // Extract financial data (set default values if missing)
            const income = data.income || 0;
            const expense = data.expense || 0;
            const savings = data.amount;
            const debt = data.debt || 0;
            const remaining = income - expense - savings;

            updateChart([income, expense, savings, debt, remaining]);
        } else {
            console.error("No data found for user.");
            updateChart([0, 0, 0, 0, 0]); // Show empty chart if no data
        }
    } catch (error) {
        console.error("Error fetching financial data:", error);
    }
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
