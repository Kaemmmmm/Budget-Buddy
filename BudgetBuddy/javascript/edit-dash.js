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
    const snapshot = await getDoc(userDoc);
    if (snapshot.exists()) {
      const data = snapshot.data();

      const income = parseFloat(data.income) || 0;
      const expense = parseFloat(data.expense) || 0;
      const debt = parseFloat(data.debt) || 0;

      const dcaInvested = parseFloat(data.dca?.invested) || 0;
      const assetPrice = parseFloat(data.installment?.assetPrice) || 0;
      const installmentDuration = parseFloat(data.installment?.installmentDuration) || 1; // avoid division by 0
      const paidMonths = parseFloat(data.installment?.paidMonths) || 0;
      const savingsAmount = parseFloat(data.savings?.amount) || 0;
      

      const totalInstallmentPaid = paidMonths * (assetPrice / (installmentDuration * 12));
      const savings = dcaInvested + totalInstallmentPaid + savingsAmount ;

      const remaining = income - expense - savings - debt;

      document.getElementById("income").value = income;
      document.getElementById("expense").value = expense;
      document.getElementById("debt").value = debt;

      updateChart(
        [income, expense, savings, debt, remaining], 
        {
          dca: dcaInvested,
          savings: savingsAmount,
          installment: totalInstallmentPaid
        }
      );

    } else {
      console.error("No data found for user.");
      updateChart([0, 0, 0, 0, 0], { dca: 0, savings: 0, emergencyFund: 0, installment: 0 });
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

  // User inputs only these fields
  const income = parseFloat(document.getElementById("income").value) || 0;
  const expense = parseFloat(document.getElementById("expense").value) || 0;
  const debt = parseFloat(document.getElementById("debt").value) || 0;

  try {
    // Fetch existing data from Firebase first
    const docRef = doc(db, "goal", user.uid);
    const docSnap = await getDoc(docRef);

    let dcaInvested = 0, assetPrice = 0, installmentDuration = 1, paidMonths = 0, savingsAmount = 0;


    if (docSnap.exists()) {
      const data = docSnap.data();
      dcaInvested = parseFloat(data.dca?.invested) || 0;
      assetPrice = parseFloat(data.installment?.assetPrice) || 0;
      installmentDuration = parseFloat(data.installment?.installmentDuration) || 1;
      paidMonths = parseFloat(data.installment?.paidMonths) || 0;
      savingsAmount = parseFloat(data.savings?.amount) || 0;
    } else {
      console.error("No existing data found. Defaulting to zeroes.");
    }

    // Perform calculations based on fetched data
    const totalInstallmentPaid = paidMonths * (assetPrice / (installmentDuration * 12));
    const savings = dcaInvested + totalInstallmentPaid + savingsAmount + emergencyFund;

    const remaining = income - expense - savings - debt;

    // Now update the necessary fields
    await setDoc(doc(db, "goal", user.uid), {
      income,
      expense,
      debt,
      remaining,
      timestamp: new Date()
    }, { merge: true });

    alert("ข้อมูลได้รับการอัปเดตเรียบร้อย!");
    updateChart(
      [income, expense, savings, debt, remaining], 
      {
        dca: dcaInvested,
        savings: savingsAmount,
        installment: totalInstallmentPaid
      }
    );
    window.location.href = "dashboard.html";

  } catch (error) {
    console.error("❌ Error updating data:", error);
    alert("เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
  }
}

  
  
  function updateChart(financialData, detailedData = {}) { // ✅ Default to empty object
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
          legend: { 
            display: false 
          },
          tooltip: {
            titleFont: { 
              family: 'Prompt', 
              size: 14 
            }, 
            bodyFont: { 
              family: 'Prompt', 
              size: 14 
            },
            callbacks: {
              label: function(context) {
                const labelIndex = context.dataIndex;
                const value = context.raw.toLocaleString() + " บาท";
                if (labelIndex === 2) {
                  return [
                    `เงินออมรวม: ${value}`,
                    ` • DCA: ${(detailedData.dca || 0).toLocaleString()} บาท`,
                    ` • เงินออม: ${(detailedData.savings || 0).toLocaleString()} บาท`,
                    ` • เงินซ้อมผ่อน: ${(detailedData.installment || 0).toLocaleString()} บาท`
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
            ticks: {
              font: {
                family: 'Prompt',
                size: 14
              }
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => value.toLocaleString() + " บาท",
              font: {
                family: 'Prompt',
                size: 14
              }
            }
          }
        }
      }
    });
  }
  