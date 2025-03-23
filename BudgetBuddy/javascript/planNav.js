import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// เมื่อผู้ใช้ล็อกอินให้โหลดแผนทั้งหมด
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadAllPlansForUser();
  } else {
    console.log("ไม่มีผู้ใช้ล็อกอิน");
  }
});

// ฟังก์ชันดึงแผนทั้งหมดจาก "plan" และ "planHistory"
async function loadAllPlansForUser() {
  const user = auth.currentUser;
  if (!user) {
    console.error("ยังไม่มีผู้ใช้ล็อกอิน");
    return;
  }

  const planDocRef = doc(db, "plan", user.uid);
  const planSnap = await getDoc(planDocRef);

  // เตรียม array สำหรับเก็บทุกแผน
  const allPlans = [];

  // 1) ดึงแผนปัจจุบัน
  if (planSnap.exists()) {
    const currentData = planSnap.data();
    allPlans.push({
      id: "current",
      data: currentData,
      isCurrent: true
    });
  }

  // 2) ดึงแผนเก่าจาก sub-collection "planHistory"
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

  // 3) ใส่ข้อมูลลง <select id="plan-selector">
  populatePlanSelector(allPlans);
}

// ใส่ Option ลงใน <select>
function populatePlanSelector(plans) {
  const planSelector = document.getElementById("plan-selector");
  if (!planSelector) return; // ถ้าในหน้าไม่มี plan-selector ก็ไม่ทำงาน

  // ล้างตัวเลือกเก่า
  planSelector.innerHTML = "";

  if (plans.length === 0) {
    const noPlanOption = document.createElement("option");
    noPlanOption.textContent = "ยังไม่มีแผนการเงิน";
    planSelector.appendChild(noPlanOption);
    return;
  }
  plans.forEach((planObj, index) => {
    const option = document.createElement("option");
    option.value = planObj.id;

    const planUpdated = planObj.data.planUpdatedAt;
    const archived    = planObj.data.archivedAt;

    if (planObj.isCurrent) {
      option.textContent = planUpdated
        ? `แผนปัจจุบัน (อัปเดต: ${formatTimestamp(planUpdated)})`
        : "แผนปัจจุบัน (ไม่พบเวลาที่อัปเดต)";
    } else {
      option.textContent = archived
        ? `แผนเก่า #${index} (บันทึกเมื่อ: ${formatTimestamp(archived)})`
        : `แผนเก่า #${index}`;
    }

    planSelector.appendChild(option);
  });

  // เมื่อผู้ใช้เปลี่ยนตัวเลือก -> แสดงแผนและอัปเดตวงกลมตามข้อมูลแผนที่เลือก
  planSelector.addEventListener("change", (e) => {
    const selectedId = e.target.value;
    const selectedPlan = plans.find(p => p.id === selectedId);
    if (selectedPlan) {
      displaySelectedPlan(selectedPlan);
      updateCirclesFromPlan(selectedPlan.data);
    }
  });
}

// แสดงผลแผนใน <div id="plan-summary">
function displaySelectedPlan(planObj) {
  const planSummaryEl = document.getElementById("plan-summary");
  if (!planSummaryEl) return;

  if (planObj.data.plan) {
    planSummaryEl.textContent = planObj.data.plan;
  } else {
    planSummaryEl.textContent = "ไม่พบข้อมูลสรุปแผนในเอกสารนี้";
  }
}

// ฟังก์ชันแปลง Timestamp ให้เป็น string
function formatTimestamp(ts) {
  if (ts && typeof ts.toDate === "function") {
    return ts.toDate().toLocaleString();
  }
  return ts ? ts.toString() : "";
}

// ฟังก์ชันอัปเดตวงกลม (สถานะการเงิน) จากข้อมูลแผนที่เลือก
function updateCirclesFromPlan(planData) {
  // ดึงข้อมูลจาก planData (สมมุติว่ามีฟิลด์เดียวกับที่เก็บใน goal)
  const income = parseFloat(planData.income) || 0;
  const expense = parseFloat(planData.expense) || 0;
  const debt = parseFloat(planData.debt) || 0;
  const dcaInvested = parseFloat(planData.dcaInvested) || 0;
  const assetPrice = parseFloat(planData.assetPrice) || 0;
  const installmentDuration = parseFloat(planData.installmentDuration) || 1;
  const paidMonths = parseFloat(planData.paidMonths) || 0;
  const savingsAmount = parseFloat(planData.savingsAmount) || 0;
  const emergencyFund = parseFloat(planData.emergencyFund) || 0;

  // คำนวณค่า
  const totalInstallmentPaid = paidMonths * (assetPrice / (installmentDuration * 12));
  const savings = dcaInvested + totalInstallmentPaid + savingsAmount + emergencyFund;
  const netAssets = income - expense - debt;
  const monthsCovered = expense > 0 ? (emergencyFund / expense) : 0;

  // อัปเดตวงกลม "การออม"
  if (savings >= 0.10 * income) {
    updateStatus("saving-circle", "saving-text", "saving-detail",
      "circle-green", "ดีมาก", "การออม ≥ 10% ของรายได้");
  } else if (savings >= 0.05 * income && savings < 0.10 * income) {
    updateStatus("saving-circle", "saving-text", "saving-detail",
      "circle-yellow", "พอใช้", "การออม 5-9% ของรายได้");
  } else {
    updateStatus("saving-circle", "saving-text", "saving-detail",
      "circle-red", "ต้องปรับปรุง", "การออม < 5% ของรายได้");
  }

  // อัปเดตวงกลม "ความมั่งคั่ง"
  if (netAssets >= 0.50 * income) {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail",
      "circle-green", "ดีมาก", "สินทรัพย์สุทธิ ≥ 50% ของรายได้");
  } else if (netAssets >= 0.20 * income && netAssets < 0.50 * income) {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail",
      "circle-yellow", "พอใช้", "สินทรัพย์สุทธิ 20-49% ของรายได้");
  } else {
    updateStatus("wealth-circle", "wealth-text", "wealth-detail",
      "circle-red", "ต้องปรับปรุง", "สินทรัพย์สุทธิ < 20% ของรายได้");
  }

  // อัปเดตวงกลม "เงินฉุกเฉิน"
  if (monthsCovered >= 6) {
    updateStatus("emergency-circle", "emergency-text", "emergency-detail",
      "circle-green", "ดีมาก", "เงินฉุกเฉินครอบคลุม ≥ 6 เดือน");
  } else if (monthsCovered >= 3) {
    updateStatus("emergency-circle", "emergency-text", "emergency-detail",
      "circle-yellow", "พอใช้", "เงินฉุกเฉินครอบคลุม 3-6 เดือน");
  } else {
    updateStatus("emergency-circle", "emergency-text", "emergency-detail",
      "circle-red", "ต้องปรับปรุง", "เงินฉุกเฉินครอบคลุมน้อยกว่า 3 เดือน");
  }
}

// ฟังก์ชันอัปเดต UI (เปลี่ยนสีวงกลม + ข้อความ)
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
