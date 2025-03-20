// plan.js
import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ฟังก์ชันดึงข้อมูลและประเมินสุขภาพทางการเงิน
async function loadAssessmentData() {
  const userId = auth.currentUser.uid;
  const userDocRef = doc(db, "goal", userId);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) {
    console.error("ไม่พบข้อมูลของผู้ใช้");
    return;
  }
  const data = docSnap.data();

  // ดึงข้อมูลจากฐานข้อมูล
  const income = parseFloat(data.income) || 0;
  const expense = parseFloat(data.expense) || 0;
  const debt = parseFloat(data.debt) || 0;
  const dcaInvested = parseFloat(data.dca?.invested) || 0;
  const assetPrice = parseFloat(data.installment?.assetPrice) || 0;
  const installmentDuration = parseFloat(data.installment?.installmentDuration) || 1;
  const paidMonths = parseFloat(data.installment?.paidMonths) || 0;
  const savingsAmount = parseFloat(data.savings?.amount) || 0;
  const emergencyFund = parseFloat(data.emergencyFund?.amount) || 0;

  // คำนวณค่า
  const totalInstallmentPaid = paidMonths * (assetPrice / (installmentDuration * 12));
  const savings = dcaInvested + totalInstallmentPaid + savingsAmount + emergencyFund;
  const netAssets = income - expense - debt;
  const monthsCovered = expense > 0 ? (emergencyFund / expense) : 0;

  // ตัวแปรสถานะ
  let savingsStatus, wealthStatus, emergencyStatus;
  
  // ประเมินการออม
  if (savings >= 0.10 * income) {
    updateStatus("saving-circle", "saving-text", "saving-detail",
      "circle-green", "ดีมาก", "การออม ≥ 10% ของรายได้");
    savingsStatus = "ดีมาก";
  } else if (savings >= 0.05 * income) {
    updateStatus("saving-circle", "saving-text", "saving-detail",
      "circle-yellow", "พอใช้", "การออม 5-9% ของรายได้");
    savingsStatus = "พอใช้";
  } else {
    updateStatus("saving-circle", "saving-text", "saving-detail",
      "circle-red", "ต้องปรับปรุง", "การออม < 5% ของรายได้");
    savingsStatus = "ต้องปรับปรุง";
  }
  
  // ประเมินความมั่งคั่ง
  if (netAssets >= 0.50 * income) {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail",
      "circle-green", "ดีมาก", "สินทรัพย์สุทธิ ≥ 50% ของรายได้");
    wealthStatus = "ดีมาก";
  } else if (netAssets >= 0.20 * income) {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail",
      "circle-yellow", "พอใช้", "สินทรัพย์สุทธิ 20-49% ของรายได้");
    wealthStatus = "พอใช้";
  } else {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail",
      "circle-red", "ต้องปรับปรุง", "สินทรัพย์สุทธิ < 20% ของรายได้");
    wealthStatus = "ต้องปรับปรุง";
  }
  
  // ประเมินเงินฉุกเฉิน
  if (monthsCovered > 6) {
    updateStatus("emergency-circle", "emergency-text", "emergency-detail",
      "circle-green", "ดีมาก", "เงินฉุกเฉินครอบคลุม > 6 เดือน");
    emergencyStatus = "ดีมาก";
  } else if (monthsCovered >= 3) {
    updateStatus("emergency-circle", "emergency-text", "emergency-detail",
      "circle-yellow", "พอใช้", "เงินฉุกเฉินครอบคลุม 3-6 เดือน");
    emergencyStatus = "พอใช้";
  } else {
    updateStatus("emergency-circle", "emergency-text", "emergency-detail",
      "circle-red", "ต้องปรับปรุง", "เงินฉุกเฉินครอบคลุมน้อยกว่า 3 เดือน");
    emergencyStatus = "ต้องปรับปรุง";
  }
  
  // เรียกใช้ฟังก์ชันแสดงสรุปแผนการเงินและคำแนะนำ
  displayPlanSummary({ savingsStatus, wealthStatus, emergencyStatus, income, expense, savings, netAssets, monthsCovered });
}

