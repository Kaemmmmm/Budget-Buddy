import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();

// Installment variables
let paidMonths = 0;           // from data.installment.paidMonths
let installmentDuration = 0;  // in years (data.installment.installmentDuration)

// DCA variables
let dcaInvested = 0;           // data.dca.invested
let dcaDuration = 0;           // in years (data.dca.investmentDuration)
let dcaMonthlyInvestment = 0;  // data.dca.monthlyInvestment
let dcaGoal = 0;               // (dcaDuration*12)*dcaMonthlyInvestment

// Chart references
let installmentChart, dcaChart;

// On page load
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
        return;
      }

      // Extract data
      const data = docSnap.data();

      // -----------------------------
      // Installment
      // -----------------------------
      if (data.installment) {
        paidMonths = data.installment.paidMonths || 0;
        installmentDuration = data.installment.installmentDuration || 0;
      } else {
        paidMonths = 0;
        installmentDuration = 0;
      }

      const totalInstallmentMonths = installmentDuration * 12;
      const remainMonths = totalInstallmentMonths - paidMonths;

      // Update text
      document.getElementById("paid-months").textContent = paidMonths;
      // CORRECT for your HTML
        document.getElementById("total-months").textContent = remainMonths;


      // Draw installment chart => [paidMonths, remainMonths]
      updateInstallmentChart(paidMonths, remainMonths);

      // -----------------------------
      // DCA
      // -----------------------------
      if (data.dca) {
        dcaInvested = data.dca.invested || 0;
        dcaDuration = data.dca.investmentDuration || 0;
        dcaMonthlyInvestment = data.dca.monthlyInvestment || 0;
      } else {
        dcaInvested = 0;
        dcaDuration = 0;
        dcaMonthlyInvestment = 0;
      }

      dcaGoal = (dcaDuration * 12) * dcaMonthlyInvestment;

      // Update text
      document.getElementById("invested-amount").textContent = dcaInvested;
      document.getElementById("goal-amount").textContent = dcaGoal;

      // Draw DCA chart => [dcaInvested, dcaGoal - dcaInvested]
      updateDcaChart(dcaInvested, dcaGoal);

      // -----------------------------
      // Load history
      // -----------------------------
      await loadHistory(userId);

    } catch (error) {
      console.error("Error fetching data:", error);
    }
  });

  // Button listeners
  document
    .getElementById("update-installment-btn")
    .addEventListener("click", updateInstallmentProgress);
  document
    .getElementById("update-dca-btn")
    .addEventListener("click", updateDcaProgress);
});

// ---------------------
// loadHistory
// ---------------------
async function loadHistory(userId) {
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = "";
  
    // Order by 'timestamp' descending so newest doc is first
    const historyRef = collection(db, "goal", userId, "history");
    const historyQuery = query(historyRef, orderBy("timestamp", "desc"));
  
    const historyDocs = await getDocs(historyQuery);
  
    // The first doc in this loop is the newest
    historyDocs.forEach((docSnap) => {
        const docId = docSnap.id;
        const data = docSnap.data();
        const dateText = data.date || "";
        const entryType = data.type || "unknown";
        const amountText = data.amount
          ? `${data.amount.toLocaleString('th-TH')} บาท`
          : "";
      
        // 1) Create the <li>
        const historyItem = document.createElement("li");
        historyItem.classList.add("history-item");
            
        // 2) Create separate <span> elements for date, type, amount
        const dateSpan = document.createElement("span");
        dateSpan.classList.add("history-date");
        dateSpan.textContent = dateText;
            
        const typeSpan = document.createElement("span");
        typeSpan.classList.add("history-type");
        typeSpan.textContent = entryType;
            
        const amountSpan = document.createElement("span");
        amountSpan.classList.add("history-amount");
        amountSpan.textContent = amountText;
            
        // 3) Create a delete <button>
        const deleteBtn = document.createElement("button");
        deleteBtn.classList.add("delete-btn");
        deleteBtn.textContent = "ลบ";
        deleteBtn.addEventListener("click", async () => {
          await deleteHistoryEntry(userId, docId, entryType, data.amount);
        });
        
        // 4) Append all four in order
        historyItem.appendChild(dateSpan);
        historyItem.appendChild(typeSpan);
        historyItem.appendChild(amountSpan);
        historyItem.appendChild(deleteBtn);
        
        // 5) Finally, append <li> to the list
        historyList.appendChild(historyItem);

      });
      
  }
  

