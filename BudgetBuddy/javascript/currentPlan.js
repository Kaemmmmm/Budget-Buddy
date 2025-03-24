import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ตัวแปรเก็บข้อมูลที่ใช้เมื่อคลิก "ยืนยัน"
let cachedSummaryText = "";
let cachedFinancialData = {};

export { saveUserPlan, cachedSummaryText, cachedFinancialData };


// ฟังก์ชันดึงข้อมูลและประเมินสุขภาพทางการเงิน
async function loadAssessmentData() {
  const userId = auth.currentUser.uid;
  const DocRef = doc(db, "goal", userId);
  const docSnap = await getDoc(DocRef);

  if (!docSnap.exists()) {
    console.error("ไม่พบข้อมูล goal ของผู้ใช้ กรุณากำหนด goal ก่อน");
    return;
  }

  const data = docSnap.data();

  const income = parseFloat(data.income) || 0;
  const expense = parseFloat(data.expense) || 0;
  const debt = parseFloat(data.debt) || 0;
  const dcaInvested = parseFloat(data.dca?.invested) || 0;
  const assetPrice = parseFloat(data.installment?.assetPrice) || 0;
  const installmentDuration = parseFloat(data.installment?.installmentDuration) || 1;
  const paidMonths = parseFloat(data.installment?.paidMonths) || 0;
  const savingsAmount = parseFloat(data.savings?.amount) || 0;
  const emergencyFund = parseFloat(data.emergencyFund?.amount) || 0;

  const totalInstallmentPaid = paidMonths * (assetPrice / (installmentDuration * 12));
  const savings = dcaInvested + totalInstallmentPaid + savingsAmount + emergencyFund;
  const netAssets = income - expense - debt;
  const monthsCovered = expense > 0 ? (emergencyFund / expense) : 0;

  let savingsStatus, wealthStatus, emergencyStatus;

  // การออม
  if (savings >= 0.10 * income) {
    updateStatus("saving-circle", "saving-text", "saving-detail", "circle-green", "ดีมาก", "การออม ≥ 10% ของรายได้");
    savingsStatus = "ดีมาก";
  } else if (savings >= 0.05 * income) {
    updateStatus("saving-circle", "saving-text", "saving-detail", "circle-yellow", "พอใช้", "การออม 5-9% ของรายได้");
    savingsStatus = "พอใช้";
  } else {
    updateStatus("saving-circle", "saving-text", "saving-detail", "circle-red", "ต้องปรับปรุง", "การออม < 5% ของรายได้");
    savingsStatus = "ต้องปรับปรุง";
  }

  // ความมั่งคั่ง
  if (netAssets >= 0.50 * income) {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail", "circle-green", "ดีมาก", "สินทรัพย์สุทธิ ≥ 50% ของรายได้");
    wealthStatus = "ดีมาก";
  } else if (netAssets >= 0.20 * income) {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail", "circle-yellow", "พอใช้", "สินทรัพย์สุทธิ 20-49% ของรายได้");
    wealthStatus = "พอใช้";
  } else {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail", "circle-red", "ต้องปรับปรุง", "สินทรัพย์สุทธิ < 20% ของรายได้");
    wealthStatus = "ต้องปรับปรุง";
  }

  // เงินฉุกเฉิน
  if (monthsCovered >= 6) {
    updateStatus("emergency-circle", "emergency-text", "emergency-detail", "circle-green", "ดีมาก", "เงินฉุกเฉินครอบคลุม > 6 เดือน");
    emergencyStatus = "ดีมาก";
  } else if (monthsCovered >= 3) {
    updateStatus("emergency-circle", "emergency-text", "emergency-detail", "circle-yellow", "พอใช้", "เงินฉุกเฉินครอบคลุม 3-6 เดือน");
    emergencyStatus = "พอใช้";
  } else {
    updateStatus("emergency-circle", "emergency-text", "emergency-detail", "circle-red", "ต้องปรับปรุง", "เงินฉุกเฉินครอบคลุมน้อยกว่า 3 เดือน");
    emergencyStatus = "ต้องปรับปรุง";
  }

  displayPlanSummary({ savingsStatus, wealthStatus, emergencyStatus, income, expense, debt, dcaInvested, savingsAmount, emergencyFund, savings, netAssets, monthsCovered });
}

