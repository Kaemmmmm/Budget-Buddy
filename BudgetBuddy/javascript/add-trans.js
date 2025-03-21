// add-trans.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.jss";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";


const firebaseConfig = {
    apiKey: "AIzaSyCzweQFQb-y7vXMzHfHEhCfcYz2t05frQM",
    authDomain: "budgetbuddy-cac4f.firebaseapp.com",
    projectId: "budgetbuddy-cac4f",
    storageBucket: "budgetbuddy-cac4f.firebasestorage.app",
    messagingSenderId: "785181671270",
    appId: "1:785181671270:web:f7a9cac1029431dd3752a7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function saveTransaction() {
  const dateValue = document.getElementById("date").value;
  const amountValue = document.getElementById("amount").value;
  const transactionTypeValue = document.getElementById("transaction-type").value;
  const detailValue = document.getElementById("detail").value;
  const notifyValue = document.getElementById("notify").checked;

  if (!dateValue || !amountValue || !transactionTypeValue) {
    alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    return;
  }

  try {
    await addDoc(collection(db, "transactions"), {
      date: dateValue,
      amount: parseFloat(amountValue),
      transactionType: transactionTypeValue,
      detail: detailValue,
      notify: notifyValue,
      createdAt: serverTimestamp(),
    });
    console.log("บันทึกข้อมูลสำเร็จ");
    window.location.href = "calendar.html";
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล:", error);
    alert("ไม่สามารถบันทึกข้อมูลได้ โปรดลองอีกครั้ง");
  }
}

// ผูกฟังก์ชันให้เป็น global เพื่อให้ HTML เรียกใช้ได้
window.saveTransaction = saveTransaction;
