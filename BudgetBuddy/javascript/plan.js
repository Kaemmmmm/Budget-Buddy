import { db, auth } from "../javascript/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const urlParams = new URLSearchParams(window.location.search);
const type = urlParams.get("type");
const id = urlParams.get("id");

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
  detailEl.textContent = detailText;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  try {
    let planRef;
    if (type === "current") {
      planRef = doc(db, "plan", user.uid);
    } else if (type === "history" && id) {
      planRef = doc(db, "plan", user.uid, "planHistory", id);
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
    document.getElementById("plan-title").textContent = type === "current" ? "แผนการเงินปัจจุบัน" : "แผนการเงินย้อนหลัง";

    const { income, expense, dcaInvested, savingsAmount, emergencyFund } = data;
    const savings = (dcaInvested || 0) + (savingsAmount || 0) + (emergencyFund || 0);
    const netAssets = income - expense - (data.debt || 0);
    const monthsCovered = expense > 0 ? emergencyFund / expense : 0;

    const savingsStatus = savings >= 0.10 * income ? "ดีมาก" : savings >= 0.05 * income ? "พอใช้" : "ต้องปรับปรุง";
    const wealthStatus = netAssets >= 0.50 * income ? "ดีมาก" : netAssets >= 0.20 * income ? "พอใช้" : "ต้องปรับปรุง";
    const emergencyStatus = monthsCovered >= 6 ? "ดีมาก" : monthsCovered >= 3 ? "พอใช้" : "ต้องปรับปรุง";

    const debtStatus = data.debtStatus || "ไม่มีหนี้"; // 👈 ดึงจาก document โดยตรง
    let debtDetailText;
    if (debtStatus === "ไม่มีหนี้") {
      debtDetailText = "ไม่มีหนี้คงค้าง ถือเป็นสถานะการเงินที่ดี";
    } else if (debtStatus === "ผ่อนตรงเวลา") {
      debtDetailText = "มีหนี้แต่ผ่อนชำระตรงเวลา อยู่ในเกณฑ์ที่จัดการได้";
    } else {
      debtDetailText = "มีหนี้ที่ค้างชำระหรือจ่ายล่าช้า ควรเร่งปรับแผนชำระหนี้";
    }

    updateStatus("saving-circle", "saving-text", "saving-detail", savingsStatus, `การออม ${(savings / income * 100).toFixed(1)}% ของรายได้`);
    updateStatus("wealth-circle", "wealth-text", "wealth-detail", wealthStatus, `สินทรัพย์สุทธิ ${(netAssets / income * 100).toFixed(1)}% ของรายได้`);
    updateStatus("emergency-circle", "emergency-text", "emergency-detail", emergencyStatus, `เงินฉุกเฉินครอบคลุม ${monthsCovered.toFixed(1)} เดือน`);
    updateStatus("debt-circle", "debt-text", "debt-detail", debtStatus, debtDetailText); // ✅ ใช้ค่าจาก plan โดยตรง

    const summaryText = `
       ${data.plan || "ไม่มีคำแนะนำ"}
    `;
    document.getElementById("plan-summary").textContent = summaryText;

  } catch (err) {
    console.error(err);
    document.getElementById("plan-title").textContent = "เกิดข้อผิดพลาดในการโหลดแผน";
  }
});
