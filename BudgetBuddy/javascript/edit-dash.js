import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

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

// ✅ Thai BE date string to JS Date
function convertThaiDateToDateObject(thaiDateStr) {
  const [date, time] = thaiDateStr.split(" ");
  const [day, month, year] = date.split("/").map(Number);
  const [hours, minutes, seconds] = time.split(":").map(Number);
  const gregorianYear = year - 543;

  return new Date(gregorianYear, month - 1, day, hours, minutes, seconds);
}

// ✅ Get total for current month from history
async function getMonthlyTotal(userId, subcollection, amountField, dateField) {
  const ref = collection(db, "goal", userId, subcollection);
  const snapshot = await getDocs(ref);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let total = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data[dateField]) {
      const dateObj = convertThaiDateToDateObject(data[dateField]);
      if (dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) {
        total += parseFloat(data[amountField]) || 0;
      }
    }
  });

  return total;
}

async function loadTransactionData(userId) {
  const userDoc = doc(db, "goal", userId);

  try {
    const snapshot = await getDoc(userDoc);
    if (snapshot.exists()) {
      const data = snapshot.data();

      const income = parseFloat(data.income) || 0;
      const expense = parseFloat(data.expense) || 0;
      const debt = parseFloat(data.debt) || 0;

      // ✅ Monthly totals
      const dcaInvested = await getMonthlyTotal(userId, "dca_history", "monthlyInvestment", "investmentDate");
      const savingsAmount = await getMonthlyTotal(userId, "saving_history", "amount", "date");
      const installmentPaid = await getMonthlyTotal(userId, "installment_history", "amount", "date");

      const savings = dcaInvested + savingsAmount + installmentPaid;
      const remaining = income - expense - savings - debt;

      document.getElementById("income").value = income;
      document.getElementById("expense").value = expense;
      document.getElementById("debt").value = debt;

      updateChart(
        [income, expense, savings, debt, remaining],
        {
          dca: dcaInvested,
          savings: savingsAmount,
          installment: installmentPaid
        }
      );

    } else {
      console.error("No data found for user.");
      updateChart([0, 0, 0, 0, 0], { dca: 0, savings: 0, installment: 0 });
    }
  } catch (error) {
    console.error("Error fetching financial data:", error);
  }
}

async function updateTransactionData() {
  const user = auth.currentUser;

  if (!user) {
    alert("กรุณาเข้าสู่ระบบก่อนอัปเดตข้อมูล");
    return;
  }

  const income = parseFloat(document.getElementById("income").value) || 0;
  const expense = parseFloat(document.getElementById("expense").value) || 0;
  const debt = parseFloat(document.getElementById("debt").value) || 0;

  try {
    await setDoc(doc(db, "goal", user.uid), {
      income,
      expense,
      debt,
      timestamp: new Date()
    }, { merge: true });

    // ✅ Refresh chart after saving
    await loadTransactionData(user.uid);
    alert("ข้อมูลได้รับการอัปเดตเรียบร้อย!");
    window.location.href = "dashboard.html";

  } catch (error) {
    console.error("❌ Error updating data:", error);
    alert("เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
  }
}

function updateChart(financialData, detailedData = {}) {
  const ctx = document.getElementById("transactionChart").getContext("2d");

  if (transactionChart) transactionChart.destroy();

  transactionChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ["รายรับ", "รายจ่าย", "เงินออม", "หนี้สิน", "เงินคงเหลือ"],
      datasets: [{
        data: financialData,
        backgroundColor: ["#28a745", "#dc3545", "#007bff", "#ff0000", "#ffc107"]
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          titleFont: { family: 'Prompt', size: 14 },
          bodyFont: { family: 'Prompt', size: 14 },
          callbacks: {
            label: function (context) {
              const labelIndex = context.dataIndex;
              const value = context.raw.toLocaleString() + " บาท";
              if (labelIndex === 2) {
                return [
                  `เงินออมรวม: ${value}`,
                  ` • DCA: ${(detailedData.dca || 0).toLocaleString()} บาท`,
                  ` • เงินออม: ${(detailedData.savings || 0).toLocaleString()} บาท`,
                  ` • เงินผ่อน: ${(detailedData.installment || 0).toLocaleString()} บาท`
                ];
              } else {
                return `${context.label}: ${value}`;
              }
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { family: 'Prompt', size: 14 } }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => value.toLocaleString() + " บาท",
            font: { family: 'Prompt', size: 14 }
          }
        }
      }
    }
  });
}
