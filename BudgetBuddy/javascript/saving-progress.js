import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, query, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();
let savedAmount = 0;
let savingGoal = 0;
let savingDuration = 1;
let amount = 0; // ✅ New variable to track how much user has saved so far
let savingChart;

const centerTextPlugin = (progressPercentage) => ({
    id: 'centerText',
    beforeDraw(chart) {
        const { width, height, ctx } = chart;
        ctx.restore();
        const fontSize = (height / 6).toFixed(2);
        ctx.font = `bold ${fontSize}px Prompt, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(`${progressPercentage}%`, width / 2, height / 2);
        ctx.save();
    }
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
                await setDoc(userDoc, { savingAmount: 100000, savingDuration: 10, amount: 0, goal: 100000 });
                savingGoal = 100000;
                savingDuration = 10;
                amount = 0;
            } else {
                const data = docSnap.data();
                savingGoal = parseFloat(data.savingAmount) || 100000;
                savingDuration = parseFloat(data.savingDuration) || 10;
                amount = parseFloat(data.amount) || 0;
            }

            document.getElementById("saved-amount").textContent = amount.toLocaleString('th-TH');
            document.getElementById("goal-amount").textContent = savingGoal.toLocaleString('th-TH');

            updateChart(amount, savingGoal);
            loadSavingHistory(userId);
        } catch (error) {
            console.error("Error fetching saving progress:", error);
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
        const amountToSave = parseFloat(savingGoal) / parseFloat(savingDuration);
        amount += amountToSave; // ✅ Update the correct variable to track savings

        try {
            await updateDoc(userDoc, { amount: amount });

            const timestamp = new Date().toLocaleString("th-TH");
            await addDoc(collection(db, "goal", userId, "saving_history"), { // ✅ Save in "saving_history"
                amount: amountToSave,
                date: timestamp
            });

            document.getElementById("saved-amount").textContent = amount.toLocaleString('th-TH');
            updateChart(amount, savingGoal);
            loadSavingHistory(userId);

            alert("อัปเดตความคืบหน้าเรียบร้อย!");
        } catch (error) {
            console.error("Error updating progress:", error);
            alert("เกิดข้อผิดพลาดในการอัปเดต");
        }
    });
}

async function deleteSavingEntry(userId, historyId, deleteAmount) {
    const userDoc = doc(db, "goal", userId);

    try {
        amount -= deleteAmount;
        if (amount < 0) amount = 0;

        await updateDoc(userDoc, { amount: amount });
        await deleteDoc(doc(db, "goal", userId, "saving_history", historyId));

        if (document.getElementById("saved-amount")) {
            document.getElementById("saved-amount").textContent = amount.toLocaleString('th-TH');
        }
        updateChart(amount, savingGoal);
        loadSavingHistory(userId);
        
        alert("ลบข้อมูลเรียบร้อย!");
    } catch (error) {
        console.error("Error deleting saving entry:", error);
        alert("เกิดข้อผิดพลาดในการลบ");
    }
}

async function loadSavingHistory(userId) {
    const historyList = document.getElementById("history-list");
    if (!historyList) return;
    historyList.innerHTML = "";

    const historyQuery = query(collection(db, "goal", userId, "saving_history")); // ✅ Fetch from "saving_history"
    const historyDocs = await getDocs(historyQuery);

    historyDocs.forEach((doc) => {
        const data = doc.data();
        const amount = data.amount !== undefined ? data.amount : 0; // Default to 0 if missing
        const date = data.date !== undefined ? data.date : "ไม่ระบุวันที่"; // Default message if missing

        const historyItem = document.createElement("li");
        historyItem.classList.add("history-item");
        historyItem.innerHTML = `
            <span>${date}: <strong>${amount.toLocaleString('th-TH')}</strong> บาท</span>
            <button class="delete-btn" data-id="${doc.id}" data-amount="${amount}">ลบ</button>
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

function updateChart(savedAmount, savingGoal) {
    const ctx = document.getElementById("savingsChart").getContext("2d");

    if (savingChart) {
        savingChart.destroy();
    }

    const progressPercentage = savingGoal > 0 ? ((savedAmount / savingGoal) * 100).toFixed(1) : 0;
    const remainingPercentage = 100 - progressPercentage;

    savingChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            datasets: [{
                data: [progressPercentage, remainingPercentage],
                backgroundColor: ['#28a745', '#fbbc04'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { 
                legend: { display: false }, 
                tooltip: { enabled: false } 
            }
        },
        plugins: [centerTextPlugin(progressPercentage)]
    });
}

