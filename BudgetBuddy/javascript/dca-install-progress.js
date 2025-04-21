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
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();

// Installment variables
let paidMonths = 0;            // from data.installment.paidMonths
let installmentDuration = 0;   // in years (data.installment.installmentDuration)

// ฟังก์ชันคำนวณเงินผ่อนต่อเดือนแบบ flat rate
function calculateMonthlyPaymentFlatRate(principal, annualRate, months) {
  const totalInterest = principal * annualRate * (months / 12);
  const totalPayment = principal + totalInterest;
  return totalPayment / months;
}
// ฟังก์ชันคำนวณการผ่อนชำระโดยพิจารณาประเภทและระยะเวลาผ่อน
function calculateInstallmentPayment(principal, type, months) {
  let annualRate = 0;
  if (type === "house") {
    // สำหรับบ้าน: ถ้าผ่อนไม่เกิน 36 เดือน ใช้อัตราดอกเบี้ย 3% ต่อปี,
    // ถ้าผ่อนเกิน 36 เดือน ใช้อัตราดอกเบี้ย 7% ต่อปี
    annualRate = (months <= 36) ? 0.03 : 0.07;
  } else if (type === "car") {
    // สำหรับรถ: ถ้าผ่อนไม่เกิน 36 เดือน ใช้อัตราดอกเบี้ย 4% ต่อปี,
    // ถ้าผ่อนเกิน 36 เดือน ใช้อัตราดอกเบี้ย 9% ต่อปี
    annualRate = (months <= 36) ? 0.04 : 0.09;
  }
  return calculateMonthlyPaymentFlatRate(principal, annualRate, months);
}

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
        alert("ไม่พบข้อมูลผู้ใช้ กรุณาตั้งค่าเป้าหมายก่อน");
        window.location.href = "dashboard.html";
        return;
      }

      const data = docSnap.data();

      // ❗ Validate Installment
      if (
        !data.installment ||
        data.installment.installmentDuration === undefined ||
        data.installment.installmentDuration === null
      ) {
        alert("คุณยังไม่ได้ตั้งเป้าหมายการผ่อน กรุณาตั้งค่าก่อนใช้งาน");
        window.location.href = "dashboard.html";
        return;
      }

      // ❗ Validate DCA
      if (
        !data.dca ||
        data.dca.monthlyInvestment === undefined ||
        data.dca.investmentDuration === undefined
      ) {
        alert("คุณยังไม่ได้ตั้งเป้าหมายการลงทุนแบบ DCA กรุณาตั้งค่าก่อนใช้งาน");
        window.location.href = "dashboard.html";
        return;
      }

      // -----------------------------
      // Installment
      // -----------------------------
      paidMonths = data.installment.paidMonths || 0;
      installmentDuration = data.installment.installmentDuration || 0;

      const totalInstallmentMonths = installmentDuration * 12;
      const remainMonths = totalInstallmentMonths - paidMonths;

      document.getElementById("paid-months").textContent = paidMonths;
      document.getElementById("total-months").textContent = remainMonths;
      updateInstallmentChart(paidMonths, remainMonths);

      // -----------------------------
      // DCA
      // -----------------------------
      dcaInvested = data.dca.invested || 0;
      dcaDuration = data.dca.investmentDuration || 0;
      dcaMonthlyInvestment = data.dca.monthlyInvestment || 0;

      dcaGoal = dcaDuration * 12 * dcaMonthlyInvestment;

      document.getElementById("invested-amount").textContent = dcaInvested;
      document.getElementById("goal-amount").textContent = dcaGoal;
      updateDcaChart(dcaInvested, dcaGoal);

      await loadHistory(userId);

    } catch (error) {
      console.error("Error fetching data:", error);
      alert("เกิดข้อผิดพลาดในการโหลดข้อมูล");
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

  const dcaRef = collection(db, "goal", userId, "dca_history");
  const instRef = collection(db, "goal", userId, "installment_history");

  const [dcaSnap, instSnap] = await Promise.all([
    getDocs(dcaRef),
    getDocs(instRef)
  ]);

  // Convert Thai date string to Date object
  function parseThaiDate(dateStr) {
    try {
      const [datePart, timePart] = dateStr.split(" ");
      const [day, month, year] = datePart.split("/").map(Number);
      const [hour = 0, minute = 0, second = 0] = (timePart || "0:0:0").split(":").map(Number);
      return new Date(year - 543, month - 1, day, hour, minute, second);
    } catch {
      return new Date(); // fallback
    }
  }

  const dcaHistory = dcaSnap.docs.map(doc => ({
    id: doc.id,
    type: "investment",
    amount: doc.data().amount || doc.data().monthlyInvestment || 0,
    date: doc.data().date || "",
    timestamp: parseThaiDate(doc.data().date || "")
  }));

  const instHistory = instSnap.docs.map(doc => ({
    id: doc.id,
    type: "installment",
    amount: doc.data().amount || 0,
    date: doc.data().date || "",
    timestamp: parseThaiDate(doc.data().date || "")
  }));

  const mergedHistory = [...dcaHistory, ...instHistory].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  mergedHistory.forEach(entry => {
    const historyItem = document.createElement("li");
    historyItem.classList.add("history-item");

    const dateSpan = document.createElement("span");
    dateSpan.classList.add("history-date");
    dateSpan.textContent = entry.date;

    const typeSpan = document.createElement("span");
    typeSpan.classList.add("history-type");
    typeSpan.textContent = entry.type;

    const amountSpan = document.createElement("span");
    amountSpan.classList.add("history-amount");
    amountSpan.textContent = `${entry.amount.toLocaleString("th-TH")} บาท`;

    const deleteBtn = document.createElement("button");
    deleteBtn.classList.add("delete-btn");
    deleteBtn.textContent = "ลบ";
    deleteBtn.addEventListener("click", async () => {
      await deleteHistoryEntry(userId, entry.id, entry.type, entry.amount);
    });

    historyItem.appendChild(dateSpan);
    historyItem.appendChild(typeSpan);
    historyItem.appendChild(amountSpan);
    historyItem.appendChild(deleteBtn);

    historyList.appendChild(historyItem);
  });
}

