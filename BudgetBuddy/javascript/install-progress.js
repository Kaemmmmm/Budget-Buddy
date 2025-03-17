import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();

// These track installment progress in memory
let paidMonths = 0;
let totalMonths = 0;
let installmentChart;

document.addEventListener("DOMContentLoaded", () => {
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
        console.error("No data found for user.");
        updateChart(0, 12); // or default 0/24, as you prefer
        return;
      }

      const data = docSnap.data();
      if (!data.installment) {
        console.error("No 'installment' object found in user data.");
        updateChart(0, 12);
        return;
      }

      // Pull the nested fields from data.installment
      const assetPrice = parseFloat(data.installment.assetPrice) || 0;
      const installmentDuration = parseFloat(data.installment.installmentDuration) || 1;

      // We'll treat paidMonths as nested under installment
      paidMonths = parseFloat(data.installment.paidMonths) || 0;

      // totalMonths is the total number of monthly payments
      totalMonths = installmentDuration * 12;

      document.getElementById("paid-months").textContent = paidMonths;
      document.getElementById("total-months").textContent = totalMonths;

      updateChart(paidMonths, totalMonths);
      loadPaymentHistory(userId);

    } catch (error) {
      console.error("Error fetching Installment progress:", error);
    }
  });

  const updatePaymentBtn = document.getElementById("update-payment-btn");
  if (updatePaymentBtn) {
    updatePaymentBtn.addEventListener("click", updatePaymentProgress);
  } else {
    console.error("Error: #update-payment-btn element not found.");
  }
});

/**
 * Increments paidMonths by 1 and stores a record in 'installment_history'.
 */
async function updatePaymentProgress() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนอัปเดตข้อมูล");
      return;
    }

    const userId = user.uid;
    const userDoc = doc(db, "goal", userId);

    try {
      // Fetch the latest data so we don't overwrite anything
      const docSnap = await getDoc(userDoc);
      if (!docSnap.exists()) {
        alert("ไม่พบข้อมูลเป้าหมาย");
        return;
      }

      const data = docSnap.data();
      if (!data.installment) {
        alert("ไม่พบข้อมูลการผ่อน (installment object)");
        return;
      }

      const assetPrice = parseFloat(data.installment.assetPrice) || 0;
      const installmentDuration =
        parseFloat(data.installment.installmentDuration) || 1;
      // Re-fetch the current paidMonths in case another device updated it
      paidMonths = parseFloat(data.installment.paidMonths) || 0;

      // Increase paidMonths
      paidMonths += 1;
      const maxMonths = installmentDuration * 12;
      if (paidMonths > maxMonths) paidMonths = maxMonths;

      // Calculate how much is paid in this installment
      const installmentAmount = (assetPrice / maxMonths).toFixed(2);

      // Update nested field "installment.paidMonths"
      await updateDoc(userDoc, {
        "installment.paidMonths": paidMonths,
      });

      // Store a payment record in subcollection "installment_history"
      const timestamp = new Date().toLocaleString("th-TH");
      await addDoc(collection(db, "goal", userId, "installment_history"), {
        amount: installmentAmount,
        date: timestamp,
      });

      // Update UI
      document.getElementById("paid-months").textContent = paidMonths;
      totalMonths = maxMonths;
      updateChart(paidMonths, totalMonths);

      // Reload the payment history to show the new record
      setTimeout(() => {
        loadPaymentHistory(userId);
      }, 500);

      alert(`อัปเดตความคืบหน้าเรียบร้อย! เพิ่ม ${installmentAmount} บาท`);
    } catch (error) {
      console.error("Error updating progress:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดต");
    }
  });
}

/**
 * Loads all payment records from the "installment_history" subcollection.
 */
async function loadPaymentHistory(userId) {
  const historyList = document.getElementById("history-list");
  historyList.innerHTML = ""; // Clear old entries

  try {
    const historyQuery = query(
      collection(db, "goal", userId, "installment_history"),
      orderBy("date", "desc")
    );
    const historyDocs = await getDocs(historyQuery);

    if (historyDocs.empty) {
      historyList.innerHTML =
        "<p style='text-align:center; color:gray;'>ไม่มีประวัติการชำระ</p>";
      return;
    }

    historyDocs.forEach((docItem) => {
      const hdata = docItem.data();
      const historyItem = document.createElement("li");
      historyItem.classList.add("history-item");

      historyItem.innerHTML = `
        <span>
          ${hdata.date}: 
          <strong>${parseFloat(hdata.amount).toLocaleString("th-TH")}</strong> บาท
        </span>
        <button class="delete-btn" data-id="${docItem.id}">ลบ</button>
      `;
      historyList.appendChild(historyItem);
    });

    // Bind delete buttons
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        const historyId = event.target.getAttribute("data-id");
        await deletePaymentEntry(userId, historyId);
      });
    });
  } catch (error) {
    console.error("❌ Error fetching history:", error);
    historyList.innerHTML =
      "<p style='text-align:center; color:red;'>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>";
  }
}

/**
 * Deletes a payment entry from Firestore, then decrements paidMonths by 1.
 */
async function deletePaymentEntry(userId, historyId) {
  const userDoc = doc(db, "goal", userId);

  try {
    // Re-fetch the latest data to avoid conflicts
    const docSnap = await getDoc(userDoc);
    if (docSnap.exists() && docSnap.data().installment) {
      paidMonths = parseFloat(docSnap.data().installment.paidMonths) || 0;
    } else {
      paidMonths = 0;
    }

    // Decrement paidMonths
    paidMonths -= 1;
    if (paidMonths < 0) paidMonths = 0;

    // Update the nested field
    await updateDoc(userDoc, { "installment.paidMonths": paidMonths });

    // Delete the history document
    await deleteDoc(doc(db, "goal", userId, "installment_history", historyId));

    // Update UI
    document.getElementById("paid-months").textContent = paidMonths;
    updateChart(paidMonths, totalMonths);
    loadPaymentHistory(userId);

    alert("ลบข้อมูลเรียบร้อย!");
  } catch (error) {
    console.error("❌ Error deleting payment entry:", error);
    alert("เกิดข้อผิดพลาดในการลบ");
  }
}

/**
 * Rebuilds the Chart.js doughnut with updated paid vs. total months.
 */
function updateChart(paidMonths, totalMonths) {
  const ctx = document.getElementById("installmentChart").getContext("2d");

  // Destroy existing chart before re-creating
  if (installmentChart) {
    installmentChart.destroy();
  }

  const progressPercentage =
    totalMonths > 0 ? ((paidMonths / totalMonths) * 100).toFixed(1) : 0;
  const remainingPercentage = 100 - progressPercentage;

  installmentChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [progressPercentage, remainingPercentage],
          backgroundColor: ["#ff4d94", "#ffd1e3"],
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

/**
 * Chart.js Plugin to display the percentage in the center of the doughnut.
 */
function centerTextPlugin(progressPercentage) {
  return {
    id: "centerText",
    beforeDraw: (chart) => {
      const { width, height, ctx } = chart;
      ctx.restore();

      const fontSize = (height / 6).toFixed(2);
      ctx.font = `bold ${fontSize}px 'Prompt', sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      const text = `${progressPercentage}%`;
      ctx.fillStyle = "#ff4d94"; // Text color
      ctx.fillText(text, width / 2, height / 2);
      ctx.save();
    },
  };
}
