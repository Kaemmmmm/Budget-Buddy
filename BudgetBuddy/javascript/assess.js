import { fetchFinancialData, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// ฟังก์ชันสำหรับดึงข้อมูลจริงและประเมินสถานะ
async function loadAssessmentData() {
  const userId = auth.currentUser.uid;
  const data = await fetchFinancialData(userId);
  const savingPercent = (data.saving / data.income) * 100;
  const netAssetsPercent = (data.netAssets / data.income) * 100;
  const debtStatus = data.debtStatus; // เช่น "managed", "no-debt", "outstanding"
  const emergencyMonth = data.emergencyMonth; // จำนวนเดือนที่เงินฉุกเฉินครอบคลุม

  // ประเมิน "สัดส่วนการออม (Good Liquidity)"
  if (savingPercent >= 10) {
    updateStatus(
      "saving-circle", "saving-text", "saving-detail",
      "circle-green",
      "ดีมาก",
      "การออม ≥ 10% ของรายได้ แสดงถึงสภาพคล่องและวินัยการออมที่ดี"
    );
  } else if (savingPercent >= 5) {
    updateStatus(
      "saving-circle", "saving-text", "saving-detail",
      "circle-yellow",
      "พอใช้",
      "การออม 5-9% ของรายได้ ยังพอใช้ได้ แต่ควรเพิ่มขึ้นเพื่อความมั่นคง"
    );
  } else {
    updateStatus(
      "saving-circle", "saving-text", "saving-detail",
      "circle-red",
      "ต้องปรับปรุง",
      "การออม < 5% ของรายได้ ค่อนข้างน้อย ควรเพิ่มการออม"
    );
  }

  // ประเมิน "ความมั่งคั่ง (Wealth Assessment)"
  if (netAssetsPercent >= 50) {
    updateStatus(
      "wealth-circle", "wealth-text", "wealth-detail",
      "circle-green",
      "ดีมาก",
      "สินทรัพย์สุทธิ ≥ 50% ของรายได้ต่อเดือน สะท้อนความมั่งคั่งสูง"
    );
  } else if (netAssetsPercent >= 20) {
    updateStatus(
      "wealth-circle", "wealth-text", "wealth-detail",
      "circle-yellow",
      "พอใช้",
      "สินทรัพย์สุทธิ 20-49% ของรายได้ต่อเดือน ควรเพิ่มสินทรัพย์หรือปรับลดหนี้"
    );
  } else {
    updateStatus(
      "wealth-circle", "wealth-text", "wealth-detail",
      "circle-red",
      "ต้องปรับปรุง",
      "สินทรัพย์สุทธิ < 20% ของรายได้ต่อเดือน เสี่ยงต่อปัญหาการเงินในอนาคต"
    );
  }

  // ประเมิน "สถานะหนี้ (Debt-Free Status)"
  if (debtStatus === "no-debt") {
    updateStatus(
      "debt-circle", "debt-text", "debt-detail",
      "circle-green",
      "ไม่มีหนี้",
      "ไม่มีหนี้คงค้าง ถือเป็นสถานะการเงินที่ดี"
    );
  } else if (debtStatus === "managed") {
    updateStatus(
      "debt-circle", "debt-text", "debt-detail",
      "circle-yellow",
      "ผ่อนตรงเวลา",
      "มีหนี้แต่ผ่อนชำระตรงเวลา อยู่ในเกณฑ์ที่จัดการได้"
    );
  } else {
    updateStatus(
      "debt-circle", "debt-text", "debt-detail",
      "circle-red",
      "มีหนี้ค้างชำระ",
      "มีหนี้ที่ผิดนัดหรือจ่ายล่าช้า ควรเร่งปรับแผนชำระหนี้"
    );
  }

  // ประเมิน "เงินฉุกเฉิน (Emergency Funds)"
  if (emergencyMonth > 6) {
    updateStatus(
      "emergency-circle", "emergency-text", "emergency-detail",
      "circle-green",
      "ดีมาก",
      "เงินฉุกเฉินครอบคลุม > 6 เดือน มีความปลอดภัยทางการเงินสูง"
    );
  } else if (emergencyMonth >= 3) {
    updateStatus(
      "emergency-circle", "emergency-text", "emergency-detail",
      "circle-yellow",
      "พอใช้",
      "เงินฉุกเฉินครอบคลุม 3-6 เดือน ยังอยู่ในเกณฑ์พื้นฐาน"
    );
  } else {
    updateStatus(
      "emergency-circle", "emergency-text", "emergency-detail",
      "circle-red",
      "ต้องปรับปรุง",
      "เงินฉุกเฉินครอบคลุมน้อยกว่า 3 เดือน ไม่เพียงพอต่อเหตุฉุกเฉิน"
    );
  }
} 

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User is logged in in assess.js:", user.uid);
    // เมื่อยืนยันว่าผู้ใช้ล็อกอินแล้ว ให้เรียก loadAssessmentData
    loadAssessmentData(user.uid);
  } else {
    console.log("No user logged in in assess.js");
  }
});

function updateStatus(circleId, textId, detailId, colorClass, titleText, detailText) {
  const circleEl = document.getElementById(circleId);
  const textEl   = document.getElementById(textId);
  const detailEl = document.getElementById(detailId);

  circleEl.classList.remove("circle-green", "circle-yellow", "circle-red");
  circleEl.classList.add(colorClass);

  textEl.textContent   = titleText;
  detailEl.textContent = detailText;
}


  