const monthlyPayment = calculateInstallmentPayment(principal, type, months);


// ---------------------
// Installment Chart
// ---------------------
function updateInstallmentChart(paid, remain) {
  const canvas = document.getElementById("installmentChart");
  if (!canvas) return console.error("No #installmentChart element found!");

  if (installmentChart) installmentChart.destroy();

  const total = paid + remain;
  const pct = total > 0 ? ((paid / total) * 100).toFixed(1) : 0;

  //  Disable Installment update button if complete
  const instBtn = document.getElementById("update-installment-btn");
  if (instBtn) {
    if (pct >= 100) {
      instBtn.disabled = true;
      instBtn.style.opacity = "0.5";
      instBtn.style.cursor = "not-allowed";
      instBtn.textContent = "ผ่อนครบแล้ว";
    } else {
      instBtn.disabled = false;
      instBtn.style.opacity = "1";
      instBtn.style.cursor = "pointer";
      instBtn.textContent = "อัปเดตการผ่อน";
    }
  }

  installmentChart = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [paid, remain],
          backgroundColor: ["#ff4d94", "#ffd1e3"]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { display: false }
      }
    },
    plugins: [centerTextPlugin(pct, "#ff4d94")]
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

  //  Disable DCA update button if complete
  const dcaBtn = document.getElementById("update-dca-btn");
  if (dcaBtn) {
    if (pct >= 100) {
      dcaBtn.disabled = true;
      dcaBtn.style.opacity = "0.5";
      dcaBtn.style.cursor = "not-allowed";
      dcaBtn.textContent = "บรรลุเป้าหมายแล้ว";
    } else {
      dcaBtn.disabled = false;
      dcaBtn.style.opacity = "1";
      dcaBtn.style.cursor = "pointer";
      dcaBtn.textContent = "อัปเดต DCA";
    }
  }

  dcaChart = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: dataArr,
          backgroundColor: ["#007bff", "#66adfa"],
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { display: false }
      }
    },
    plugins: [centerTextPlugin(pct, "#007bff")]
  });
}


// ---------------------
// Center Text Plugin
// ---------------------
function centerTextPlugin(percentage, textColor) {
  return {
    id: "center-text",
    beforeDraw(chart) {
      const { width, height, ctx } = chart;
      ctx.restore();

      const fontSize = Math.min(width, height) / 6;
      ctx.font = `bold ${fontSize}px 'Prompt', sans-serif`;
      ctx.fillStyle = textColor;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      ctx.fillText(`${percentage}%`, width / 2, height / 2);
      ctx.save();
    }
  };
}

