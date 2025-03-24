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

// ฟังก์ชันดึงข้อมูลแผนปัจจุบัน + planHistory แล้วแสดง
async function loadAllPlansForUser() {
  const user = auth.currentUser;
  if (!user) return;

  const planDocRef = doc(db, "plan", user.uid);
  const planSnap = await getDoc(planDocRef);

  // สร้าง array allPlans
  const allPlans = [];

  // 1) แผนปัจจุบัน
  if (planSnap.exists()) {
    allPlans.push({
      id: "current",
      data: planSnap.data(),
      isCurrent: true
    });
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
}

// แสดงรายการแผนใน #plan-list
function displayPlanList(plans) {
  const planListEl = document.getElementById("plan-list");
  if (!planListEl) return;

  planListEl.innerHTML = ""; // Clear existing list

  if (plans.length === 0) {
    planListEl.textContent = "ยังไม่มีแผนการเงิน";
    return;
  }

  // ✅ Sort by most recent date (descending)
  plans.sort((a, b) => {
    const aDate = a.data.planUpdatedAt?.toDate?.() || a.data.archivedAt?.toDate?.() || new Date(0);
    const bDate = b.data.planUpdatedAt?.toDate?.() || b.data.archivedAt?.toDate?.() || new Date(0);
    return bDate - aDate;
  });

  const ul = document.createElement("ul");
  ul.classList.add("plan-list-ul");

  let historyIndex = 1;

  plans.forEach((planObj) => {
    const li = document.createElement("li");
    li.classList.add("plan-item");

    const isCurrent = planObj.isCurrent;
    const label = isCurrent ? "แผนปัจจุบัน" : `แผนเก่า #${historyIndex++}`;
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
  });

  planListEl.appendChild(ul);
}



// ฟังก์ชันแปลง Timestamp เป็น string
function formatTimestamp(ts) {
  if (ts && typeof ts.toDate === "function") {
    return ts.toDate().toLocaleString();
  }
  return ts ? ts.toString() : "";
}
