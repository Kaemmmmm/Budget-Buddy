import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ฟังก์ชันสำหรับดึงข้อมูลจริงและประเมินสถานะ
async function loadAssessmentData() {
  const userId = auth.currentUser.uid;
  const userDocRef = doc(db, "goal", userId);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) {
    console.error("ไม่พบข้อมูลของผู้ใช้");
    return;
  }
  const data = docSnap.data();
  
  const income   = parseFloat(data.income)   || 0;
  const expense  = parseFloat(data.expense)  || 0;
  const debt     = parseFloat(data.debt)     || 0;

  const dcaInvested          = parseFloat(data.dca?.invested) || 0;
  const assetPrice           = parseFloat(data.installment?.assetPrice) || 0;
  const installmentDuration  = parseFloat(data.installment?.installmentDuration) || 1; // ป้องกันหารด้วย 0
  const paidMonths           = parseFloat(data.installment?.paidMonths) || 0;
  const savingsAmount        = parseFloat(data.savings?.amount) || 0;
  const emergencyFund        = parseFloat(data.emergencyFund?.amount) || 0;

  // ถ้ามีข้อมูลเงินฉุกเฉินเป็นจำนวนเดือน ให้ใช้ แต่ถ้าไม่มีให้เป็น 0
  const emergencyMonth       = parseFloat(data.emergencyMonth) || 0;

  const totalInstallmentPaid = paidMonths * (assetPrice / (installmentDuration * 12));
  const savings              = dcaInvested + totalInstallmentPaid + savingsAmount + emergencyFund;
  const netAssets            = income - expense - debt;
  const paidStatus           = parseFloat(data.xxx);
  const monthsCovered        = expense > 0 ? (emergencyFund / expense) : 0;
  

  // ประเมิน "สัดส่วนการออม (Good Liquidity)"
  //done
  if (savings >= 0.10 * income) {
    updateStatus(
      "saving-circle", "saving-text", "saving-detail",
      "circle-green",
      "ดีมาก",
      "การออม ≥ 10% ของรายได้ แสดงถึงสภาพคล่องและวินัยการออมที่ดี"
    );
  } else if (savings >= 0.05 * income && savings < 0.10 * income) {
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
  //done
  if (netAssets >= 0.5 * income) {
    updateStatus(
      "wealth-circle", "wealth-text", "wealth-detail",
      "circle-green",
      "ดีมาก",
      "สินทรัพย์สุทธิ ≥ 50% ของรายได้ต่อเดือน สะท้อนความมั่งคั่งสูง"
    );
  } else if (netAssets >= 0.20 * income && netAssets < 0.5 * income) {
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
   //not yet
   if (debt = 0) {
    updateStatus(
      "debt-circle", "debt-text", "debt-detail",
      "circle-green",
      "ไม่มีหนี้",
      "ไม่มีหนี้คงค้าง ถือเป็นสถานะการเงินที่ดี"
    );
    } else if (debt > 0) {
      if (paidStatus == "paid") {
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
}

  // ประเมิน "เงินฉุกเฉิน (Emergency Funds)"
  //done
  if (monthsCovered >= 6) {
    updateStatus(
      "emergency-circle", 
      "emergency-text", 
      "emergency-detail",
      "circle-green",
      "ดีมาก",
      "เงินฉุกเฉินครอบคลุมมากกว่า 6 เดือน แสดงถึงความมั่นคงทางการเงินสูง"
    );
  } else if (monthsCovered >= 3) {
    updateStatus(
      "emergency-circle", 
      "emergency-text", 
      "emergency-detail",
      "circle-yellow",
      "พอใช้",
      "เงินฉุกเฉินครอบคลุม 3-6 เดือน ยังอยู่ในเกณฑ์ที่พอใช้ได้"
    );
  } else {
    updateStatus(
      "emergency-circle", 
      "emergency-text", 
      "emergency-detail",
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
    loadAssessmentData();
  } else {
    console.log("No user logged in in assess.js");
  }
});

function updateStatus(circleId, textId, detailId, colorClass, titleText, detailText) {
  const circleEl = document.getElementById(circleId);
  const textEl   = document.getElementById(textId);
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

  textEl.textContent   = titleText;
  detailEl.textContent = detailText;
}