import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();

let emergencyGoal = 0;
let savedAmount = 0;
let emergencyChart;

const centerTextPlugin = (progressPercentage) => ({
    id: "centerText",
    beforeDraw(chart) {
      const { width, height, ctx } = chart;
      ctx.restore();
      const fontSize = (height / 6).toFixed(2);
      ctx.font = `bold ${fontSize}px Prompt, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(`${progressPercentage}%`, width / 2, height / 2);
      ctx.save();
    },
  });

document.addEventListener("DOMContentLoaded", () => {
  const updateBtn = document.getElementById("update-progress-btn");
  if (updateBtn) {
    updateBtn.addEventListener("click", updateProgress);
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.error("User not authenticated.");
      return;
    }

    const userId = user.uid;
    const userDoc = doc(db, "goal", userId);

    try {
      const docSnap = await getDoc(userDoc);

      if (!docSnap.exists()) {
        console.warn("No data found for user. Initializing goal document...");
        return;
      }

      const data = docSnap.data();
      const expense = data.expense || 0;
      emergencyGoal = expense * 6;
      savedAmount = data.emergencyFund?.amount || 0;

      document.getElementById("saved-amount").textContent = savedAmount.toLocaleString("th-TH");
      document.getElementById("goal-amount").textContent = emergencyGoal.toLocaleString("th-TH");

      updateChart(savedAmount, emergencyGoal);
      loadSavingHistory(userId);
    } catch (error) {
      console.error("Error fetching emergency fund data:", error);
    }
  });
});

async function updateProgress() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนอัปเดตข้อมูล");
      return;
    }

    const userId = user.uid;
    const userDoc = doc(db, "goal", userId);
    const inputAmount = parseFloat(prompt("ป้อนจำนวนเงินที่ต้องการเพิ่มในเงินฉุกเฉิน:"));
    if (isNaN(inputAmount) || inputAmount <= 0) {
      alert("กรุณาป้อนจำนวนเงินที่ถูกต้อง");
      return;
    }

    savedAmount += inputAmount;

    try {
      await updateDoc(userDoc, {
        "emergencyFund.amount": savedAmount,
      });

      await addDoc(collection(db, "goal", userId, "emergencyfund_history"), {
        amount: inputAmount,
        date: new Date().toLocaleString("th-TH"),
      });

      document.getElementById("saved-amount").textContent = savedAmount.toLocaleString("th-TH");
      updateChart(savedAmount, emergencyGoal);
      loadSavingHistory(userId);

      alert("อัปเดตความคืบหน้าเรียบร้อย!");
    } catch (error) {
      console.error("Error updating progress:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดต");
    }
  });
}

async function loadSavingHistory(userId) {
  const historyList = document.getElementById("history-list");
  if (!historyList) return;

  historyList.innerHTML = "";

  const historyQuery = query(collection(db, "goal", userId, "emergencyfund_history"));
  const historyDocs = await getDocs(historyQuery);

  historyDocs.forEach((docSnap) => {
    const data = docSnap.data();
    const entryAmount = data.amount || 0;
    const entryDate = data.date || "ไม่ระบุวันที่";
    const historyId = docSnap.id;

    const historyItem = document.createElement("li");
    historyItem.classList.add("history-item");
    historyItem.innerHTML = `
      <span>${entryDate}: <strong>${entryAmount.toLocaleString("th-TH")}</strong> บาท</span>
      <button class="delete-btn" data-id="${historyId}" data-amount="${entryAmount}">ลบ</button>
    `;
    historyList.appendChild(historyItem);
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      const historyId = event.target.getAttribute("data-id");
      const deleteAmount = parseFloat(event.target.getAttribute("data-amount"));
      await deleteSavingEntry(userId, historyId, deleteAmount);
    });
  });
}

async function deleteSavingEntry(userId, historyId, deleteAmount) {
  const userDoc = doc(db, "goal", userId);

  try {
    savedAmount -= deleteAmount;
    if (savedAmount < 0) savedAmount = 0;

    await updateDoc(userDoc, { "emergencyFund.amount": savedAmount });
    await deleteDoc(doc(db, "goal", userId, "emergencyfund_history", historyId));

    document.getElementById("saved-amount").textContent = savedAmount.toLocaleString("th-TH");
    updateChart(savedAmount, emergencyGoal);
    loadSavingHistory(userId);

    alert("ลบข้อมูลเรียบร้อย!");
  } catch (error) {
    console.error("Error deleting entry:", error);
    alert("เกิดข้อผิดพลาดในการลบ");
  }
}

function updateChart(saved, goal) {
  const ctx = document.getElementById("savingsChart").getContext("2d");
  if (emergencyChart) emergencyChart.destroy();

  const progressPercentage = goal > 0 ? ((saved / goal) * 100).toFixed(1) : 0;
  const remainingPercentage = 100 - progressPercentage;

  emergencyChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [progressPercentage, remainingPercentage],
          backgroundColor: ["#1e9e78", "#20C997"],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    },
    plugins: [centerTextPlugin(progressPercentage)],
  });
}
