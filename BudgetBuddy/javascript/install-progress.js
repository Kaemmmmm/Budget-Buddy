import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, addDoc, deleteDoc, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();
let paidMonths = 0;
let totalMonths = 0;
let monthlyPayment = 0;
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
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                monthlyPayment = parseFloat(data.amount) || 0;
                totalMonths = parseFloat(data.duration) * 12 || 24;
                paidMonths = parseFloat(data.paidMonths) || 0;

                document.getElementById("paid-months").textContent = paidMonths;
                document.getElementById("total-months").textContent = totalMonths;

                updateChart(paidMonths, totalMonths);
                loadPaymentHistory(userId);
            } else {
                console.error("No data found for user.");
                updateChart(0, 24);
            }
        } catch (error) {
            console.error("Error fetching Installment progress:", error);
        }
    });

    const updatePaymentBtn = document.getElementById("update-payment-btn");
if (updatePaymentBtn) {
    updatePaymentBtn.addEventListener("click", updatePaymentProgress);
} else {
    console.error("Error: update-payment-btn element not found.");
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
            // Get the user's goal data
            const docSnap = await getDoc(userDoc);
            if (!docSnap.exists()) {
                alert("ไม่พบข้อมูลเป้าหมาย");
                return;
            }

            const data = docSnap.data();
            const assetPrice = parseFloat(data.assetPrice) || 0;
            const duration = parseFloat(data.duration) || 1;
            const installmentAmount = (assetPrice / (duration * 12)).toFixed(2); // New formula

            paidMonths += 1;
            if (paidMonths > totalMonths) paidMonths = totalMonths;

            await updateDoc(userDoc, { paidMonths });

            const timestamp = new Date().toLocaleString("th-TH");
            await addDoc(collection(db, "goal", userId, "installment_history"), {
                amount: installmentAmount,
                date: timestamp
            });

            document.getElementById("paid-months").textContent = paidMonths;
            updateChart(paidMonths, totalMonths);

            // **Ensure the updated history is loaded**
            setTimeout(() => {
                loadPaymentHistory(userId);
            }, 500); // Delay ensures Firebase updates are fetched properly

            alert(`อัปเดตความคืบหน้าเรียบร้อย! เพิ่ม ${installmentAmount} บาท`);
        } catch (error) {
            console.error("Error updating progress:", error);
            alert("เกิดข้อผิดพลาดในการอัปเดต");
        }
    });
}

async function loadPaymentHistory(userId) {
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = ""; // Clear old entries

    try {
        const historyQuery = query(
            collection(db, "goal", userId, "installment_history"),
            orderBy("date", "desc") // Ensure newest entries appear first
        );

        const historyDocs = await getDocs(historyQuery);

        // Check if history exists
        if (historyDocs.empty) {
            historyList.innerHTML = "<p style='text-align:center; color:gray;'>ไม่มีประวัติการชำระ</p>";
            return;
        }

        historyDocs.forEach((doc) => {
            const data = doc.data();
            const historyItem = document.createElement("li");
            historyItem.classList.add("history-item");
            historyItem.innerHTML = `
                <span>${data.date}: <strong>${parseFloat(data.amount).toLocaleString('th-TH')}</strong> บาท</span>
                <button class="delete-btn" data-id="${doc.id}">ลบ</button>
            `;

            historyList.appendChild(historyItem); // Ensure it's appended correctly
        });

        // Add delete functionality
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
        // Reduce the paid months
        paidMonths -= 1;
        if (paidMonths < 0) paidMonths = 0;

        // Update Firebase
        await updateDoc(userDoc, { paidMonths });

        // Delete history record
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

function updateChart(paidMonths, totalMonths) {
    const ctx = document.getElementById("installmentChart").getContext("2d");

    if (installmentChart) {
        installmentChart.destroy();
    }

    const progressPercentage = totalMonths > 0 ? ((paidMonths / totalMonths) * 100).toFixed(1) : 0;
    const remainingPercentage = 100 - progressPercentage;

    installmentChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            datasets: [{
                data: [progressPercentage, remainingPercentage],
                backgroundColor: ['#ff4d94', '#ffd1e3'],
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

// Chart.js Plugin to Display Percentage in Center
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
            const textX = width / 2;
            const textY = height / 2;

            ctx.fillStyle = "#ff4d94"; // Text color
            ctx.fillText(text, textX, textY);
            ctx.save();
        }
    };
}

