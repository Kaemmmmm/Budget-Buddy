import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

let cachedSummaryText = "";
let cachedFinancialData = {};

export { saveUserPlan, cachedSummaryText, cachedFinancialData };

document.addEventListener("DOMContentLoaded", () => {
  const confirmBtn = document.querySelector(".confirm-btn");

  // Prevent multiple listeners
  if (confirmBtn && !confirmBtn.classList.contains("listener-attached")) {
    confirmBtn.classList.add("listener-attached");

    confirmBtn.addEventListener("click", async () => {
      try {
        await saveUserPlan(cachedSummaryText, cachedFinancialData);
        openModal(); // show the success modal
      } catch (err) {
        alert("เกิดข้อผิดพลาดในการบันทึกแผนการเงิน");
      }
    });
  }
});

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
  const dcaInvested = await getMonthlyTotal(userId, "dca_history", "amount", "date");
  const assetPrice = parseFloat(data.installment?.assetPrice) || 0;
  const installmentDuration = parseFloat(data.installment?.installmentDuration) || 1;
  const paidMonths = parseFloat(data.installment?.paidMonths) || 0;
  const savingsAmount = await getMonthlyTotal(userId, "saving_history", "amount", "date");
  const emergencyFund = parseFloat(data.emergencyFund?.amount) || 0;
  const emergency = await getMonthlyTotal(userId, "emergencyfund_history", "amount", "date");

  const totalInstallmentPaid = await getMonthlyTotal(userId, "installment_history", "amount", "date");
  const savings = dcaInvested + totalInstallmentPaid + savingsAmount+ emergency;
  const remaining = income - expense - savings  - debt;
  const monthsCovered = expense > 0 ? (emergencyFund / expense) : 0;

  const transactionsRef = collection(db, "budget", userId, "transaction");
  const snapshot = await getDocs(transactionsRef);

  let hasLatePayment = false;
  let hasUnpaidDebt = false;
  let totalDebtTransactions = 0;

  snapshot.forEach((transactionDoc) => {
    const transaction = transactionDoc.data();
    if (["debt", "loan", "installment", "DCA", "bill"].includes(transaction.type)) {
      if (transaction.paid === false) hasUnpaidDebt = true;
      if (transaction.onTime === false) hasLatePayment = true;
    }
    if (!["dca", "saving"].includes(transaction.type.toLowerCase())) {
      totalDebtTransactions += 1;
    }
  });

  let savingsStatus, wealthStatus, emergencyStatus, debtStatus;

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

  // เงินคงเหลือ (wealthStatus)
  if (remaining >= 0.05 * income) {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail", "circle-green", "ดีมาก", `เงินคงเหลือเป็นบวก (${remaining.toLocaleString()} บาท) แสดงถึงสภาพคล่องที่ดี`);
    wealthStatus = "ดีมาก";
  } else if (remaining <= 0.005 * income && remaining >= 0) {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail", "circle-yellow", "พอใช้", `เงินคงเหลือเป็นศูนย์ แสดงถึงสถานะการเงินเฉลี่ย`);
    wealthStatus = "พอใช้";
  } else {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail", "circle-red", "ต้องปรับปรุง", `เงินคงเหลือเป็นลบ (${remaining.toLocaleString()} บาท) ควรปรับแผนการเงิน`);
    wealthStatus = "ต้องปรับปรุง";
  }

  // หนี้
  if (totalDebtTransactions <= 0) {
    debtStatus = "ไม่มีหนี้";
  } else if (!hasUnpaidDebt && !hasLatePayment) {
    debtStatus = "ผ่อนตรงเวลา";
  } else {
    debtStatus = "มีหนี้ค้างชำระ";
  }

  if (debtStatus === "ไม่มีหนี้") {
    updateStatus("debt-circle", "debt-text", "debt-detail", "circle-green", "ไม่มีหนี้", "ไม่มีหนี้คงค้าง ถือเป็นสถานะการเงินที่ดี");
  } else if (debtStatus === "ผ่อนตรงเวลา") {
    updateStatus("debt-circle", "debt-text", "debt-detail", "circle-yellow", "ผ่อนตรงเวลา", "มีหนี้แต่ผ่อนชำระตรงเวลา อยู่ในเกณฑ์ที่จัดการได้");
  } else {
    updateStatus("debt-circle", "debt-text", "debt-detail", "circle-red", "มีหนี้ค้างชำระ", "มีหนี้ที่ค้างชำระหรือจ่ายล่าช้า ควรเร่งปรับแผนชำระหนี้");
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

  // เรียกสรุปแผนพร้อมตัวแปร remaining
  displayPlanSummary({
    savingsStatus,
    wealthStatus,
    remaining,         // เพิ่มตัวแปร remaining
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
    paidMonths,
    assetPrice,
    installmentDuration
  });
}

