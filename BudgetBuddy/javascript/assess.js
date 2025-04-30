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

  const dcaInvested = await getMonthlyTotal(userId, "dca_history", "amount", "date");
  const assetPrice = parseFloat(data.installment?.assetPrice) || 0;
  const installmentDuration = parseFloat(data.installment?.installmentDuration) || 1;
  const paidMonths = parseFloat(data.installment?.paidMonths) || 0;
  const savingsAmount = await getMonthlyTotal(userId, "saving_history", "amount", "date");
  const emergencyFund = parseFloat(data.emergencyFund?.amount) || 0;
  const emergency = await getMonthlyTotal(userId, "emergencyfund_history", "amount", "date");

  const totalInstallmentPaid = await getMonthlyTotal(userId, "installment_history", "amount", "date");
  const savings = dcaInvested + totalInstallmentPaid + savingsAmount+emergency;
  const remaining = income - expense - savings - debt;
  const monthsCovered = expense > 0 ? (emergencyFund / expense) : 0;

  // Load transactions to assess debt status
  const transactionsRef = collection(db, "budget", userId, "transaction");
  const snapshot = await getDocs(transactionsRef);

  let hasLatePayment = false;
  let hasUnpaidDebt = false;
  let totalDebtTransactions = 0;

  snapshot.forEach((transactionDoc) => {
    const transaction = transactionDoc.data();

    // Count debt-related transactions
    if (["other", "bill"].includes(transaction.type)) {
      totalDebtTransactions++;
      if (transaction.paid === false) hasUnpaidDebt = true;
      if (transaction.onTime === false) hasLatePayment = true;
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

  // Saving assessment
  if (savings >= 0.10 * income) {
    updateStatus(
      "saving-circle", "saving-text", "saving-detail",
      "circle-green", "ดีมาก",
      "การออม ≥ 10% ของรายได้ แสดงถึงสภาพคล่องและวินัยการออมที่ดี"
    );
  } else if (savings >= 0.05 * income) {
    updateStatus(
      "saving-circle", "saving-text", "saving-detail",
      "circle-yellow", "พอใช้",
      "การออม 5-9% ของรายได้ ยังพอใช้ได้ แต่ควรเพิ่มขึ้นเพื่อความมั่นคง"
    );
  } else {
    updateStatus(
      "saving-circle", "saving-text", "saving-detail",
      "circle-red", "ต้องปรับปรุง",
      "การออม < 5% ของรายได้ ค่อนข้างน้อย ควรเพิ่มการออม"
    );
  }

  // Remaining assessment (replacing wealth)
  if (remaining >= 0.05 * income) {
    updateStatus(
      "wealth-circle", "wealth-text", "wealth-detail",
      "circle-green", "ดีมาก",
      `เงินคงเหลือเป็นบวก (${remaining.toLocaleString()} บาท) แสดงถึงสภาพคล่องที่ดี`
    );
  } else if (remaining <= 0.005 * income && remaining >= 0) {
    updateStatus(
      "wealth-circle", "wealth-text", "wealth-detail",
      "circle-yellow", "พอใช้",
      `เงินคงเหลือเป็นศูนย์ แสดงถึงสถานะการเงินเฉลี่ย`
    );
  } else {
    updateStatus(
      "wealth-circle", "wealth-text", "wealth-detail",
      "circle-red", "ต้องปรับปรุง",
      `เงินคงเหลือเป็นลบ (${remaining.toLocaleString()} บาท) ควรปรับแผนการเงิน`
    );
  }

  // Debt assessment
  if (totalDebtTransactions === 0) {
    updateStatus(
      "debt-circle", "debt-text", "debt-detail",
      "circle-green", "ไม่มีหนี้",
      "ไม่มีหนี้คงค้าง ถือเป็นสถานะการเงินที่ดี"
    );
  } else if (!hasUnpaidDebt && !hasLatePayment) {
    updateStatus(
      "debt-circle", "debt-text", "debt-detail",
      "circle-yellow", "ผ่อนตรงเวลา",
      "มีหนี้แต่ผ่อนชำระตรงเวลา อยู่ในเกณฑ์ที่จัดการได้"
    );
  } else {
    updateStatus(
      "debt-circle", "debt-text", "debt-detail",
      "circle-red", "มีหนี้ค้างชำระ",
      "มีหนี้ที่ค้างชำระหรือจ่ายล่าช้า ควรเร่งปรับแผนชำระหนี้"
    );
  }

  // Emergency fund assessment
  if (monthsCovered >= 6) {
    updateStatus(
      "emergency-circle", "emergency-text", "emergency-detail",
      "circle-green", "ดีมาก",
      "เงินฉุกเฉินครอบคลุมมากกว่า 6 เดือน แสดงถึงความมั่นคงทางการเงินสูง"
    );
  } else if (monthsCovered >= 3) {
    updateStatus(
      "emergency-circle", "emergency-text", "emergency-detail",
      "circle-yellow", "พอใช้",
      "เงินฉุกเฉินครอบคลุม 3-6 เดือน ยังอยู่ในเกณฑ์ที่พอใช้ได้"
    );
  } else {
    updateStatus(
      "emergency-circle", "emergency-text", "emergency-detail",
      "circle-red", "ต้องปรับปรุง",
      "เงินฉุกเฉินครอบคลุมน้อยกว่า 3 เดือน ไม่เพียงพอต่อเหตุฉุกเฉิน"
    );
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