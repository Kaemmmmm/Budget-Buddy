import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

let cachedSummaryText = "";
let cachedFinancialData = {};

export { saveUserPlan, cachedSummaryText, cachedFinancialData };

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

  const transactionsRef = collection(db, "budget", userId, "transaction");
  const snapshot = await getDocs(transactionsRef);

  let hasLatePayment = false;
  let hasUnpaidDebt = false;
  let totalDebtTransactions = 0;

  snapshot.forEach((transactionDoc) => {
    const transaction = transactionDoc.data();

    if (["debt", "loan", "installment", "DCA"].includes(transaction.type)) {
      if (transaction.paid === false) hasUnpaidDebt = true;
      if (transaction.onTime === false) hasLatePayment = true;
    }

    if (!["dca", "saving"].includes(transaction.type.toLowerCase())) {
      totalDebtTransactions += 1;
    }
  });

  let savingsStatus, wealthStatus, emergencyStatus, debtStatus;

  // Saving
  if (savings >= 0.10 * income) {
    updateStatus("saving-circle", "saving-text", "saving-detail", "circle-green", "ดีมาก", "การออม ≥ 10% ของรายได้");
    savingsStatus = "ดีมาก เนื่องจากการออมของคุณมีมากกว่า 10% ของรายได้ต่อเดือน";
  } else if (savings >= 0.05 * income && savings < 0.10 * income) {
    updateStatus("saving-circle", "saving-text", "saving-detail", "circle-yellow", "พอใช้", "การออม 5-9% ของรายได้");
    savingsStatus = "พอใช้ เนื่องจากการออมของคุณครอบคลุม 5-9% ของรายได้ต่อเดือน";
  } else {
    updateStatus("saving-circle", "saving-text", "saving-detail", "circle-red", "ต้องปรับปรุง", "การออม < 5% ของรายได้");
    savingsStatus = "ต้องปรับปรุง เนื่องจากการออมของคุณน้อยกว่า 5% ของรายได้ต่อเดือน";
  }

  // Wealth
  if (netAssets >= 0.50 * income) {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail", "circle-green", "ดีมาก", "สินทรัพย์สุทธิ ≥ 50% ของรายได้");
    wealthStatus = "ดีมาก เนื่องจากสินทรัพย์ของคุณหลังจากหักรายจ่ายและหนี้คงเหลือมากกว่าหรือเท่ากับ 50% ของรายได้ต่อเดือน";
  } else if (netAssets >= 0.20 * income && netAssets < 0.50 * income) {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail", "circle-yellow", "พอใช้", "สินทรัพย์สุทธิ 20-49% ของรายได้");
    wealthStatus = "พอใช้ เนื่องจากสินทรัพย์ของคุณหลังจากหักรายจ่ายและหนี้มีคงเหลือ 20-49% ของรายได้ต่อเดือน";
  } else {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail", "circle-red", "ต้องปรับปรุง", "สินทรัพย์สุทธิ < 20% ของรายได้");
    wealthStatus = "ต้องปรับปรุง เนื่องจากสินทรัพย์ของคุณหลังจากหักรายจ่ายและหนี้มีคงเหลือน้อยกว่า 20% ของรายได้ต่อเดือน";
  }

  // Debt
  if (totalDebtTransactions <= 0) {
    debtStatus = "ไม่มีหนี้ เนื่องจากไม่มีค่าใช้จ่ายที่ต้องชำระ";
  } else if (!hasUnpaidDebt && !hasLatePayment) {
    debtStatus = "ผ่อนตรงเวลา เนื่องจากคุณมีหนี้แต่สามารถชำระได้ตรงเวลา";
  } else {
    debtStatus = "มีหนี้ค้างชำระ เนื่องจากคุณมีหนี้และไม่มีความสามารถในการชำระหนี้ได้ตรงเวลา";
  }

  if (debtStatus === "ไม่มีหนี้") {
    updateStatus("debt-circle", "debt-text", "debt-detail", "circle-green", "ไม่มีหนี้", "ไม่มีหนี้คงค้าง ถือเป็นสถานะการเงินที่ดี");
  } else if (debtStatus === "ผ่อนตรงเวลา") {
    updateStatus("debt-circle", "debt-text", "debt-detail", "circle-yellow", "ผ่อนตรงเวลา", "มีหนี้แต่ผ่อนชำระตรงเวลา อยู่ในเกณฑ์ที่จัดการได้");
  } else {
    updateStatus("debt-circle", "debt-text", "debt-detail", "circle-red", "มีหนี้ค้างชำระ", "มีหนี้ที่ค้างชำระหรือจ่ายล่าช้า ควรเร่งปรับแผนชำระหนี้");
  }


  // Emergency
  if (monthsCovered >= 6) {
    updateStatus("emergency-circle", "emergency-text", "emergency-detail", "circle-green", "ดีมาก", "เงินฉุกเฉินครอบคลุม > 6 เดือน");
    emergencyStatus = "ดีมาก เนื่องจากคุณมีเงินสำรองครอบคลุมมากกว่า 6 เดือนของรายได้ต่อเดือน ";
  } else if (monthsCovered >= 3 && monthsCovered < 6) {
    updateStatus("emergency-circle", "emergency-text", "emergency-detail", "circle-yellow", "พอใช้", "เงินฉุกเฉินครอบคลุม 3-6 เดือน");
    emergencyStatus = "พอใช้ เนื่องจากคุณมีเงินสำรองครอบคลุมอยู่ที่ 3-6 เดือนของรายได้ต่อเดือน";
  } else {
    updateStatus("emergency-circle", "emergency-text", "emergency-detail", "circle-red", "ต้องปรับปรุง", "เงินฉุกเฉินครอบคลุมน้อยกว่า 3 เดือน");
    emergencyStatus = "ต้องปรับปรุง เนื่องจากคุณมีเงินสำรองครอบคลุมน้อยกว่า 3 เดือนของรายได้ต่อเดือน";
  }

  displayPlanSummary({ 
    savingsStatus, 
    wealthStatus, 
    emergencyStatus, 
    debtStatus, 
    income, 
    expense, 
    debt, 
    savings, 
    monthsCovered,
    dcaInvested,
    savingsAmount,
    emergencyFund,
    netAssets
  });
  
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    loadAssessmentData();
  }
});


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
function displayPlanSummary({ savingsStatus, wealthStatus, emergencyStatus, debtStatus, income, expense, debt, savings, monthsCovered, dcaInvested, savingsAmount, emergencyFund, netAssets }) {
  const planSummaryEl = document.getElementById("plan-summary");
  if (!planSummaryEl) return;

  let recommendation = "";

  recommendation += savingsStatus === "ดีมาก" ? "การออมของคุณอยู่ในระดับดีมาก รักษาวินัยในการออมเงินให้คงที่. " :
    savingsStatus === "พอใช้" ? "การออมของคุณอยู่ในระดับพอใช้ ควรปรับปรุงอัตราการออมเพิ่มขึ้นเล็กน้อย. " :
    "การออมของคุณต่ำเกินไป ปรับปรุงอัตราการออมอย่างเร่งด่วน. ";

  recommendation += wealthStatus === "ดีมาก" ? "สินทรัพย์สุทธิของคุณอยู่ในระดับดีมาก รักษาวินัยการใช้จ่ายของคุณให้คงที่. " :
    wealthStatus === "พอใช้" ? "สินทรัพย์ของคุณอยู่ในระดับปานกลาง ควรปรับลดค่าใช้จ่ายที่ไม่จำเป็นหรือเพิ่มรายรับ. " :
    "สินทรัพย์ของคุณคงเหลือน้อยเกินไป ปรับลดค่าใช้จ่ายที่ไม่จำเป็นหรือเพิ่มรายรับ อาจปรึกษาผู้เชี่ยวชาญเพิ่มหากสถานะทางการเงินเปราะบาง ";

  recommendation += debtStatus === "ไม่มีหนี้" ? "คุณไม่มีหนี้ที่ต้องกังวล รักษาวินัยการใช้จ่ายของคุณไม่ให้เป็นหนี้ต่อไป. " :
    debtStatus === "ผ่อนตรงเวลา" ? "คุณมีหนี้แต่บริหารได้ดี ควรปรับลดภาระหนี้ เพื่อความมั่นคงทางการเงินมากยิ่งขึ้น และลดค่าใช้จ่ายในระยะยาว. " :
    "คุณมีหนี้ค้างชำระ ควรจัดการแผนชำระหนี้อย่างจริงจังและกำหนดการจ่ายให้ตรงเวลา. ";

  recommendation += emergencyStatus === "ดีมาก" ? "เงินฉุกเฉินของคุณเพียงพอสำหรับสถานการณ์ฉุกเฉิน รักษาวินัยการเก็บเงินสำรองฉุกเฉิน และทบทวนค่าใช้จ่ายเป็นประจำเพื่อปรับยอดเงินสำรองฉุกเฉินให้เหมาะสม. " :
    emergencyStatus === "พอใช้" ? "เงินฉุกเฉินของคุณพอใช้ได้ ปรับลดค่าใช้จ่ายบางอย่าง เพื่อนำมาเก็บเพิ่มในเงินสำรองฉุกเฉิน. " :
    "เงินฉุกเฉินของคุณน้อยเกินไป ปรับลดค่าใช้จ่ายที่ไม่จำเป็นอย่างเร่งด่วนและหารายได้เสริม เพื่อนำมาเก็บเพิ่มในเงินสำรองฉุกเฉิน. ";

  const summaryText = `
    - การออม: ${savingsStatus}
    - ความมั่งคั่ง: ${wealthStatus}
    - สถานะหนี้: ${debtStatus}
    - เงินฉุกเฉินครอบคลุม: ${monthsCovered.toFixed(1)} เดือน, ${emergencyStatus}

    คำแนะนำ: ${recommendation}
  `;

  cachedSummaryText = summaryText;
  cachedFinancialData = { income, expense, debt, dcaInvested, savingsAmount, emergencyFund, debtStatus };

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
      ...financialData  // ← จะรวม debtStatus ไปแล้ว
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


