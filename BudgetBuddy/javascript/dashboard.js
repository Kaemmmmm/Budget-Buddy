import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      loadTransactionData(user.uid);
    } else {
      console.error("User not authenticated.");
    }
  });

  updateSubtitleDate();
});

function updateSubtitleDate() {
  const subtitleElement = document.querySelector(".subtitle");

  if (subtitleElement) {
    const monthsThai = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

    const currentDate = new Date();
    const month = monthsThai[currentDate.getMonth()];
    const year = currentDate.getFullYear() + 543;

    subtitleElement.innerHTML = `${month} <strong>${year}</strong>`;
  }
}

function convertThaiDateToDateObject(thaiDateStr) {
  const [date, time] = thaiDateStr.split(" ");
  const [day, month, year] = date.split("/").map(Number);
  const [hours, minutes, seconds] = time.split(":").map(Number);
  const gregorianYear = year - 543;

  return new Date(gregorianYear, month - 1, day, hours, minutes, seconds);
}

async function getMonthlyTotal(userId, subcollectionName, amountField, dateField) {
  const ref = collection(db, "goal", userId, subcollectionName);
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
    const docSnap = await getDoc(userDoc);
    if (docSnap.exists()) {
      const data = docSnap.data();

      // ✅ Format and show user goal
      const formattedGoal = formatGoalLabel(data.goal, data);
      const goalText = formattedGoal
        ? `🎯 เป้าหมายทางการเงินของคุณ: <strong>${formattedGoal}</strong>`
        : "ยังไม่ได้ตั้งเป้าหมายทางการเงิน";
      document.getElementById("user-goal").innerHTML = goalText;

      // ✅ Hide "โปรแกรมคำนวณ DCA" button if goal is not dca or dca & installment
      const rawGoal = (data.goal || "").toLowerCase();
      const dcaButton = document.querySelector(".button-dca");
      if (dcaButton && rawGoal !== "dca" && rawGoal !== "dca & installment trial") {
        dcaButton.style.display = "none";
      }

      // ✅ Financial calculations
      const income = parseFloat(data.income) || 0;
      const expense = parseFloat(data.expense) || 0;
      const debt = parseFloat(data.debt) || 0;

      const dcaInvested = await getMonthlyTotal(userId, "dca_history", "amount", "date");
      const savingsAmount = await getMonthlyTotal(userId, "saving_history", "amount", "date");
      const installmentPaid = await getMonthlyTotal(userId, "installment_history", "amount", "date");
      const emergencyFund = await getMonthlyTotal(userId, "emergencyfund_history", "amount", "date");


      const totalSavings = dcaInvested + savingsAmount + installmentPaid + emergencyFund;
      const remaining = income - (expense + totalSavings + debt);

      updateChart(
        [income, expense, totalSavings, debt, remaining],
        {
          dca: dcaInvested,
          savings: savingsAmount,
          installment: installmentPaid,
          emergency: emergencyFund
        }
      );
    } else {
      console.error("No data found for user.");
      document.getElementById("user-goal").textContent = "ไม่พบข้อมูลเป้าหมาย";
      updateChart([0, 0, 0, 0, 0], { dca: 0, savings: 0, installment: 0 });
    }
  } catch (error) {
    console.error("Error fetching financial data:", error);
    document.getElementById("user-goal").textContent = "เกิดข้อผิดพลาดในการโหลดเป้าหมาย";
  }
}

  



let transactionChart = null;

function updateChart(financialData, detailedData) {
  const ctx = document.getElementById("transactionChart").getContext("2d");

  if (transactionChart instanceof Chart) {
    transactionChart.destroy();
  }

  transactionChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ["รายรับ", "รายจ่าย", "เงินออม", "หนี้สิน", "เงินคงเหลือ"],
      datasets: [{
        data: financialData,
        backgroundColor: ["#2ecc71", "#e74c3c", "#2980b9", "#d35400", "#1abc9c"]
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
                  ` • DCA: ${detailedData.dca.toLocaleString()} บาท`,
                  ` • เงินออม: ${detailedData.savings.toLocaleString()} บาท`,
                  ` • เงินผ่อน: ${detailedData.installment.toLocaleString()} บาท`,
                  ` • เงินสำรองฉุกเฉิน: ${detailedData.emergency.toLocaleString()} บาท`
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
            font: { family: 'Prompt', size: 14 }
          }
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

function formatGoalLabel(goalRaw, goalData) {
  if (!goalRaw) return "";

  const lowerGoal = goalRaw.toLowerCase?.() || "";

  if (lowerGoal === "saving") return "ออมเงิน";
  if (lowerGoal === "dca") return "DCA";
  if (lowerGoal === "no goal") return "ไม่มีเป้าหมายการเงิน";

  const assetType = goalData?.installment?.assetType;
  const assetLabel = assetType === "house" ? "ซ้อมผ่อน บ้าน"
                   : assetType === "car" ? "ซ้อมผ่อน รถ"
                   : "ซ้อมผ่อน";

  if (lowerGoal === "installment trial") return assetLabel;
  if (lowerGoal === "dca & installment trial") return `DCA & ${assetLabel}`;

  return goalRaw;
}

