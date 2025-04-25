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
  if (!subtitleElement) return;

  const monthsThai = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const now = new Date();
  const month = monthsThai[now.getMonth()];
  const year = now.getFullYear() + 543;
  subtitleElement.innerHTML = `${month} <strong>${year}</strong>`;
}

function convertThaiDateToDateObject(thaiDateStr) {
  const [date, time] = thaiDateStr.split(" ");
  const [day, month, year] = date.split("/").map(Number);
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return new Date(year - 543, month - 1, day, hours, minutes, seconds);
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
      const d = convertThaiDateToDateObject(data[dateField]);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        total += parseFloat(data[amountField]) || 0;
      }
    }
  });
  return total;
}

async function loadTransactionData(userId) {
  const userDoc = doc(db, "goal", userId);
  try {
    const snap = await getDoc(userDoc);
    if (!snap.exists()) {
      throw new Error('No data');
    }
    const data = snap.data();

    // Show goal
    const formatted = formatGoalLabel(data.goal, data);
    document.getElementById("user-goal").innerHTML = formatted
      ? `🎯 เป้าหมายทางการเงินของคุณ: <strong>${formatted}</strong>`
      : "ยังไม่ได้ตั้งเป้าหมายทางการเงิน";

    // Hide DCA button if irrelevant
    const rawGoal = (data.goal || "").toLowerCase();
    const btn = document.querySelector(".button-dca");
    if (btn && rawGoal !== "dca" && rawGoal !== "dca & installment trial") {
      btn.style.display = "none";
    }

    // Totals
    const income = parseFloat(data.income) || 0;
    const expense = parseFloat(data.expense) || 0;
    const debt = parseFloat(data.debt) || 0;
    const dca = await getMonthlyTotal(userId, "dca_history", "amount", "date");
    const savings = await getMonthlyTotal(userId, "saving_history", "amount", "date");
    const installment = await getMonthlyTotal(userId, "installment_history", "amount", "date");
    const emergency = await getMonthlyTotal(userId, "emergencyfund_history", "amount", "date");

    const totalSavings = dca + savings + emergency; // exclude installment
    const remaining = income - (expense + totalSavings + debt + installment);

    updateChart(
      [income, expense, totalSavings, installment, debt, remaining],
      { dca, savings, installment, emergency }
    );
  } catch (err) {
    console.error(err);
    document.getElementById("user-goal").textContent = "ไม่พบข้อมูลหรือเกิดข้อผิดพลาด";
    updateChart([0, 0, 0, 0, 0, 0], { dca:0, savings:0, installment:0, emergency:0 });
  }
}

let transactionChart = null;
function updateChart(dataArr, details) {
  const ctx = document.getElementById("transactionChart").getContext("2d");
  if (transactionChart) transactionChart.destroy();

  transactionChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ["รายรับ", "รายจ่าย", "เงินออม", "เงินผ่อน", "หนี้สิน", "เงินคงเหลือ"],
      datasets: [{
        data: dataArr,
        backgroundColor: [
          "#2ecc71", // income
          "#e74c3c", // expense
          "#2980b9", // savings
          "#ffd1e3", // installment
          "#d35400", // debt
          "#1abc9c"  // remaining
        ]
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          titleFont: { family: 'Prompt', size: 14 },
          bodyFont: { family: 'Prompt', size: 14 },
          callbacks: {
            label: ctx => {
              const idx = ctx.dataIndex;
              const val = ctx.raw.toLocaleString() + " บาท";
              if (idx === 2) {
                return [
                  `เงินออมรวม: ${val}`,
                  ` • DCA: ${details.dca.toLocaleString()} บาท`,
                  ` • เงินออม: ${details.savings.toLocaleString()} บาท`,
                  ` • ฉุกเฉิน: ${details.emergency.toLocaleString()} บาท`
                ];
              }
              if (idx === 3) {
                return `เงินผ่อน: ${details.installment.toLocaleString()} บาท`;
              }
              const lbl = ["รายรับ","รายจ่าย","เงินออม","เงินผ่อน","หนี้สิน","เงินคงเหลือ"][idx];
              return `${lbl}: ${val}`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { font: { family: 'Prompt', size: 14 } } },
        y: {
          beginAtZero: true,
          ticks: {
            callback: v => v.toLocaleString() + " บาท",
            font: { family: 'Prompt', size: 14 }
          }
        }
      }
    }
  });
}

function formatGoalLabel(goal, gdata) {
  if (!goal) return "";
  const lg = goal.toLowerCase();
  switch (lg) {
    case 'saving': return 'ออมเงิน';
    case 'dca': return 'DCA';
    case 'no goal': return 'ไม่มีเป้าหมายการเงิน';
  }
  const type = gdata?.installment?.assetType;
  const label = type === 'house'
    ? 'ซ้อมผ่อน บ้าน'
    : type === 'car'
      ? 'ซ้อมผ่อน รถ'
      : 'ซ้อมผ่อน';
  if (lg === 'installment trial') return label;
  if (lg === 'dca & installment trial') return `DCA & ${label}`;
  return goal;
}