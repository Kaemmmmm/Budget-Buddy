import { db } from "../javascript/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = getAuth();
let transactionChart;

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      loadTransactionData(user.uid);
    } else {
      console.error("User not authenticated.");
    }
  });

  document.getElementById("saveButton").addEventListener("click", updateTransactionData);

  // Attach comma formatting to inputs
  ["income", "expense", "debt"].forEach(id => {
    const input = document.getElementById(id);
    if (input) attachCommaFormatting(input);
  });
});

function formatNumberWithCommas(value) {
  const numeric = value.replace(/,/g, '');
  if (isNaN(numeric)) return '';
  return parseFloat(numeric).toLocaleString('en-US');
}

function attachCommaFormatting(input) {
  input.addEventListener('input', () => {
    const cleaned = input.value.replace(/,/g, '');
    const formatted = formatNumberWithCommas(cleaned);
    input.value = formatted;
    input.setSelectionRange(formatted.length, formatted.length);
  });
}

function convertThaiDateToDateObject(thaiDateStr) {
  const [date, time] = thaiDateStr.split(" ");
  const [day, month, year] = date.split("/").map(Number);
  const [h, m, s] = time.split(":").map(Number);
  return new Date(year - 543, month - 1, day, h, m, s);
}

async function getMonthlyTotal(userId, subcol, amountField, dateField) {
  const ref = collection(db, "goal", userId, subcol);
  const snapshot = await getDocs(ref);
  const now = new Date();
  let total = 0;

  snapshot.forEach(doc => {
    const d = doc.data();
    if (d[dateField]) {
      const dateObj = convertThaiDateToDateObject(d[dateField]);
      if (dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear()) {
        total += parseFloat(d[amountField]) || 0;
      }
    }
  });
  return total;
}

async function loadTransactionData(userId) {
  try {
    const snap = await getDoc(doc(db, "goal", userId));
    if (!snap.exists()) throw new Error('No data');
    const data = snap.data();

    // populate inputs
    ['income','expense','debt'].forEach(id => {
      document.getElementById(id).value = (parseFloat(data[id])||0).toLocaleString();
    });

    // fetch breakdown
    const dca = await getMonthlyTotal(userId, "dca_history", "monthlyInvestment", "investmentDate");
    const savingsAmt = await getMonthlyTotal(userId, "saving_history", "amount", "date");
    const installment = await getMonthlyTotal(userId, "installment_history", "amount", "date");
    const emergency = await getMonthlyTotal(userId, "emergencyfund_history", "amount", "date");

    const savings = dca + savingsAmt + emergency; // exclude installment
    const income = parseFloat(data.income)||0;
    const expense = parseFloat(data.expense)||0;
    const debt = parseFloat(data.debt)||0;
    const remaining = income - expense - savings - installment - debt;

    updateChart(
      [income, expense, savings, installment, debt, remaining],
      { dca, savings: savingsAmt, installment, emergency }
    );
  } catch (err) {
    console.error(err);
    updateChart([0,0,0,0,0,0], { dca:0, savings:0, installment:0, emergency:0 });
  }
}

async function updateTransactionData() {
  const user = auth.currentUser;
  if (!user) return alert("กรุณาเข้าสู่ระบบก่อนอัปเดตข้อมูล");

  const vals = ['income','expense','debt'].reduce((o,id) => {
    o[id] = parseFloat(document.getElementById(id).value.replace(/,/g,''))||0;
    return o;
  }, {});

  try {
    await setDoc(doc(db, "goal", user.uid), { ...vals, timestamp: new Date() }, { merge: true });
    await loadTransactionData(user.uid);
    alert("ข้อมูลได้รับการอัปเดตเรียบร้อย!");
    window.location.href = "dashboard.html";
  } catch (e) {
    console.error(e);
    alert("เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
  }
}

function updateChart(arr, det) {
  const ctx = document.getElementById("transactionChart").getContext("2d");
  if (transactionChart) transactionChart.destroy();

  transactionChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ["รายรับ","รายจ่าย","เงินออม","เงินซ้อมผ่อน","หนี้สิน","เงินคงเหลือ"],
      datasets: [{
        data: arr,
        backgroundColor: [
          '#2ecc71','#e74c3c','#2980b9','#ffd1e3','#d35400','#1abc9c'
        ]
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          titleFont: { family: 'Prompt', size: 14 },
          bodyFont: { family: 'Prompt', size: 14 },
          callbacks: {
            label: ctx => {
              const i = ctx.dataIndex;
              const val = ctx.raw.toLocaleString() + ' บาท';
              if (i === 2) {
                return [
                  `เงินออมรวม: ${val}`,
                  ` • DCA: ${det.dca.toLocaleString()} บาท`,
                  ` • เงินออม: ${det.savings.toLocaleString()} บาท`,
                  ` • ฉุกเฉิน: ${det.emergency.toLocaleString()} บาท`
                ];
              }
              if (i === 3) return `เงินซ้อมผ่อน: ${det.installment.toLocaleString()} บาท`;
              const lbls = ["รายรับ","รายจ่าย","เงินออม","เงินซ้อมผ่อน","หนี้สิน","เงินคงเหลือ"];
              return `${lbls[i]}: ${val}`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { font: { family: 'Prompt', size: 14 } } },
        y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + ' บาท', font: { family: 'Prompt', size: 14 } } }
      }
    }
  });
}