// อัปเดตสถานะใน UI
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

// แสดงสรุปแผนการเงิน
function displayPlanSummary({
  savingsStatus,
  wealthStatus,
  remaining,         // รับ remaining มาลงในฟังก์ชัน
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
  paidMonths,
  installmentDuration,
  assetPrice
}) {
  const planSummaryEl = document.getElementById("plan-summary");
  if (!planSummaryEl) return;

  let recommendation = "";

  recommendation += savingsStatus === "ดีมาก"
    ? "✅ การออมของคุณอยู่ในระดับดีมาก เนื่องจากคุณมีเงินออมมากกว่าหรือเท่ากับ 10% ของรายได้ โปรดรักษาวินัยในการออมเงินให้คงที่.\n"
    : savingsStatus === "พอใช้"
      ? "⚠️ การออมของคุณอยู่ในระดับพอใช้ เนื่องจากคุณมีเงินออมครอบคลุมประมาณ 5-9% ของรายได้ ควรปรับปรุงอัตราการออมเพิ่มขึ้นเล็กน้อย.\n"
      : `<span style="color: red;">❌ การออมของคุณต่ำเกินไป เนื่องจากคุณมีเงินออมต่ำกว่า 5% ของรายได้ ควรปรับปรุงอัตราการออมอย่างเร่งด่วน.</span>\n`;

  recommendation += wealthStatus === "ดีมาก"
    ? `✅ เงินคงเหลือเป็นบวก (${remaining.toLocaleString()} บาท) แสดงถึงสภาพคล่องที่ดี คุณสามารถนำไปเพิ่มเงินฉุกเฉินหรือการลงทุนได้.\n`
    : wealthStatus === "พอใช้"
      ? `⚠️ เงินคงเหลือเท่ากับศูนย์ แนะนำทบทวนงบประมาณและตั้งเป้าหมายให้มีเงินคงเหลืออย่างน้อย 5% ของรายได้.\n`
      : `<span style="color: red;">❌ เงินคงเหลือเป็นลบ (${remaining.toLocaleString()} บาท) ควรลดรายจ่ายหรือเพิ่มรายรับอย่างเร่งด่วน อาจปรึกษาผู้เชี่ยวชาญทางการเงินเพิ่มเติม.</span>\n`;

  recommendation += debtStatus === "ไม่มีหนี้"
    ? "✅ คุณไม่มีหนี้ที่ต้องกังวล รักษาวินัยการใช้จ่ายของคุณไม่ให้เป็นหนี้ต่อไป.\n"
    : debtStatus === "ผ่อนตรงเวลา"
      ? "⚠️ คุณมีหนี้แต่บริหารได้ดี สามารถจ่ายตรงเวลา ควรปรับลดภาระหนี้ เพื่อความมั่นคงทางการเงินและลดค่าใช้จ่ายในระยะยาว.\n"
      : `<span style="color: red;">❌ คุณมีหนี้ค้างชำระ ควรจัดการแผนชำระหนี้อย่างจริงจังและกำหนดการจ่ายให้ตรงเวลา.</span>\n`;

  recommendation += emergencyStatus === "ดีมาก"
    ? "✅ เงินฉุกเฉินของคุณเพียงพอสำหรับสถานการณ์ฉุกเฉิน รักษาวินัยการเก็บเงินสำรองฉุกเฉิน และทบทวนค่าใช้จ่ายเป็นประจำเพื่อปรับยอดเงินสำรองฉุกเฉินให้เหมาะสม.\n"
    : emergencyStatus === "พอใช้"
      ? "⚠️ เงินฉุกเฉินของคุณพอใช้ได้ ปรับลดค่าใช้จ่ายบางอย่าง เพื่อนำมาเก็บเพิ่มในเงินสำรองฉุกเฉิน.\n"
      : `<span style="color: red;">❌ เงินฉุกเฉินของคุณน้อยเกินไป ปรับลดค่าใช้จ่ายที่ไม่จำเป็นอย่างเร่งด่วนและหารายได้เสริม เพื่อนำมาเก็บเพิ่มในเงินสำรองฉุกเฉิน.</span>\n`;

  const summaryText = `
    สรุปแผนการเงิน:
    - การออม: ${savingsStatus}
    - เงินคงเหลือ: ${wealthStatus}
    - สถานะหนี้: ${debtStatus}
    - เงินฉุกเฉินครอบคลุม: ${monthsCovered.toFixed(1)} เดือน

    คำแนะนำ: 
${recommendation}
  `;

  cachedSummaryText = summaryText;
  cachedFinancialData = {
    income,
    expense,
    debt,
    dcaInvested,
    savingsAmount,
    emergencyFund,
    debtStatus,
    paidMonths,
    assetPrice,
    installmentDuration
  };

  planSummaryEl.innerHTML = summaryText;
}

