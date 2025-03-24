import { addDoc, collection } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { auth, db } from "../javascript/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

document.getElementById("save-btn").addEventListener("click", function() {
  // ดึงค่าจากฟอร์ม
  const date = document.getElementById("date").value;
  const amount = document.getElementById("amount").value;
  const transactionType = document.getElementById("transaction-type").value;
  const detail = document.getElementById("detail").value;
  
  // ตั้งค่า notify เป็น true โดยอัตโนมัติ (ไม่ต้องดึงค่าจาก element ที่ถูกลบไปแล้ว)
  const notify = true;

  // ตรวจสอบความถูกต้องของข้อมูล (ถ้ามีเงื่อนไขอื่นๆ เพิ่มเติมได้)
  if (!date || !amount || !transactionType) {
    alert("กรุณากรอกข้อมูลให้ครบ");
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        await addDoc(collection(db, "budget", user.uid, "transaction"), {
          date: date,
          amount: parseFloat(amount),
          type: transactionType,
          detail: detail,
          notify: notify,
          paid: false,
          createdAt: new Date()
        });
        alert("เพิ่มธุรกรรมเรียบร้อย");
        window.location.href = "calendar.html";
      } catch (error) {
        console.error("Error adding document: ", error);
        alert("เกิดข้อผิดพลาดในการเพิ่มธุรกรรม");
      }
    } else {
      alert("กรุณาเข้าสู่ระบบ");
    }
  });
});
