import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();

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

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return console.error("User not authenticated.");

    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get("id");
    const type = urlParams.get("type");

    let planRef;

    if (type === "current") {
      planRef = doc(db, "plan", user.uid);
    } else if (type === "history" && planId) {
      planRef = doc(db, "plan", user.uid, "planHistory", planId);
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

    // ✅ Always show the dashboard
    loadHistoricalData(data);

    // ✅ Format goal label properly
    let goalNameRaw = data.goal || "";
    let goalData = data;

    if (
      goalNameRaw === "Installment Trial" ||
      goalNameRaw === "DCA & Installment Trial"
    ) {
      const goalSnap = await getDoc(doc(db, "goal", user.uid));
      if (goalSnap.exists()) {
        goalData = goalSnap.data();
      }
    }

    const formattedGoal = formatGoalLabel(goalNameRaw, goalData);
    const baseTitle = type === "current" ? "แผนการเงินปัจจุบัน" : "แผนการเงินย้อนหลัง";
    const fullTitle = formattedGoal ? `${baseTitle} (${formattedGoal})` : baseTitle;
    document.getElementById("plan-title").textContent = fullTitle;

    const { income, expense, dcaInvested, savingsAmount, emergencyFund } = data;
    const installmentPaid = parseFloat(data.emergencyFund) || 0;
    const savings = (dcaInvested || 0) + (savingsAmount || 0) + installmentPaid;

    const netAssets = income - expense - (data.debt || 0);
    const monthsCovered = expense > 0 ? emergencyFund / expense : 0;

    const savingsStatus = savings >= 0.10 * income ? "ดีมาก" : savings >= 0.05 * income ? "พอใช้" : "ต้องปรับปรุง";
    const wealthStatus = netAssets >= 0.50 * income ? "ดีมาก" : netAssets >= 0.20 * income ? "พอใช้" : "ต้องปรับปรุง";
    const emergencyStatus = monthsCovered >= 6 ? "ดีมาก" : monthsCovered >= 3 ? "พอใช้" : "ต้องปรับปรุง";

    const debtStatus = data.debtStatus || "ไม่มีหนี้";
    let debtDetailText = "ไม่มีหนี้คงค้าง ถือเป็นสถานะการเงินที่ดี";
    if (debtStatus === "ผ่อนตรงเวลา") {
      debtDetailText = "มีหนี้แต่ผ่อนชำระตรงเวลา อยู่ในเกณฑ์ที่จัดการได้";
    } else if (debtStatus === "มีหนี้ค้างชำระ") {
      debtDetailText = "มีหนี้ที่ค้างชำระหรือจ่ายล่าช้า ควรเร่งปรับแผนชำระหนี้";
    }

    updateStatus("saving-circle", "saving-text", "saving-detail", savingsStatus, `การออม ${(savings / income * 100).toFixed(1)}% ของรายได้`);
    updateStatus("wealth-circle", "wealth-text", "wealth-detail", wealthStatus, `สินทรัพย์สุทธิ ${(netAssets / income * 100).toFixed(1)}% ของรายได้`);
    updateStatus("emergency-circle", "emergency-text", "emergency-detail", emergencyStatus, `เงินฉุกเฉินครอบคลุม ${monthsCovered.toFixed(1)} เดือน`);
    updateStatus("debt-circle", "debt-text", "debt-detail", debtStatus, debtDetailText);

    document.getElementById("plan-summary").innerHTML = data.plan || "ไม่มีคำแนะนำ";
  });

  updateSubtitleDate();
});

function updateSubtitleDate() {
  const subtitleElement = document.querySelector(".subtitle");
  if (subtitleElement) {
    const monthsThai = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const currentDate = new Date();
    const month = monthsThai[currentDate.getMonth()];
    const year = currentDate.getFullYear() + 543;
    subtitleElement.innerHTML = `${month} <strong>${year}</strong>`;
  }
}

function loadHistoricalData(data) {
  const income = parseFloat(data.income) || 0;
  const expense = parseFloat(data.expense) || 0;
  const debt = parseFloat(data.debt) || 0;

  const dcaInvested = parseFloat(data.dcaInvested) || 0;
  const savingsAmount = parseFloat(data.savingsAmount) || 0;

  // ✅ New: Calculate installmentPaid from saved paidMonths
  const paidMonths = parseFloat(data.paidMonths) || 0;
  const assetPrice = parseFloat(data.assetPrice) || 0;
  const installmentDuration = parseFloat(data.installmentDuration) || 1;  
  const monthlyPayment = installmentDuration > 0 ? assetPrice / (installmentDuration * 12) : 0;
  const installmentPaid = paidMonths * monthlyPayment;

  const totalSavings = dcaInvested + savingsAmount + installmentPaid;
  const remaining = income - (expense + totalSavings + debt);

  updateChart([income, expense, totalSavings, debt, remaining], {
    dca: dcaInvested,
    savings: savingsAmount,
    installment: installmentPaid
  });
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
                  ` • เงินผ่อน: ${detailedData.installment.toLocaleString()} บาท`
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

const statusMap = {
  "ดีมาก": { color: "circle-green", icon: "fa-shield-heart" },
  "พอใช้": { color: "circle-yellow", icon: "fa-face-meh" },
  "ต้องปรับปรุง": { color: "circle-red", icon: "fa-triangle-exclamation" },
  "ไม่มีหนี้": { color: "circle-green", icon: "fa-shield-heart" },
  "ผ่อนตรงเวลา": { color: "circle-yellow", icon: "fa-face-meh" },
  "มีหนี้ค้างชำระ": { color: "circle-red", icon: "fa-triangle-exclamation" }
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