// ฟังก์ชันอัปเดตสถานะใน UI
function updateStatus(circleId, textId, detailId, colorClass, titleText, detailText) {
  const circleEl = document.getElementById(circleId);
  const textEl = document.getElementById(textId);
  const detailEl = document.getElementById(detailId);
  if (!circleEl || !textEl || !detailEl) return;

  circleEl.classList.remove("circle-green", "circle-yellow", "circle-red");
  circleEl.classList.add(colorClass);

  if (colorClass === "circle-green") {
    circleEl.innerHTML = '<i class="fa-solid fa-shield-heart"></i>';
  } else if (colorClass === "circle-yellow") {
    circleEl.innerHTML = '<i class="fa-solid fa-face-meh"></i>';
  } else {
    circleEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
  }

  textEl.textContent = titleText;
  detailEl.textContent = detailText;
}

// ฟังก์ชันแสดงสรุปแผน (ยังไม่บันทึก)
function displayPlanSummary({ savingsStatus, wealthStatus, emergencyStatus, income, expense, debt, dcaInvested, savingsAmount, emergencyFund, savings, netAssets, monthsCovered }) {
  const planSummaryEl = document.getElementById("plan-summary");
  if (!planSummaryEl) return;

  let recommendation = "";

  if (savingsStatus === "ดีมาก") {
    recommendation += "ยอดเงินออมของคุณอยู่ในระดับดีมาก คุณสามารถสานต่อแนวทางการออมที่มีวินัยอยู่แล้ว. ";
  } else if (savingsStatus === "พอใช้") {
    recommendation += "การออมของคุณอยู่ในระดับพอใช้ แต่ควรตั้งเป้าเพิ่มการออมเพื่อความมั่นคงในอนาคต. ";
  } else {
    recommendation += "การออมของคุณต่ำเกินไป ควรลดรายจ่ายและวางแผนเพิ่มการออมให้มากขึ้น. ";
  }

  if (wealthStatus === "ดีมาก") {
    recommendation += "สินทรัพย์ของคุณอยู่ในระดับดี แสดงถึงความสามารถในการบริหารการเงินที่ยอดเยี่ยม. ";
  } else if (wealthStatus === "พอใช้") {
    recommendation += "สินทรัพย์ของคุณอยู่ในระดับปานกลาง ควรพิจารณาการลงทุนเพิ่มเติมเพื่อเพิ่มมูลค่าสินทรัพย์. ";
  } else {
    recommendation += "สถานะสินทรัพย์ของคุณยังควรปรับปรุง ควรมีแผนการลงทุนที่เหมาะสมและการจัดสรรสินทรัพย์ใหม่. ";
  }

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

  // เก็บข้อมูลไว้ก่อน ยังไม่บันทึก
  cachedSummaryText = summaryText;
  cachedFinancialData = { income, expense, debt, dcaInvested, savingsAmount, emergencyFund };

  planSummaryEl.textContent = summaryText;
}

// ฟังก์ชันบันทึกแผนการเงิน (เมื่อคลิกปุ่มยืนยัน)
async function saveUserPlan(planSummaryHTML, financialData) {
  console.log("🔁 Running saveUserPlan()");

  const user = auth.currentUser;
  if (!user) {
    console.error("🚫 ผู้ใช้ยังไม่ได้ล็อกอิน");
    return;
  }

  console.log("👤 Logged-in user ID:", user.uid);
  console.log("📝 Summary to save:", planSummaryHTML);
  console.log("💰 Financial data:", financialData);

  const goalDocRef = doc(db, "goal", user.uid);
  const goalSnap = await getDoc(goalDocRef);
  if (!goalSnap.exists()) {
    console.error("🚫 ไม่พบข้อมูล goal ของผู้ใช้ กรุณากำหนด goal ก่อนสร้าง plan");
    return;
  }

  const planDocRef = doc(db, "plan", user.uid);
  console.log("📄 Plan document path:", planDocRef.path);

  try {
    const currentPlanSnap = await getDoc(planDocRef);

    if (currentPlanSnap.exists()) {
      const oldPlanData = currentPlanSnap.data();

      if (oldPlanData.plan !== planSummaryHTML) {
        const historyCollectionRef = collection(planDocRef, "planHistory");
        console.log("📦 Archiving previous plan to planHistory");
        await addDoc(historyCollectionRef, {
          ...oldPlanData,
          archivedAt: new Date()
        });
      } else {
        console.log("📌 Plan hasn't changed — skipping archive");
      }
    } else {
      console.log("🆕 Creating new plan for the user");
    }

    await setDoc(planDocRef, {
      plan: planSummaryHTML,
      planUpdatedAt: new Date(),
      ...financialData
    }, { merge: true });

    console.log("✅ แผนการเงินถูกบันทึกลง Firestore แล้ว");
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการบันทึกแผนการเงิน:", error);
    throw error;
  }
}



// ตรวจสอบผู้ใช้
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadAssessmentData();
  } else {
    console.log("ไม่มีผู้ใช้ล็อกอิน");
  }
});