// ฟังก์ชันอัปเดตสถานะใน UI
function updateStatus(circleId, textId, detailId, colorClass, titleText, detailText) {
  const circleEl = document.getElementById(circleId);
  const textEl = document.getElementById(textId);
  const detailEl = document.getElementById(detailId);
  if (!circleEl || !textEl || !detailEl) {
    console.error("ไม่พบ element ใน UI:", circleId, textId, detailId);
    return;
  }
  circleEl.classList.remove("circle-green", "circle-yellow", "circle-red");
  circleEl.classList.add(colorClass);
  
  if (colorClass === "circle-green") {
    circleEl.innerHTML = '<i class="fa-solid fa-shield-heart"></i>';
  } else if (colorClass === "circle-yellow") {
    circleEl.innerHTML = '<i class="fa-solid fa-face-meh"></i>';
  } else if (colorClass === "circle-red") {
    circleEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
  }
  
  textEl.textContent = titleText;
  detailEl.textContent = detailText;
}

// ฟังก์ชันแสดงสรุปแผนการเงินและคำแนะนำ
function displayPlanSummary({ savingsStatus, wealthStatus, emergencyStatus, income, expense, savings, netAssets, monthsCovered }) {
  const planSummaryEl = document.getElementById("plan-summary");
  if (!planSummaryEl) return;
  
  let recommendation = "";
  
  // คำแนะนำสำหรับการออม
  if (savingsStatus === "ดีมาก") {
    recommendation += "ยอดเงินออมของคุณอยู่ในระดับดีมาก คุณสามารถสานต่อแนวทางการออมที่มีวินัยอยู่แล้ว. ";
  } else if (savingsStatus === "พอใช้") {
    recommendation += "การออมของคุณอยู่ในระดับพอใช้ แต่ควรตั้งเป้าเพิ่มการออมเพื่อความมั่นคงในอนาคต. ";
  } else {
    recommendation += "การออมของคุณต่ำเกินไป ควรลดรายจ่ายและวางแผนเพิ่มการออมให้มากขึ้น. ";
  }
  
  // คำแนะนำสำหรับความมั่งคั่ง
  if (wealthStatus === "ดีมาก") {
    recommendation += "สินทรัพย์ของคุณอยู่ในระดับดี แสดงถึงความสามารถในการบริหารการเงินที่ยอดเยี่ยม. ";
  } else if (wealthStatus === "พอใช้") {
    recommendation += "สินทรัพย์ของคุณอยู่ในระดับปานกลาง ควรพิจารณาการลงทุนเพิ่มเติมเพื่อเพิ่มมูลค่าสินทรัพย์. ";
  } else {
    recommendation += "สถานะสินทรัพย์ของคุณยังควรปรับปรุง ควรมีแผนการลงทุนที่เหมาะสมและการจัดสรรสินทรัพย์ใหม่. ";
  }
  
  // คำแนะนำสำหรับเงินฉุกเฉิน
  if (emergencyStatus === "ดีมาก") {
    recommendation += "เงินฉุกเฉินของคุณเพียงพอสำหรับสถานการณ์ฉุกเฉิน.";
  } else if (emergencyStatus === "พอใช้") {
    recommendation += "เงินฉุกเฉินของคุณอยู่ในระดับพอใช้ แต่ควรตั้งเป้าเพิ่มขึ้นเพื่อความปลอดภัยในยามฉุกเฉิน.";
  } else {
    recommendation += "เงินฉุกเฉินของคุณไม่เพียงพอ ควรเพิ่มการสะสมเงินฉุกเฉินอย่างน้อย 3 เดือนของรายจ่าย.";
  }
  
  const summaryText = `
    สรุปแผนการเงิน:
    - การออม: ${savingsStatus}
    - ความมั่งคั่ง: ${wealthStatus}
    - เงินฉุกเฉินครอบคลุม: ${monthsCovered.toFixed(1)} เดือน
    
    คำแนะนำ: ${recommendation}
  `;
  
  planSummaryEl.textContent = summaryText;
}

// ตรวจสอบผู้ใช้และเรียกใช้ฟังก์ชัน loadAssessmentData
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadAssessmentData();
  } else {
    console.log("ไม่มีผู้ใช้ล็อกอิน");
  }
});
