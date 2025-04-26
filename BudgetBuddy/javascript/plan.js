import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();

function convertThaiDateToDateObject(thaiDateStr) {
  const parts = thaiDateStr.split(" ");
  const [day, month, year] = parts[0].split("/").map(Number);
  const time = parts[1];
  const gregorianYear = year - 543;
  return new Date(
    `${gregorianYear}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}T${time}`
  );
}

async function getMonthlyTotal(userId, subcollectionName, amountField, dateField) {
  const ref = collection(db, "goal", userId, subcollectionName);
  const snapshot = await getDocs(ref);

  // Step 1: Fetch the plan document
  const planDocRef = doc(db, "plan", userId); // or wherever your plan is
  const planDocSnap = await getDoc(planDocRef);

  let now = new Date(); // fallback if no planUpdatedAt

  if (planDocSnap.exists()) {
    const planData = planDocSnap.data(); // 👈 fetch data first
    if (planData.planUpdatedAt?.toDate) {
      now = planData.planUpdatedAt.toDate(); // Firestore Timestamp case
    } else if (planData.planUpdatedAt) {
      now = new Date(planData.planUpdatedAt); // if it's a string
    }
  }

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let total = 0;
  snapshot.forEach((doc) => {
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


function formatGoalLabel(goalRaw, goalData) {
  if (!goalRaw) return "";
  const lowerGoal = goalRaw.toLowerCase?.() || "";
  const assetType = goalData?.installment?.assetType;
  const assetLabel =
    assetType === "house"
      ? "ซ้อมผ่อน บ้าน"
      : assetType === "car"
      ? "ซ้อมผ่อน รถ"
      : "ซ้อมผ่อน";

  if (lowerGoal === "saving") return "ออมเงิน";
  if (lowerGoal === "dca") return "DCA";
  if (lowerGoal === "no goal") return "ไม่มีเป้าหมายการเงิน";
  if (lowerGoal === "installment trial") return assetLabel;
  if (lowerGoal === "dca & installment trial")
    return `DCA & ${assetLabel}`;
  return goalRaw;
}

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return console.error("User not authenticated.");

    const userId = user.uid; // ← added this line

    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get("id");
    const type = urlParams.get("type");

    let planRef;
    if (type === "current") {
      planRef = doc(db, "plan", userId);
    } else if (type === "history" && planId) {
      planRef = doc(db, "plan", userId, "planHistory", planId);
    } else {
      document.getElementById("plan-title").textContent = "❌ URL ไม่ถูกต้อง";
      return;
    }

    const snap = await getDoc(planRef);
    if (!snap.exists()) {
      document.getElementById("plan-title").textContent = "❌ ไม่พบแผน";
      return;
    }

    const data = snap.data();
    await loadHistoricalData(data);

    // Goal name formatting
    let goalNameRaw = data.goal || "";
    let goalData = data;
    if (
      goalNameRaw === "Installment Trial" ||
      goalNameRaw === "DCA & Installment Trial"
    ) {
      const goalSnap = await getDoc(doc(db, "goal", userId));
      if (goalSnap.exists()) {
        goalData = goalSnap.data();
      }
    }

    const formattedGoal = formatGoalLabel(goalNameRaw, goalData);
    const baseTitle =
      type === "current" ? "แผนการเงินปัจจุบัน" : "แผนการเงินย้อนหลัง";
    const fullTitle = formattedGoal
      ? `${baseTitle} (${formattedGoal})`
      : baseTitle;
    document.getElementById("plan-title").textContent = fullTitle;

    // Status updates (from original plan fields)
    const income = parseFloat(data.income) || 0;
    const expense = parseFloat(data.expense) || 0;
    const debt = parseFloat(data.debt) || 0;
    const netAssets = income - expense - debt; // ← make sure this is defined
    const assetPrice = parseFloat(data.installment?.assetPrice) || 0;
    const installmentDuration =
      parseFloat(data.installment?.installmentDuration) || 1;
    const emergencyFund = parseFloat(data.emergencyFund) || 0;
    const monthsCovered = expense > 0 ? emergencyFund / expense : 0;
    const paidMonths = parseFloat(data.installment?.paidMonths) || 0;
    const dcaInvested = await getMonthlyTotal(userId, "dca_history", "amount", "date");
    const totalInstallmentPaid =await getMonthlyTotal(userId,"installment_history","amount","date");
    const emergency = await getMonthlyTotal(userId,"emergencyfund_history","amount","date");
    const savingsAmount = await getMonthlyTotal(userId, "saving_history", "amount", "date");

    const savings = dcaInvested + totalInstallmentPaid + savingsAmount+ emergency;
    const remaining = income - expense - savings - debt;

    const savingsStatus =
      netAssets >= 0.1 * income
        ? "ดีมาก"
        : netAssets >= 0.05 * income
        ? "พอใช้"
        : "ต้องปรับปรุง";
    const wealthStatus =
      remaining >= 0.05 * income
        ? "ดีมาก"
        : remaining <= 0.005 * income && remaining >= 0
        ? "พอใช้"
        : "ต้องปรับปรุง";
    const emergencyStatus =
      monthsCovered >= 6
        ? "ดีมาก"
        : monthsCovered >= 3
        ? "พอใช้"
        : "ต้องปรับปรุง";

    const debtStatus = data.debtStatus || "ไม่มีหนี้";
    let debtDetailText = "ไม่มีหนี้คงค้าง ถือเป็นสถานะการเงินที่ดี";
    if (debtStatus === "ผ่อนตรงเวลา") {
      debtDetailText =
        "มีหนี้แต่ผ่อนชำระตรงเวลา อยู่ในเกณฑ์ที่จัดการได้";
    } else if (debtStatus === "มีหนี้ค้างชำระ") {
      debtDetailText =
        "มีหนี้ที่ค้างชำระหรือจ่ายล่าช้า ควรเร่งปรับแผนชำระหนี้";
    }

    updateStatus(
      "saving-circle",
      "saving-text",
      "saving-detail",
      savingsStatus,
      `การออม ${(savings *100)/income .toFixed(1)}% ของรายได้`
    );
    updateStatus(
      "wealth-circle",
      "wealth-text",
      "wealth-detail",
      wealthStatus,
      `เงินคงเหลือ ${remaining .toFixed(1)} บาท`
    );
    updateStatus(
      "emergency-circle",
      "emergency-text",
      "emergency-detail",
      emergencyStatus,
      `เงินฉุกเฉินครอบคลุม ${monthsCovered.toFixed(1)} เดือน`
    );
    updateStatus(
      "debt-circle",
      "debt-text",
      "debt-detail",
      debtStatus,
      debtDetailText
    );

    document.getElementById("plan-summary").innerHTML =
      data.plan || "ไม่มีคำแนะนำ";
  });
});

