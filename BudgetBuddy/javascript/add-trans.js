// add-trans.js
import { db } from "../javascript/firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

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

window.saveTransaction = saveTransaction;
