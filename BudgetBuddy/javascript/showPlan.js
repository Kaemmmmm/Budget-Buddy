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

async function getUserGoal() {
  const user = auth.currentUser;
  if (!user) return null;

  const goalRef = collection(db, "goal");
  const goalSnap = await getDocs(goalRef);

  // ดึงเฉพาะ goal ของ user คนนี้
  for (const docSnap of goalSnap.docs) {
    if (docSnap.id === user.uid) {
      return docSnap.data().goal || null;
    }
  }

  return null;
}

// ฟังก์ชันดึงข้อมูลแผนปัจจุบัน + planHistory แล้วแสดง
async function loadAllPlansForUser() {
  const user = auth.currentUser;
  if (!user) return;

  const planDocRef = doc(db, "plan", user.uid);
  const planSnap = await getDoc(planDocRef);
  const goal = await getUserGoal(); 
  const allPlans = [];

  if (planSnap.exists()) {
    allPlans.push({
      id: "current",
      data: planSnap.data(),
      isCurrent: true
    });
  }

  const historyRef = collection(planDocRef, "planHistory");
  const historySnap = await getDocs(historyRef);
  historySnap.forEach((docSnap) => {
    allPlans.push({
      id: docSnap.id,
      data: docSnap.data(),
      isCurrent: false
    });
  });

  displayPlanList(allPlans, goal); 
}


  // 2) แผนเก่า
  const historyRef = collection(planDocRef, "planHistory");
  const historySnap = await getDocs(historyRef);
  historySnap.forEach((docSnap) => {
    allPlans.push({
      id: docSnap.id,
      data: docSnap.data(),
      isCurrent: false
    });
  });

  // แสดงผล
  displayPlanList(allPlans);

async function getGoalFromPlanHistory(userId, planId) {
  const historyPlanRef = doc(db, "plan", userId, "planHistory", planId);
  const historySnap = await getDoc(historyPlanRef);
  if (historySnap.exists()) {
    return historySnap.data().goal || null;
  }
  return null;
}

async function formatGoalLabel(goalRaw) {
  if (goalRaw === "Saving") return "ออมเงิน";
  if (goalRaw === "DCA") return "DCA";

  const goalRef = doc(db, "goal", auth.currentUser.uid);
  const goalSnap = await getDoc(goalRef);
  const assetType = goalSnap.exists() ? goalSnap.data()?.installment?.assetType : null;
  const assetLabel = assetType === "house" ? "ซ้อมผ่อน บ้าน" : assetType === "car" ? "ซ้อมผ่อน รถ" : "ซ้อมผ่อน";

  if (goalRaw === "Installment Trial") return assetLabel;
  if (goalRaw === "DCA & Installment Trial") return `DCA & ${assetLabel}`;
  if (goalRaw?.toLowerCase?.() === "no goal") return "ไม่มีเป้าหมายการเงิน";

  return goalRaw || "";
}




// แสดงรายการแผนใน #plan-list
async function displayPlanList(plans, userGoal) {
  const planListEl = document.getElementById("plan-list");
  if (!planListEl) return;

  planListEl.innerHTML = "";

  if (plans.length === 0) {
    alert("คุณยังไม่มีแผนการเงินในขณะนี้ โปรดสร้างแผนการเงิน");
    window.location.href = "start.html";
    return;
  }

  plans.sort((a, b) => {
    const aDate = a.data.planUpdatedAt?.toDate?.() || a.data.archivedAt?.toDate?.() || new Date(0);
    const bDate = b.data.planUpdatedAt?.toDate?.() || b.data.archivedAt?.toDate?.() || new Date(0);
    return bDate - aDate;
  });

  const ul = document.createElement("ul");
  ul.classList.add("plan-list-ul");

  let historyIndex = 1;

  for (const planObj of plans) {
    const li = document.createElement("li");
    li.classList.add("plan-item");

    const isCurrent = planObj.isCurrent;
    let label = "";

    if (isCurrent) {
      const displayGoal = await formatGoalLabel(userGoal);
      label = `แผนปัจจุบัน${displayGoal ? " (" + displayGoal + ")" : ""}`;
    } else {
      const goal = await getGoalFromPlanHistory(auth.currentUser.uid, planObj.id);
      const displayGoal = await formatGoalLabel(goal);
      label = `แผนเก่า #${historyIndex++}${displayGoal ? " (" + displayGoal + ")" : ""}`;
    }

    const date = planObj.data.planUpdatedAt || planObj.data.archivedAt;
    const timeStr = date && typeof date.toDate === "function" ? date.toDate().toLocaleString() : "";

    const planLink = `plan.html?type=${isCurrent ? "current" : "history"}&id=${encodeURIComponent(planObj.id)}`;

    li.innerHTML = `
      <a href="${planLink}" class="plan-link">
        <div class="plan-label">${label}</div>
        <div class="plan-time">${timeStr}</div>
      </a>
    `;

    ul.appendChild(li);
  }

  planListEl.appendChild(ul);
}




// ฟังก์ชันแปลง Timestamp เป็น string
function formatTimestamp(ts) {
  if (ts && typeof ts.toDate === "function") {
    return ts.toDate().toLocaleString();
  }
  return ts ? ts.toString() : "";
}