// ---------------------
// Installment Chart
// ---------------------
function updateInstallmentChart(paid, remain) {
  const canvas = document.getElementById("installmentChart");
  if (!canvas) return console.error("No #installmentChart element found!");

  if (installmentChart) installmentChart.destroy();

  const total = paid + remain;
  const pct = total > 0 ? ((paid / total) * 100).toFixed(1) : 0;

  installmentChart = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [paid, remain],
          backgroundColor: ["#ff4d94", "#ffd1e3"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",          // <--- higher means thinner ring
      plugins: {
        legend: { display: false },
      },
    },
    plugins: [centerTextPlugin(pct)],
  });
}

// ---------------------
// DCA Chart
// ---------------------
function updateDcaChart(invested, goal) {
  const canvas = document.getElementById("dcaChart");
  if (!canvas) return console.error("No #dcaChart element found!");

  if (dcaChart) dcaChart.destroy();

  const pct = goal > 0 ? ((invested / goal) * 100).toFixed(1) : 0;
  const dataArr = goal > 0 ? [invested, goal - invested] : [0, 1];

  dcaChart = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: dataArr,
          backgroundColor: ["#007bff", "#e0e0e0"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",          // <--- higher means thinner ring
      plugins: {
        legend: { display: false },
      },
    },
    plugins: [centerTextPlugin(pct)],
  });
}

// ---------------------
// Center Text Plugin
// ---------------------
function centerTextPlugin(percentage) {
  return {
    id: "center-text",
    beforeDraw(chart) {
      const { width, height, ctx } = chart;
      ctx.restore();

      const fontSize = Math.min(width, height) / 6;
      ctx.font = `bold ${fontSize}px 'Prompt', sans-serif`;
      ctx.fillStyle = "#000";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      ctx.fillText(`${percentage}%`, width / 2, height / 2);
      ctx.save();
    },
  };
}

// ---------------------
// Update Installment
// ---------------------
async function updateInstallmentProgress() {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        alert("กรุณาเข้าสู่ระบบก่อนอัปเดตข้อมูล");
        return;
      }
  
      const userId = user.uid;
      const userDoc = doc(db, "goal", userId);
  
      try {
        const snap = await getDoc(userDoc);
        if (!snap.exists()) return;
  
        const data = snap.data();
        const inst = data.installment || {};
  
        // 1) Extract needed fields
        inst.installmentAmount = inst.installmentAmount || 0;
        inst.installmentDuration = inst.installmentDuration || 1; // in years
        inst.paidMonths = inst.paidMonths || 0;
  
        // 2) Calculate monthlyPayment
        const totalMonths = inst.installmentDuration * 12;
        const monthlyPayment = inst.installmentAmount / totalMonths || 0;
  
        // 3) Increment paidMonths
        inst.paidMonths++;
        if (inst.paidMonths > totalMonths) {
          inst.paidMonths = totalMonths;
        }
  
        // 4) Update Firestore
        await updateDoc(userDoc, {
          "installment.paidMonths": inst.paidMonths
        });
  
        // 5) Record the payment in history with 'amount'
        await addDoc(collection(db, "goal", userId, "history"), {
            type: "installment",
            amount: monthlyPayment,
            date: new Date().toLocaleString("th-TH"),
            timestamp: serverTimestamp() // from Firestore
          });
  
        // 6) Recompute local + UI
        // Re-draw chart, re-display text, etc. 
        // (sample code below)
        paidMonths = inst.paidMonths;
        const remain = totalMonths - paidMonths;
  
        document.getElementById("paid-months").textContent = paidMonths;
        document.getElementById("total-months").textContent = remain;
  
        updateInstallmentChart(paidMonths, remain);
        await loadHistory(userId);
  
        alert("อัปเดตความคืบหน้าการซ้อมผ่อนเรียบร้อย!");
      } catch (err) {
        console.error("Error updating installment progress:", err);
      }
    });
  }
  
  

