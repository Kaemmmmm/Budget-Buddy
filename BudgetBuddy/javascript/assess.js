import { db, auth } from "./firebase.js";
import { collection, doc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

async function loadAssessmentData() {
  const userId = auth.currentUser.uid;

  // Load user goal data
  const userDocRef = doc(db, "goal", userId);
  const docSnap = await getDoc(userDocRef);

  if (!docSnap.exists()) {
    console.error("ไม่พบข้อมูลของผู้ใช้");
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

  // Load transactions to assess debt status
  const transactionsRef = collection(db, "budget", userId, "transaction");
  const snapshot = await getDocs(transactionsRef);

  let hasLatePayment = false;
  let hasUnpaidDebt = false;

  snapshot.forEach((transactionDoc) => {
    const transaction = transactionDoc.data();
  
    // Check only debt-related transactions
    if (["debt", "loan", "installment", "DCA"].includes(transaction.type)) {
      if (transaction.paid === false) hasUnpaidDebt = true;
      if (transaction.onTime === false) hasLatePayment = true;
    }
  });
  let totalDebtTransactions = 0;

  snapshot.forEach((transactionDoc) => {
    const transaction = transactionDoc.data();

    // Count transactions not related to "dca" or "saving"
    if (!["dca", "saving"].includes(transaction.type.toLowerCase())) {
    totalDebtTransactions += 1;
    }
  });


  // Saving assessment
  if (savings >= 0.10 * income) {
    updateStatus("saving-circle", "saving-text", "saving-detail", "circle-green", "ดีมาก", "การออม ≥ 10% ของรายได้ แสดงถึงสภาพคล่องและวินัยการออมที่ดี");
  } else if (avings >= 0.05 * income && savings < 0.10 * income) {
    updateStatus("saving-circle", "saving-text", "saving-detail", "circle-yellow", "พอใช้", "การออม 5-9% ของรายได้ ยังพอใช้ได้ แต่ควรเพิ่มขึ้นเพื่อความมั่นคง");
  } else {
    updateStatus("saving-circle", "saving-text", "saving-detail", "circle-red", "ต้องปรับปรุง", "การออม < 5% ของรายได้ ค่อนข้างน้อย ควรเพิ่มการออม");
  }

  // Wealth assessment
  if (netAssets >= 0.5 * income) {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail", "circle-green", "ดีมาก", "สินทรัพย์สุทธิ ≥ 50% ของรายได้ต่อเดือน สะท้อนความมั่งคั่งสูง");
  } else if (netAssets >= 0.20 * income && netAssets < 0.50 * income) {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail", "circle-yellow", "พอใช้", "สินทรัพย์สุทธิ 20-49% ของรายได้ต่อเดือน ควรเพิ่มสินทรัพย์หรือปรับลดหนี้");
  } else {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail", "circle-red", "ต้องปรับปรุง", "สินทรัพย์สุทธิ < 20% ของรายได้ต่อเดือน เสี่ยงต่อปัญหาการเงินในอนาคต");
  }

  // Debt assessment
  if (totalDebtTransactions == 0) {
    updateStatus("debt-circle", "debt-text", "debt-detail", "circle-green", "ไม่มีหนี้", "ไม่มีหนี้คงค้าง ถือเป็นสถานะการเงินที่ดี");
  } else if (!hasUnpaidDebt && !hasLatePayment) {
    updateStatus("debt-circle", "debt-text", "debt-detail", "circle-yellow", "ผ่อนตรงเวลา", "มีหนี้แต่ผ่อนชำระตรงเวลา อยู่ในเกณฑ์ที่จัดการได้");
  } else {
    updateStatus("debt-circle", "debt-text", "debt-detail", "circle-red", "มีหนี้ค้างชำระ", "มีหนี้ที่ค้างชำระหรือจ่ายล่าช้า ควรเร่งปรับแผนชำระหนี้");
  }

  // Emergency fund assessment
  if (monthsCovered >= 6) {
    updateStatus("emergency-circle", "emergency-text", "emergency-detail", "circle-green", "ดีมาก", "เงินฉุกเฉินครอบคลุมมากกว่า 6 เดือน แสดงถึงความมั่นคงทางการเงินสูง");
  } else if (monthsCovered >= 3) {
    updateStatus("emergency-circle", "emergency-text", "emergency-detail", "circle-yellow", "พอใช้", "เงินฉุกเฉินครอบคลุม 3-6 เดือน ยังอยู่ในเกณฑ์ที่พอใช้ได้");
  } else {
    updateStatus("emergency-circle", "emergency-text", "emergency-detail", "circle-red", "ต้องปรับปรุง", "เงินฉุกเฉินครอบคลุมน้อยกว่า 3 เดือน ไม่เพียงพอต่อเหตุฉุกเฉิน");
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    loadAssessmentData();
  } else {
    console.log("No user logged in");
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