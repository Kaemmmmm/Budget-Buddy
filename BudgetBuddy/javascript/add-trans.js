// add-trans.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// กำหนดค่า Firebase ของคุณ (แก้ค่าให้ตรงกับโปรเจกต์)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
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
