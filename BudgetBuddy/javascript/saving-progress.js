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
  getDocs
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();

// Track data in these variables
let savingGoal = 0;       // This corresponds to savings.savingAmount
let savingDuration = 1;   // This corresponds to savings.savingDuration
let amount = 0;           // This corresponds to savings.amount
let savingChart;

// A plugin to display the percentage in the center of the doughnut
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
  // Listen for "Update Progress" button
  const updateBtn = document.getElementById("update-progress-btn");
  if (updateBtn) {
    updateBtn.addEventListener("click", updateProgress);
  }

  // Check for user and load data
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
        console.warn("No data found for user.");
        return;
      }

      const data = docSnap.data();
      let income = parseFloat(data.income) || 0;
      const goalDocRef = doc(db, "goal", user.uid);

      if (data.goal === "No Goal" && income > 0) {
        savingGoal = income;
        savingDuration = 10;
        amount = 0;

        await setDoc(goalDocRef, {
          savings: {
            savingAmount: savingGoal,
            savingDuration: savingDuration,
          },
        }, { merge: true });

      } else {
        if (!data.savings) {
          alert("คุณยังไม่ได้ตั้งเป้าหมายการออม กรุณาตั้งเป้าหมายก่อนใช้งานระบบ");
          window.location.href = "dashboard.html";
          return;
        }

        const { savingAmount, savingDuration: duration, amount: currentAmount } = data.savings;

        if (
          savingAmount === undefined || savingAmount === null ||
          duration === undefined || duration === null
        ) {
          alert("ข้อมูลเป้าหมายการออมไม่สมบูรณ์ กรุณาตั้งค่าใหม่อีกครั้ง");
          window.location.href = "dashboard.html";
          return;
        }

        savingGoal = parseFloat(savingAmount) || 100000;
        savingDuration = parseFloat(duration) || 10;
        amount = parseFloat(currentAmount) || 0;
      }

      document.getElementById("saved-amount").textContent = amount.toLocaleString("th-TH");
      document.getElementById("goal-amount").textContent = savingGoal.toLocaleString("th-TH");

      updateChart(amount, savingGoal);
      loadSavingHistory(userId);

    } catch (error) {
      console.error("Error fetching saving progress:", error);
    }
  });
});


/**
 * Increments the user's saved amount and writes a new record to "saving_history".
 */
async function updateProgress() {
  if (amount >= savingGoal) {
    alert("คุณได้บรรลุเป้าหมายการออมแล้ว");
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนอัปเดตข้อมูล");
      return;
    }

    const userId = user.uid;
    const userDoc = doc(db, "goal", userId);

    // How much to save each time
    const amountToSave = parseFloat(savingGoal) / parseFloat(savingDuration);
    amount += amountToSave;

    try {
      // Update the nested "savings.amount" field
      await updateDoc(userDoc, {
        "savings.amount": amount,
      });

      // Add a history record
      const timestamp = new Date().toLocaleString("th-TH");
      await addDoc(collection(db, "goal", userId, "saving_history"), {
        amount: amountToSave,
        date: timestamp,
      });

      // Update UI
      document.getElementById("saved-amount").textContent = amount.toLocaleString("th-TH");
      updateChart(amount, savingGoal);
      loadSavingHistory(userId);

      alert("อัปเดตความคืบหน้าเรียบร้อย!");
    } catch (error) {
      console.error("Error updating progress:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดต");
    }
  });
}

/**
 * Loads the user's saving history from the "saving_history" subcollection.
 */
async function loadSavingHistory(userId) {
  const historyList = document.getElementById("history-list");
  if (!historyList) return;

  historyList.innerHTML = "";

  const historyQuery = query(collection(db, "goal", userId, "saving_history"));
  const historyDocs = await getDocs(historyQuery);

  historyDocs.forEach((docSnap) => {
    const data = docSnap.data();
    const entryAmount = data.amount !== undefined ? data.amount : 0;
    const entryDate = data.date || "ไม่ระบุวันที่";

    const historyItem = document.createElement("li");
    historyItem.classList.add("history-item");
    historyItem.innerHTML = `
      <span>${entryDate}: <strong>${entryAmount.toLocaleString("th-TH")}</strong> บาท</span>
      <button class="delete-btn" data-id="${docSnap.id}" data-amount="${entryAmount}">
        ลบ
      </button>
    `;

    historyList.appendChild(historyItem);
  });

  // Attach delete handlers
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      const historyId = event.target.getAttribute("data-id");
      const deleteAmount = parseFloat(event.target.getAttribute("data-amount"));
      await deleteSavingEntry(userId, historyId, deleteAmount);
    });
  });
}

/**
 * Deletes a history entry and updates the 'savings.amount' field.
 */
async function deleteSavingEntry(userId, historyId, deleteAmount) {
  const userDoc = doc(db, "goal", userId);

  try {
    // Decrement the local and Firestore amounts
    amount -= deleteAmount;
    if (amount < 0) amount = 0;

    await updateDoc(userDoc, { "savings.amount": amount });

    // Remove the doc from Firestore
    await deleteDoc(doc(db, "goal", userId, "saving_history", historyId));

    // Update UI
    document.getElementById("saved-amount").textContent = amount.toLocaleString("th-TH");
    updateChart(amount, savingGoal);
    loadSavingHistory(userId);

    alert("ลบข้อมูลเรียบร้อย!");
  } catch (error) {
    console.error("Error deleting saving entry:", error);
    alert("เกิดข้อผิดพลาดในการลบ");
  }
}

/**
 * Creates or updates the doughnut chart to show saved vs. goal.
 */
function updateChart(saved, goal) {
  const ctx = document.getElementById("savingsChart").getContext("2d");
  if (savingChart) savingChart.destroy();

  const progressPercentage = goal > 0 ? ((saved / goal) * 100).toFixed(1) : 0;
  const remainingPercentage = 100 - progressPercentage;

  //  Disable update button when savings is 100% or more
  const updateBtn = document.getElementById("update-progress-btn");
  if (progressPercentage >= 100 && updateBtn) {
    updateBtn.disabled = true;
    updateBtn.style.opacity = "0.5";
    updateBtn.style.cursor = "not-allowed";
    updateBtn.textContent = "บรรลุเป้าหมายแล้ว";
  } else if (updateBtn) {
    updateBtn.disabled = false;
    updateBtn.style.opacity = "1";
    updateBtn.style.cursor = "pointer";
    updateBtn.textContent = "อัปเดตความคืบหน้า";
  }

  savingChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [progressPercentage, remainingPercentage],
          backgroundColor: ["#28a745", "#fbbc04"],
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
