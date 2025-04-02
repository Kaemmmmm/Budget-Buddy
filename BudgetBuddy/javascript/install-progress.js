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
        updateChart(0, 12);
        return;
      }

      const data = docSnap.data();
      if (!data.installment) {
        alert("คุณยังไม่ได้ตั้งเป้าหมายการผ่อน กรุณาตั้งเป้าหมายก่อนใช้งานระบบ");
        window.location.href = "dashboard.html";
        return;
      }

      // ✅ Check if any required field is missing
      const { assetPrice, assetType, installmentDuration } = data.installment;
      if (
        assetPrice === undefined || assetPrice === null ||
        assetType === undefined || assetType.trim() === "" ||
        installmentDuration === undefined || installmentDuration === null
      ) {
        alert("ข้อมูลเป้าหมายการผ่อนไม่สมบูรณ์ กรุณาตั้งค่าใหม่อีกครั้ง");
        window.location.href = "dashboard.html";
        return;
      }

      const assetPriceFloat = parseFloat(assetPrice) || 0;
      const installmentDurationFloat = parseFloat(installmentDuration) || 1;

      paidMonths = parseFloat(data.installment.paidMonths) || 0;
      totalMonths = installmentDurationFloat * 12;

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


async function updatePaymentProgress() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนอัปเดตข้อมูล");
      return;
    }

    const userId = user.uid;
    const userDoc = doc(db, "goal", userId);

    try {
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
      const installmentDuration = parseFloat(data.installment.installmentDuration) || 1;
      const months = installmentDuration * 12;
      const type = data.installment.assetType;

      paidMonths = parseFloat(data.installment.paidMonths) || 0;
      paidMonths += 1;
      if (paidMonths > months) paidMonths = months;

      let annualRate = 0;
      if (type === "house") {
        annualRate = months <= 36 ? 0.03 : 0.07;
      } else if (type === "car") {
        annualRate = months <= 36 ? 0.04 : 0.09;
      }

      const installmentAmount = calculateMonthlyPaymentFlatRate(assetPrice, annualRate, months).toFixed(2);

      await updateDoc(userDoc, {
        "installment.paidMonths": paidMonths,
      });

      const timestamp = new Date().toLocaleString("th-TH");
      await addDoc(collection(db, "goal", userId, "installment_history"), {
        amount: installmentAmount,
        date: timestamp,
      });

      document.getElementById("paid-months").textContent = paidMonths;
      totalMonths = months;
      updateChart(paidMonths, totalMonths);

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

async function loadPaymentHistory(userId) {
  const historyList = document.getElementById("history-list");
  historyList.innerHTML = "";

  try {
    const historyQuery = query(
      collection(db, "goal", userId, "installment_history"),
      orderBy("date", "desc")
    );
    const historyDocs = await getDocs(historyQuery);

    if (historyDocs.empty) {
      historyList.innerHTML = "<p style='text-align:center; color:gray;'>ไม่มีประวัติการชำระ</p>";
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

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        const historyId = event.target.getAttribute("data-id");
        await deletePaymentEntry(userId, historyId);
      });
    });
  } catch (error) {
    console.error("❌ Error fetching history:", error);
    historyList.innerHTML = "<p style='text-align:center; color:red;'>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>";
  }
}

async function deletePaymentEntry(userId, historyId) {
  const userDoc = doc(db, "goal", userId);

  try {
    const docSnap = await getDoc(userDoc);
    if (docSnap.exists() && docSnap.data().installment) {
      paidMonths = parseFloat(docSnap.data().installment.paidMonths) || 0;
    } else {
      paidMonths = 0;
    }

    paidMonths -= 1;
    if (paidMonths < 0) paidMonths = 0;

    await updateDoc(userDoc, { "installment.paidMonths": paidMonths });
    await deleteDoc(doc(db, "goal", userId, "installment_history", historyId));

    document.getElementById("paid-months").textContent = paidMonths;
    updateChart(paidMonths, totalMonths);
    loadPaymentHistory(userId);

    alert("ลบข้อมูลเรียบร้อย!");
  } catch (error) {
    console.error("❌ Error deleting payment entry:", error);
    alert("เกิดข้อผิดพลาดในการลบ");
  }
}

function updateChart(paidMonths, totalMonths) {
  const ctx = document.getElementById("installmentChart").getContext("2d");

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
      ctx.fillStyle = "#ff4d94";
      ctx.fillText(text, width / 2, height / 2);
      ctx.save();
    },
  };
}

function calculateMonthlyPaymentFlatRate(principal, annualRate, months) {
  const totalInterest = principal * annualRate * (months / 12);
  const totalPayment = principal + totalInterest;
  return totalPayment / months;
}

function fetchAndShowInstallmentSummary() {
  // Optional summary feature
}

fetchAndShowInstallmentSummary();


// ใช้สูตรเป็น flat rate  สมมติ
// interest = 100,000 × 0.07 × (60 / 12) = 35,000
// รวมต้องจ่ายทั้งหมด = 100,000 + 35,000 = 135,000
// หาร 60 เดือน = 135,000 / 60 = 2,250 บาท/เดือน ✅