// ---------------------
// Update Installment
// ---------------------
async function updateInstallmentProgress() {
  const totalMonths = installmentDuration * 12;
  if (paidMonths >= totalMonths) {
    alert("คุณได้ผ่อนครบตามแผนแล้ว");
    return;
  }
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
      //    RENAMED: installmentAmount -> assetPrice
      inst.assetPrice = inst.assetPrice || 0;
      inst.installmentDuration = inst.installmentDuration || 1; // in years
      inst.paidMonths = inst.paidMonths || 0;

      // 2) Calculate monthlyPayment based on assetPrice
      const totalMonths = inst.installmentDuration * 12;
      const monthlyPayment = totalMonths > 0 ? inst.assetPrice / totalMonths : 0;

      // 3) Increment paidMonths
      inst.paidMonths++;
      if (inst.paidMonths > totalMonths) {
        inst.paidMonths = totalMonths;
      }

      // 4) Update Firestore
      await updateDoc(userDoc, {
        "installment.paidMonths": inst.paidMonths
      });

      // 5) Record the payment in **dca&installment_history** subcollection
      await addDoc(collection(db, "goal", userId, "installment_history"), {
        amount: monthlyPayment,
        date: new Date().toLocaleString("th-TH"),
      });

      // 6) Update local UI
      paidMonths = inst.paidMonths;
      const remain = totalMonths - paidMonths;

      document.getElementById("paid-months").textContent = paidMonths;
      document.getElementById("total-months").textContent = remain;

      updateInstallmentChart(paidMonths, remain);
      await loadHistory(userId);

      alert("อัปเดตความคืบหน้าการผ่อนเรียบร้อย!");
    } catch (err) {
      console.error("Error updating installment progress:", err);
    }
  });
}

// ---------------------
// Update DCA
// ---------------------
async function updateDcaProgress() {
  if (dcaInvested >= dcaGoal) {
    alert("คุณได้บรรลุเป้าหมายการลงทุนแบบ DCA แล้ว");
    return;
  }
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
        "dca.invested": dcaData.invested
      });

      // Add to **dca&installment_history**
      await addDoc(collection(db, "goal", userId, "dca_history"), {
        monthlyInvestment: dcaData.monthlyInvestment, 
        date: new Date().toLocaleString("th-TH"),
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
    // 1) Revert logic
    const snap = await getDoc(userDoc);
    if (!snap.exists()) throw new Error("No user doc found");
    
    const data = snap.data();

    if (entryType === "investment") {
      // DCA revert
      const dcaData = data.dca || {};
      dcaData.invested = dcaData.invested || 0;
      dcaData.invested -= deleteAmount;
      if (dcaData.invested < 0) dcaData.invested = 0;

      await updateDoc(userDoc, {
        "dca.invested": dcaData.invested
      });
    }
    else if (entryType === "installment") {
      // Installment revert
      const inst = data.installment || {};
      inst.paidMonths = inst.paidMonths || 0;
      inst.paidMonths--; 
      if (inst.paidMonths < 0) inst.paidMonths = 0;

      await updateDoc(userDoc, {
        "installment.paidMonths": inst.paidMonths
      });
    }

    // 2) Delete the doc from **dca&installment_history**
    const targetSubcollection = entryType === "investment" ? "dca_history" : "installment_history";
    await deleteDoc(doc(db, "goal", userId, targetSubcollection, historyId));
    

    // 3) Re-fetch to update charts
    const newSnap = await getDoc(userDoc);
    if (newSnap.exists()) {
      const newData = newSnap.data();

      // Update DCA chart
      const newDcaInvested = newData.dca?.invested ?? 0;
      const newDcaDuration = newData.dca?.investmentDuration ?? 0;
      const newDcaMonthlyInvestment = newData.dca?.monthlyInvestment ?? 0;
      const newDcaGoal = newDcaDuration * 12 * newDcaMonthlyInvestment;

      updateDcaChart(newDcaInvested, newDcaGoal);
      document.getElementById("invested-amount").textContent = newDcaInvested;
      document.getElementById("goal-amount").textContent = newDcaGoal;

      // Update Installment chart
      const newPaidMonths = newData.installment?.paidMonths ?? 0;
      const newInstallmentDuration = newData.installment?.installmentDuration ?? 0;
      const newTotalMonths = newInstallmentDuration * 12;
      const remain = newTotalMonths - newPaidMonths;

      updateInstallmentChart(newPaidMonths, remain);
      document.getElementById("paid-months").textContent = newPaidMonths;
      document.getElementById("total-months").textContent = remain;
    }

    // 4) Reload the list
    await loadHistory(userId);

    alert("ลบข้อมูลเรียบร้อย!");
  } catch (error) {
    console.error("❌ Error deleting history entry:", error);
    alert("เกิดข้อผิดพลาดในการลบ");
  }
}