async function loadHistoricalData(data) {
  const userId = auth.currentUser?.uid;
  const planDate = data.planUpdatedAt?.toDate?.() || new Date();

  async function sumMatchingHistory(path) {
    const snapshot = await getDocs(
      collection(db, "goal", userId, path)
    );
    let total = 0;
    snapshot.forEach((doc) => {
      const { amount, date } = doc.data();
      const txnDate = convertThaiDateToDateObject(date);
      if (
        txnDate.getMonth() === planDate.getMonth() &&
        txnDate.getFullYear() === planDate.getFullYear()
      ) {
        total += parseFloat(amount) || 0;
      }
    });
    return total;
  }

  const [dcaInvested, savingsAmount, installmentPaid, emergencyFund] =
    await Promise.all([
      sumMatchingHistory("dca_history"),
      sumMatchingHistory("saving_history"),
      sumMatchingHistory("installment_history"),
      sumMatchingHistory("emergencyfund_history"),
    ]);

  const income = parseFloat(data.income) || 0;
  const expense = parseFloat(data.expense) || 0;
  const debt = parseFloat(data.debt) || 0;
  const totalSavings = dcaInvested + savingsAmount + emergencyFund;
  const remaining =
    income - (expense + totalSavings + debt);
  const installment = installmentPaid;

  updateChart(
    [income, expense, totalSavings, installment, debt, remaining],
    {
      dca: dcaInvested,
      savings: savingsAmount,
      emergency: emergencyFund,
    }
  );
}

function updateChart(financialData, detailedData) {
  const ctx = document
    .getElementById("transactionChart")
    .getContext("2d");

  if (transactionChart instanceof Chart) {
    transactionChart.destroy();
  }

  transactionChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [
        "รายรับ",
        "รายจ่าย",
        "เงินออม",
        "เงินซ้อมผ่อน",
        "หนี้สิน",
        "เงินคงเหลือ",
      ],
      datasets: [
        {
          data: financialData,
          backgroundColor: [
            "#2ecc71",
            "#e74c3c",
            "#2980b9",
            "#ffd1e3",
            "#d35400",
          ],
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          titleFont: { family: "Prompt", size: 14 },
          bodyFont: { family: "Prompt", size: 14 },
          callbacks: {
            label: function (context) {
              const idx = context.dataIndex;
              const val = context.raw.toLocaleString() + " บาท";
              if (idx === 2) {
                return [
                  `เงินออมรวม: ${val}`,
                  ` • DCA: ${detailedData.dca.toLocaleString()} บาท`,
                  ` • เงินออม: ${detailedData.savings.toLocaleString()} บาท`,
                  ` • เงินสำรองฉุกเฉิน: ${detailedData.emergency.toLocaleString()} บาท`,
                ];
              } else {
                return `${context.label}: ${val}`;
              }
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { font: { family: "Prompt", size: 14 } },
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => v.toLocaleString() + " บาท",
            font: { family: "Prompt", size: 14 },
          },
        },
      },
    },
  });
}

let transactionChart = null;

const statusMap = {
  "ดีมาก": { color: "circle-green", icon: "fa-shield-heart" },
  "พอใช้": { color: "circle-yellow", icon: "fa-face-meh" },
  "ต้องปรับปรุง": {
    color: "circle-red",
    icon: "fa-triangle-exclamation",
  },
  "ไม่มีหนี้": { color: "circle-green", icon: "fa-shield-heart" },
  "ผ่อนตรงเวลา": { color: "circle-yellow", icon: "fa-face-meh" },
  "มีหนี้ค้างชำระ": {
    color: "circle-red",
    icon: "fa-triangle-exclamation",
  },
};

function updateStatus(circleId, textId, detailId, status, detailText) {
  const circleEl = document.getElementById(circleId);
  const textEl = document.getElementById(textId);
  const detailEl = document.getElementById(detailId);
  const conf = statusMap[status];

  if (!circleEl || !textEl || !detailEl || !conf) return;

  circleEl.className = `circle ${conf.color}`;
  circleEl.innerHTML = `<i class="fa-solid ${conf.icon}"></i>`;
  textEl.textContent = status;
  detailEl.innerHTML = detailText;
}