async function saveUserPlan(planSummaryHTML, financialData) {
  console.log("🔁 Running saveUserPlan()");
  const user = auth.currentUser;
  if (!user) {
    console.error("🚫 ผู้ใช้ยังไม่ได้ล็อกอิน");
    return;
  }

  const userId = user.uid;
  const planDocRef = doc(db, "plan", userId);
  const goalDocRef = doc(db, "goal", userId);
  let assetType = "";

  try {
    // Get the user's goal name from /goal/<userId>
    const goalSnap = await getDoc(goalDocRef);
    const goalData = goalSnap.data();
    assetType = goalData?.installment?.assetType || "";
    if (!goalSnap.exists()) {
      console.error("🚫 ไม่พบข้อมูล goal ของผู้ใช้ กรุณากำหนด goal ก่อน");
      return;
    }
    const goalName = goalData.goal || "ไม่ระบุ";

    // Check if old plan exists for archiving
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
    }

    // Save plan with dynamic goal name and flat structure
    await setDoc(planDocRef, {
      plan: planSummaryHTML,
      planUpdatedAt: new Date(),
      goal: goalName,
      income: financialData.income || 0,
      expense: financialData.expense || 0,
      debt: financialData.debt || 0,
      dcaInvested: financialData.dcaInvested || 0,
      savingsAmount: financialData.savingsAmount || 0,
      emergencyFund: financialData.emergencyFund || 0,
      debtStatus: financialData.debtStatus || "ไม่ทราบ",
      paidMonths: financialData.paidMonths || 0,
      assetPrice: financialData.assetPrice || 0,
      installmentDuration: financialData.installmentDuration || 1,
      assetType: assetType || ""  // ✅ ADD THIS
    }, { merge: true });

    console.log("✅ แผนการเงินถูกบันทึกลง Firestore แล้ว (goal =", goalName, ")");
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการบันทึกแผน:", error);
    throw error;
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    loadAssessmentData();
    insertGoalToTitle();
  } else {
    console.log("ไม่มีผู้ใช้ล็อกอิน");
  }
});

async function insertGoalToTitle() {
  const user = auth.currentUser;
  if (!user) return;

  const goalRef = doc(db, "goal", user.uid);
  const goalSnap = await getDoc(goalRef);

  if (goalSnap.exists()) {
    const goalData = goalSnap.data();
    const goalTextRaw = goalData.goal;
    const goalText = formatGoalLabel(goalTextRaw, goalData);

    const titleEl = document.getElementById("plan-title");
    if (titleEl) {
      titleEl.innerHTML = `แผนการเงินปัจจุบัน <span style="font-weight: 400;">(${goalText})</span>`;
    }
  }
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
