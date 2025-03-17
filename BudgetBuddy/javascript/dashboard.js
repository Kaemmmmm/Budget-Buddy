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

      // Safely extract nested fields with optional chaining (?.) and fallback (|| 0)
      const income  = parseFloat(data.income)  || 0;
      const expense = parseFloat(data.expense) || 0;
      const debt    = parseFloat(data.debt)    || 0;

      // DCA: data.dca.invested
      const dcaInvested = parseFloat(data.dca?.invested) || 0;

      // Installment: data.installment.assetPrice, data.installment.installmentDuration, data.installment.paidMonths
      const assetPrice          = parseFloat(data.installment?.assetPrice)          || 0;
      const installmentDuration = parseFloat(data.installment?.installmentDuration) || 1; // avoid division by 0
      const paidMonths          = parseFloat(data.installment?.paidMonths)          || 0;

      // Savings: data.savings.amount
      const savingsAmount = parseFloat(data.savings?.amount) || 0;

      // Calculate how much has been paid in installments so far

      // Combine them for your "savings" figure
      const savings = dcaInvested + totalInstallmentPaid + savingsAmount;

      // Calculate remaining (optional)
      const remaining = income - expense;

      // Pass data to the chart
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
      datasets: [
        {
          label: "จำนวนเงิน (บาท)",
          data: financialData,
          backgroundColor: [
            "#28a745", // Income (Green)
            "#dc3545", // Expense (Red)
            "#007bff", // Savings (Blue)
            "#ff0000", // Debt (Dark Red)
            "#ffc107"  // Remaining (Yellow)
          ]
        }
      ]
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
