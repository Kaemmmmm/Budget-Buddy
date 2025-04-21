import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc, query, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();
let investmentDuration = 0;
let monthlyInvestment = 0;
let investedAmount = 0;
let goalAmount = 0;
let dcaChart;

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
        updateChart(0, 0);
        return;
      }

      const data = docSnap.data();

      if (!data.dca) {
        alert("คุณยังไม่ได้ตั้งเป้าหมายการลงทุนแบบ DCA กรุณาตั้งเป้าหมายก่อนใช้งานระบบ");
        window.location.href = "dashboard.html";
        return;
      }

      const tempMonthlyInvestment = parseFloat(data.dca.monthlyInvestment);
      const tempInvestmentDuration = parseFloat(data.dca.investmentDuration);
      investedAmount = parseFloat(data.dca.invested) || 0;

      if (isNaN(tempMonthlyInvestment) || isNaN(tempInvestmentDuration)) {
        alert("ข้อมูลเป้าหมายการลงทุนแบบ DCA ไม่สมบูรณ์ กรุณาตั้งค่าใหม่อีกครั้ง");
        window.location.href = "dashboard.html";
        return;
      }

      monthlyInvestment = tempMonthlyInvestment;
      investmentDuration = tempInvestmentDuration;
      goalAmount = monthlyInvestment * (investmentDuration * 12);

      document.getElementById("invested-amount").textContent = investedAmount.toLocaleString("th-TH");
      document.getElementById("goal-amount").textContent = goalAmount.toLocaleString("th-TH");

      updateChart(investedAmount, goalAmount);
      loadInvestmentHistory(userId);

    } catch (error) {
      console.error("Error fetching DCA progress:", error);
    }
  });

  document.getElementById("update-progress-btn").addEventListener("click", updateProgress);
});

async function updateProgress() {
  if (investedAmount >= goalAmount) {
    alert("คุณได้บรรลุเป้าหมายการลงทุนแบบ DCA แล้ว");
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
      const docSnap = await getDoc(userDoc);
      if (!docSnap.exists()) {
        alert("ไม่พบข้อมูลเป้าหมาย");
        return;
      }

      const data = docSnap.data();
      if (!data.dca) {
        alert("ไม่พบข้อมูลการลงทุนแบบ DCA กรุณาตั้งค่าเป้าหมายก่อน");
        return;
      }

      investedAmount += monthlyInvestment;

      await updateDoc(userDoc, {
        "dca.invested": investedAmount
      });

      await addDoc(collection(db, "goal", userId, "dca_history"), {
        amount: monthlyInvestment,
        date: new Date().toLocaleString("th-TH")
      });

      document.getElementById("invested-amount").textContent = investedAmount.toLocaleString("th-TH");
      updateChart(investedAmount, goalAmount);
      loadInvestmentHistory(userId);

      alert("อัปเดตความคืบหน้าเรียบร้อย!");
    } catch (error) {
      console.error("Error updating progress:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดต");
    }
  });
}

async function loadInvestmentHistory(userId) {
  const historyList = document.getElementById("history-list");
  historyList.innerHTML = "";

  const historyQuery = query(collection(db, "goal", userId, "dca_history"));
  const historyDocs = await getDocs(historyQuery);

  historyDocs.forEach((docItem) => {
    const data = docItem.data();
    const historyItem = document.createElement("li");
    historyItem.classList.add("history-item");

    historyItem.innerHTML = `
      <span>
        ${data.date}:
        <strong>${(parseFloat(data.amount) || 0).toLocaleString("th-TH")}</strong> บาท
      </span>
      <button
        class="delete-btn"
        data-id="${docItem.id}"
        data-amount="${data.amount}"
      >
        ลบ
      </button>
    `;

    historyList.appendChild(historyItem);
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      const historyId = event.target.getAttribute("data-id");
      const deleteAmount = parseFloat(event.target.getAttribute("data-amount"));
      await deleteInvestmentEntry(userId, historyId, deleteAmount);
    });
  });
}

async function deleteInvestmentEntry(userId, historyId, deleteAmount) {
  const userDoc = doc(db, "goal", userId);

  try {
    investedAmount -= deleteAmount;
    if (investedAmount < 0) investedAmount = 0;

    await updateDoc(userDoc, { "dca.invested": investedAmount });

    await deleteDoc(doc(db, "goal", userId, "dca_history", historyId));

    document.getElementById("invested-amount").textContent = investedAmount.toLocaleString("th-TH");
    updateChart(investedAmount, goalAmount);
    loadInvestmentHistory(userId);

    alert("ลบข้อมูลเรียบร้อย!");
  } catch (error) {
    console.error("❌ Error deleting investment entry:", error);
    alert("เกิดข้อผิดพลาดในการลบ");
  }
}

function updateChart(investedAmount, goalAmount) {
  const ctx = document.getElementById("dcaChart").getContext("2d");

  if (dcaChart) {
    dcaChart.destroy();
  }

  const progressPercentage = goalAmount > 0
    ? ((investedAmount / goalAmount) * 100).toFixed(1)
    : 0;
  const remainingPercentage = 100 - progressPercentage;

  const updateButton = document.getElementById("update-progress-btn");
  if (progressPercentage >= 100) {
    updateButton.disabled = true;
    updateButton.style.opacity = "0.5";
    updateButton.style.cursor = "not-allowed";
    updateButton.textContent = "บรรลุเป้าหมายแล้ว";
  } else {
    updateButton.disabled = false;
    updateButton.style.opacity = "1";
    updateButton.style.cursor = "pointer";
    updateButton.textContent = "อัปเดตความคืบหน้า";
  }

  dcaChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [progressPercentage, remainingPercentage],
          backgroundColor: ["#007bff", "#66adfa"],
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    },
    plugins: [centerTextPlugin(progressPercentage)]
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
      ctx.fillStyle = "#007bff";
      ctx.fillText(text, width / 2, height / 2);
      ctx.save();
    }
  };
}
