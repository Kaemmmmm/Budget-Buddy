import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc, getDocs
 } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";


// ฟังก์ชันดึงข้อมูลและประเมินสุขภาพทางการเงิน
async function loadAssessmentData() {
  const userId = auth.currentUser.uid;
  const goalDocRef = doc(db, "goal", userId);
  const goalSnap = await getDoc(goalDocRef);
  if(!goalSnap.exists()) {
    console.error("ไม่พบข้อมูล goal ของผู้ใช้ กรุณากำหนด goal ก่อน")
    return;
  }

  const userDocRef = doc(db, "goal", userId);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) {
    console.error("ไม่พบข้อมูลของผู้ใช้");
    return;
  }
  const data = docSnap.data();
  const data1 = goalSnap.data();

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
  displayPlanSummary({ savingsStatus, wealthStatus, emergencyStatus, income, expense, debt, dcaInvested, savingsAmount, emergencyFund,  savings, netAssets, monthsCovered });
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
function displayPlanSummary({ savingsStatus, wealthStatus, emergencyStatus, income, expense, debt, dcaInvested, savingsAmount, emergencyFund, savings, netAssets, monthsCovered }) {
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
  saveUserPlan(summaryText, { income, expense, debt, dcaInvested, savingsAmount, emergencyFund });
}

async function saveUserPlan(planSummaryHTML, financialData) {
  const user = auth.currentUser;
  if (!user) {
    console.error("ผู้ใช้ยังไม่ได้ล็อกอิน");
    return;
  }
  
  const goalDocRef = doc(db, "goal", user.uid);
  const goalSnap = await getDoc(goalDocRef);
  if (!goalSnap.exists()) {
    console.error("ไม่พบข้อมูล goal ของผู้ใช้ กรุณากำหนด goal ก่อนสร้าง plan");
    return;
  }  

  const planDocRef = doc(db, "plan", user.uid);

  try {
    // 1) ดึงข้อมูลแผนปัจจุบัน (ถ้ามี) เพื่อนำไปเก็บเป็นประวัติ
    const currentPlanSnap = await getDoc(planDocRef);
    if (currentPlanSnap.exists()) {
      // เก็บข้อมูลปัจจุบันลงใน sub-collection "planHistory"
      const historyCollectionRef = collection(planDocRef, "planHistory");
      await addDoc(historyCollectionRef, {
        ...currentPlanSnap.data(),
        archivedAt: new Date()
      });
    }

  // ใช้ setDoc พร้อม merge: true เพื่ออัปเดต field plan และ planUpdatedAt
await setDoc(planDocRef, {
    plan: planSummaryHTML,
    planUpdatedAt: new Date(),
    income: financialData.income,
    expense: financialData.expense,
    debt: financialData.debt,
    dcaInvested: financialData.dcaInvested,
    savingsAmount: financialData.savingsAmount,
    emergencyFund: financialData.emergencyFund
  }, { merge: true });

  console.log("บันทึกแผนการเงิน (และเก็บประวัติ) ลง Firebase เรียบร้อยแล้ว");
} catch (error) {
  console.error("เกิดข้อผิดพลาดในการบันทึกแผนการเงิน:", error);
}
}

// ตรวจสอบผู้ใช้และเรียกใช้ฟังก์ชัน loadAssessmentData
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadAssessmentData();
    loadAllPlansForUser();
  } else {
    console.log("ไม่มีผู้ใช้ล็อกอิน");
  }
});

async function loadAllPlansForUser() {
  const user = auth.currentUser;
  if (!user) {
    console.error("ยังไม่มีผู้ใช้ล็อกอิน");
    return;
  }

  const planDocRef = doc(db, "plan", user.uid);
  const planSnap = await getDoc(planDocRef);
  
  // เตรียม array สำหรับเก็บทุกแผน (ปัจจุบัน + เก่า)
  const allPlans = [];

  // 1) ดึงแผนปัจจุบัน (document หลัก)
  if (planSnap.exists()) {
    const currentData = planSnap.data();
    // เก็บไว้ใน array โดยกำหนด id = 'current' ไว้บอกว่าเป็นแผนปัจจุบัน
    allPlans.push({
      id: "current", 
      data: currentData, 
      isCurrent: true
    });
  }

  // 2) ดึงแผนเก่า (sub-collection "planHistory")
  const historyCollectionRef = collection(planDocRef, "planHistory");
  const historySnap = await getDocs(historyCollectionRef);
  historySnap.forEach((docSnap) => {
    const historyData = docSnap.data();
    allPlans.push({
      id: docSnap.id, 
      data: historyData, 
      isCurrent: false
    });
  });

  // 3) ใส่ข้อมูลลง <select> ให้ผู้ใช้เลือก
  populatePlanSelector(allPlans);
}

// ฟังก์ชันใส่ Option ลงใน <select id="plan-selector">
function populatePlanSelector(plans) {
  const planSelector = document.getElementById("plan-selector");
  if (!planSelector) return;
  
  // ล้างตัวเลือกเก่า (ถ้ามี)
  planSelector.innerHTML = "";

  // สร้าง <option> สำหรับแต่ละแผน
  plans.forEach((planObj, index) => {
    const option = document.createElement("option");
    option.value = planObj.id; // ใช้ id ของ plan (ถ้า isCurrent = true ก็จะเป็น 'current')
    
    // แสดงข้อความ เช่น "แผนปัจจุบัน (2023-03-01 10:00)" หรือ "แผนเก่า #1 (archivedAt: ...)"
    const planUpdated = planObj.data.planUpdatedAt;
    const archived = planObj.data.archivedAt;
    
    if (planObj.isCurrent) {
      // แผนปัจจุบัน
      option.textContent = planUpdated
        ? `แผนปัจจุบัน (อัปเดต: ${formatTimestamp(planUpdated)})`
        : "แผนปัจจุบัน (ไม่พบเวลาที่อัปเดต)";
    } else {
      // แผนเก่า
      option.textContent = archived
        ? `แผนเก่า #${index} (บันทึกเมื่อ: ${formatTimestamp(archived)})`
        : `แผนเก่า #${index}`;
    }
    
    planSelector.appendChild(option);
  });

  // เมื่อผู้ใช้เปลี่ยนตัวเลือก -> แสดง plan นั้น
  planSelector.addEventListener("change", (e) => {
    const selectedId = e.target.value; // 'current' หรือ docId ของ planHistory
    const selectedPlan = plans.find(p => p.id === selectedId);
    if (selectedPlan) {
      // แสดงข้อความสรุปใน #plan-summary
      displaySelectedPlan(selectedPlan);
    }
  });
}

// ฟังก์ชันแสดงผลแผนที่เลือก (ตัวอย่างนี้แสดงเฉพาะ planSummaryHTML)
function displaySelectedPlan(planObj) {
  const planSummaryEl = document.getElementById("plan-summary");
  if (!planSummaryEl) return;

  // ใน planObj.data.plan จะเป็นข้อความสรุปแผน
  if (planObj.data.plan) {
    planSummaryEl.textContent = planObj.data.plan;
  } else {
    planSummaryEl.textContent = "ไม่พบข้อมูลสรุปแผนในเอกสารนี้";
  }
}

// ฟังก์ชันแปลง Timestamp (Firestore) เป็น string ที่อ่านง่าย
function formatTimestamp(ts) {
  // ถ้าเป็น Firestore Timestamp จะมี toDate()
  if (ts && typeof ts.toDate === "function") {
    return ts.toDate().toLocaleString();
  }
  // ถ้าเก็บเป็น Date ปกติ หรือ string
  return ts ? ts.toString() : "";
}
