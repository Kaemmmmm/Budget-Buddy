import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc, query, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();
let investedAmount = 0;
let monthlyInvestment = 0;
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
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                monthlyInvestment = parseFloat(data.amount) || 0;
                const durationYears = parseFloat(data.duration) || 1;
                investedAmount = parseFloat(data.invested) || 0;
                goalAmount = monthlyInvestment * (durationYears * 12);

                document.getElementById("invested-amount").textContent = investedAmount.toLocaleString('th-TH');
                document.getElementById("goal-amount").textContent = goalAmount.toLocaleString('th-TH');

                updateChart(investedAmount, goalAmount);
                loadInvestmentHistory(userId);
            } else {
                console.error("No data found for user.");
                updateChart(0, 0);
            }
        } catch (error) {
            console.error("Error fetching DCA progress:", error);
        }
    });

    document.getElementById("update-progress-btn").addEventListener("click", updateProgress);
});

async function updateProgress() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            alert("กรุณาเข้าสู่ระบบก่อนอัปเดตข้อมูล");
            return;
        }

        const userId = user.uid;
        const userDoc = doc(db, "goal", userId);

        investedAmount += monthlyInvestment;

        try {
            await updateDoc(userDoc, { invested: investedAmount });

            const timestamp = new Date().toLocaleString("th-TH");
            await addDoc(collection(db, "goal", userId, "history"), {
                amount: monthlyInvestment,
                date: timestamp
            });

            document.getElementById("invested-amount").textContent = investedAmount.toLocaleString('th-TH');
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
    historyList.innerHTML = ""; // Clear list

    const historyQuery = query(collection(db, "goal", userId, "history"));
    const historyDocs = await getDocs(historyQuery);

    historyDocs.forEach((doc) => {
        const data = doc.data();
        const historyItem = document.createElement("li");
        historyItem.classList.add("history-item");
        historyItem.innerHTML = `
            <span>${data.date}: <strong>${data.amount.toLocaleString('th-TH')}</strong> บาท</span>
            <button class="delete-btn" data-id="${doc.id}" data-amount="${data.amount}">ลบ</button>
        `;

        historyList.appendChild(historyItem);
    });

    // Add delete functionality
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
        // Reduce the invested amount
        investedAmount -= deleteAmount;
        if (investedAmount < 0) investedAmount = 0; // Prevent negative values

        // Update Firebase
        await updateDoc(userDoc, { invested: investedAmount });

        // Delete history record
        await deleteDoc(doc(db, "goal", userId, "history", historyId));

        // Update UI
        document.getElementById("invested-amount").textContent = investedAmount.toLocaleString('th-TH');
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

    // Destroy existing chart before re-creating
    if (dcaChart) {
        dcaChart.destroy();
    }

    const progressPercentage = goalAmount > 0 ? ((investedAmount / goalAmount) * 100).toFixed(1) : 0;
    const remainingPercentage = 100 - progressPercentage;

    dcaChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            datasets: [{
                data: [progressPercentage, remainingPercentage],
                backgroundColor: ['#007bff', '#e0e0e0'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            }
        },
        plugins: [centerTextPlugin(progressPercentage)]
    });
}

// Chart.js Plugin to Show Percentage in the Center
function centerTextPlugin(progressPercentage) {
    return {
        id: "centerText",
        beforeDraw: (chart) => {
            const { width, height, ctx } = chart;
            ctx.restore();
            
            const fontSize = (height / 6).toFixed(2); // Adjust size dynamically
            ctx.font = `bold ${fontSize}px 'Prompt', sans-serif`; // Custom font
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";

            const text = `${progressPercentage}%`;
            const textX = width / 2;
            const textY = height / 2;

            ctx.fillStyle = "#007bff"; // Text color
            ctx.fillText(text, textX, textY);
            ctx.save();
        }
    };
}

