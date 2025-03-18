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

                if (data.dca) {
                    monthlyInvestment = parseFloat(data.dca.monthlyInvestment) || 0;
                    const investmentDuration = parseFloat(data.dca.investmentDuration) || 1;
                    investedAmount = parseFloat(data.dca.invested) || 0;
                    
                    goalAmount = monthlyInvestment * (investmentDuration * 12);

                    document.getElementById("invested-amount").textContent =
                        investedAmount.toLocaleString("th-TH");
                    document.getElementById("goal-amount").textContent =
                        goalAmount.toLocaleString("th-TH");

                    updateChart(investedAmount, goalAmount);
                } else {
                    console.error("No dca object found in user data.");
                    updateChart(0, 0);
                }

                // Now load from dca_history instead of history
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

        // Increase the invested amount
        investedAmount += monthlyInvestment;

        try {
            // Update nested field "dca.invested"
            await updateDoc(userDoc, {
                "dca.invested": investedAmount
            });

            // Add an entry to the new subcollection 'dca_history'
            const timestamp = new Date().toLocaleString("th-TH");
            await addDoc(collection(db, "goal", userId, "dca_history"), {
                monthlyInvestment: monthlyInvestment,
                investmentDate: timestamp
            });

            // Update UI
            document.getElementById("invested-amount").textContent =
                investedAmount.toLocaleString("th-TH");
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

    // Rename subcollection to dca_history
    const historyQuery = query(collection(db, "goal", userId, "dca_history"));
    const historyDocs = await getDocs(historyQuery);

    historyDocs.forEach((docItem) => {
        const data = docItem.data();
        const historyItem = document.createElement("li");
        historyItem.classList.add("history-item");

        historyItem.innerHTML = `
            <span>
                ${data.investmentDate}:
                <strong>${data.monthlyInvestment.toLocaleString("th-TH")}</strong> บาท
            </span>
            <button
                class="delete-btn"
                data-id="${docItem.id}"
                data-monthlyinvestment="${data.monthlyInvestment}"
            >
                ลบ
            </button>
        `;

        historyList.appendChild(historyItem);
    });

    // Add delete functionality
    document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", async (event) => {
            const historyId = event.target.getAttribute("data-id");
            const deleteAmount = parseFloat(event.target.getAttribute("data-monthlyinvestment"));
            await deleteInvestmentEntry(userId, historyId, deleteAmount);
        });
    });
}

async function deleteInvestmentEntry(userId, historyId, deleteAmount) {
    const userDoc = doc(db, "goal", userId);

    try {
        // Reduce the invested amount in memory
        investedAmount -= deleteAmount;
        if (investedAmount < 0) investedAmount = 0; // Prevent negative values

        // Update the nested "dca.invested" field
        await updateDoc(userDoc, { "dca.invested": investedAmount });

        // Delete the document from dca_history
        await deleteDoc(doc(db, "goal", userId, "dca_history", historyId));

        // Update UI
        document.getElementById("invested-amount").textContent =
            investedAmount.toLocaleString("th-TH");
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

    const progressPercentage = goalAmount > 0
        ? ((investedAmount / goalAmount) * 100).toFixed(1)
        : 0;
    const remainingPercentage = 100 - progressPercentage;

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
