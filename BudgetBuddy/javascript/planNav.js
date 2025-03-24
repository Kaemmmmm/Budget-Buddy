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

  if (plans.length === 0) {
    planListEl.textContent = "ยังไม่มีแผนการเงิน";
    return;
  }

  const ul = document.createElement("ul");
  ul.classList.add("plan-list-ul");

  plans.forEach((planObj, index) => {
    const li = document.createElement("li");
    li.classList.add("plan-item");

    let linkText = "";
    let timeStr = "";
    if (planObj.isCurrent) {
      linkText = "แผนปัจจุบัน";
      if (planObj.data.planUpdatedAt) {
        timeStr = formatTimestamp(planObj.data.planUpdatedAt);
      }
    } else {
      linkText = `แผนเก่า #${index}`;
      if (planObj.data.archivedAt) {
        timeStr = formatTimestamp(planObj.data.archivedAt);
      }
    }

    li.innerHTML = `
      <a href="plan.html?planId=${encodeURIComponent(planObj.id)}">${linkText}</a>
      ${timeStr ? `<span class="plan-time"><i class="fa-solid fa-clock"></i> ${timeStr}</span>` : ""}
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