// ---------------------
// Update DCA
// ---------------------
async function updateDcaProgress() {
  console.log("Updating DCA progress...");
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนอัปเดตข้อมูล");
      return;
    }

    const userId = user.uid;
    const userDoc = doc(db, "goal", userId);

    try {
      const snap = await getDoc(userDoc);
      if (!snap.exists()) return;

      const data = snap.data();
      const dcaData = data.dca || {};
      dcaData.invested = dcaData.invested || 0;
      dcaData.investmentDuration = dcaData.investmentDuration || 0; // years
      dcaData.monthlyInvestment = dcaData.monthlyInvestment || 0;

      // Increase invested
      dcaData.invested += dcaData.monthlyInvestment;

      // Write back
      await updateDoc(userDoc, {
        "dca.invested": dcaData.invested,
      });

      // Add to history
      const timestamp = new Date().toLocaleString("th-TH");
      await addDoc(collection(db, "goal", userId, "history"), {
        type: "investment",
        amount: dcaData.monthlyInvestment, // this is the actual DCA amount
        date: new Date().toLocaleString("th-TH"),
        timestamp: serverTimestamp()
      });

      // Update local
      dcaInvested = dcaData.invested;
      dcaDuration = dcaData.investmentDuration;
      dcaMonthlyInvestment = dcaData.monthlyInvestment;
      dcaGoal = dcaDuration * 12 * dcaMonthlyInvestment;

      // Update text
      document.getElementById("invested-amount").textContent = dcaInvested;
      document.getElementById("goal-amount").textContent = dcaGoal;

      // Re-draw chart
      updateDcaChart(dcaInvested, dcaGoal);

      // Reload history
      await loadHistory(userId);

      alert("อัปเดตความคืบหน้า DCA เรียบร้อย!");
    } catch (err) {
      console.error("Error updating DCA progress:", err);
    }
  });
}

async function deleteHistoryEntry(userId, historyId, entryType, deleteAmount = 0) {
    const userDoc = doc(db, "goal", userId);
  
    try {
      // 1) Revert logic (like subtract from dca.invested if type === 'investment')
      const snap = await getDoc(userDoc);
      if (!snap.exists()) throw new Error("No user doc found");
      
      const data = snap.data();
  
      if (entryType === "investment") {
        const dcaData = data.dca || {};
        dcaData.invested = dcaData.invested || 0;
        dcaData.invested -= deleteAmount;
        if (dcaData.invested < 0) dcaData.invested = 0;
  
        await updateDoc(userDoc, {
          "dca.invested": dcaData.invested
        });
      }
      else if (entryType === "installment") {
        const inst = data.installment || {};
        inst.paidMonths = inst.paidMonths || 0;
        inst.paidMonths--; // if you want to revert by 1 month
        if (inst.paidMonths < 0) inst.paidMonths = 0;
  
        await updateDoc(userDoc, {
          "installment.paidMonths": inst.paidMonths
        });
      }
  
      // 2) Delete the doc from history
      await deleteDoc(doc(db, "goal", userId, "history", historyId));
  
      // 3) Re-fetch the doc to get the new, updated values
      const newSnap = await getDoc(userDoc);
      if (newSnap.exists()) {
        const newData = newSnap.data();
  
        // Re-draw your charts. For example, if you have:
        //   - dcaInvested = newData.dca.invested
        //   - totalMonths = newData.installment.installmentDuration * 12
        //   - paidMonths = newData.installment.paidMonths
        // Then call your chart update functions:
  
        const newDcaInvested = newData.dca?.invested ?? 0;
        const newDcaDuration = newData.dca?.investmentDuration ?? 0;
        const newDcaMonthlyInvestment = newData.dca?.monthlyInvestment ?? 0;
        const newDcaGoal = newDcaDuration * 12 * newDcaMonthlyInvestment;
  
        updateDcaChart(newDcaInvested, newDcaGoal);
        document.getElementById("invested-amount").textContent = newDcaInvested;
        document.getElementById("goal-amount").textContent = newDcaGoal;
  
        const newPaidMonths = newData.installment?.paidMonths ?? 0;
        const newInstallmentDuration = newData.installment?.installmentDuration ?? 0;
        const newTotalMonths = newInstallmentDuration * 12;
        const remain = newTotalMonths - newPaidMonths;
  
        updateInstallmentChart(newPaidMonths, remain);
        document.getElementById("paid-months").textContent = newPaidMonths;
        document.getElementById("total-months").textContent = remain;
      }
  
      // 4) Reload the history list
      await loadHistory(userId);
  
      alert("ลบข้อมูลเรียบร้อย!");
    } catch (error) {
      console.error("❌ Error deleting history entry:", error);
      alert("เกิดข้อผิดพลาดในการลบ");
    }
  }
  
