import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      loadTransactionData(user.uid);
    } else {
      console.error("User not authenticated.");
    }
  });

  // ✅ Dynamically update the month and year in the subtitle
  updateSubtitleDate();
});

// Function to update the subtitle date
function updateSubtitleDate() {
  const subtitleElement = document.querySelector(".subtitle");

  if (subtitleElement) {
    const monthsThai = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    
    const currentDate = new Date();
    const month = monthsThai[currentDate.getMonth()];
    const year = currentDate.getFullYear() + 543; // Convert to Buddhist Era

    subtitleElement.innerHTML = `${month} <strong>${year}</strong>`;
  }
}

async function loadTransactionData(userId) {
  const userDoc = doc(db, "goal", userId);

  try {
    const docSnap = await getDoc(userDoc);
    if (docSnap.exists()) {
      const data = docSnap.data();

      const income  = parseFloat(data.income)  || 0;
      const expense = parseFloat(data.expense) || 0;
      const debt    = parseFloat(data.debt)    || 0;
      
      const dcaInvested = parseFloat(data.dca?.invested) || 0;
      const assetPrice  = parseFloat(data.installment?.assetPrice) || 0;
      const installmentDuration = parseFloat(data.installment?.installmentDuration) || 1;
      const paidMonths  = parseFloat(data.installment?.paidMonths) || 0;
      const savingsAmount = parseFloat(data.savings?.amount) || 0;
      const emergencyFund = parseFloat(data.emergencyFund?.amount) || 0; // ✅ Include emergency fund

      const totalInstallmentPaid = paidMonths * (assetPrice / (installmentDuration * 12));
      const totalSavings = dcaInvested + totalInstallmentPaid + savingsAmount + emergencyFund; // ✅ Add emergency fund

      const remaining = income - (expense + totalInstallmentPaid + dcaInvested + savingsAmount + emergencyFund + debt);

      updateChart(
        [income, expense, totalSavings, debt, remaining], // ✅ Updated เงินออม
        {
          dca: dcaInvested,
          savings: savingsAmount,
          emergencyFund: emergencyFund, // ✅ Add emergency fund
          installment: totalInstallmentPaid
        }
      );

    } else {
      console.error("No data found for user.");
      updateChart([0, 0, 0, 0, 0], {dca: 0, savings: 0, emergencyFund: 0, installment: 0});
    }
  } catch (error) {
    console.error("Error fetching financial data:", error);
  }
}

let transactionChart = null; // ✅ Ensure this is properly initialized

function updateChart(financialData, detailedData) {
  const ctx = document.getElementById("transactionChart").getContext("2d");

  // ✅ Ensure `transactionChart` is a Chart instance before destroying
  if (transactionChart instanceof Chart) {
    transactionChart.destroy();
  }

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
                  ` • DCA: ${detailedData.dca.toLocaleString()} บาท`,
                  ` • เงินออม: ${detailedData.savings.toLocaleString()} บาท`,
                  ` • เงินสำรองฉุกเฉิน: ${detailedData.emergencyFund.toLocaleString()} บาท`, // ✅ Emergency fund added
                  ` • เงินซ้อมผ่อน: ${detailedData.installment.toLocaleString()} บาท`
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


