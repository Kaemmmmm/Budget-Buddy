import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { auth, db } from "../javascript/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

function setupSaveButton() {
  const saveBtn = document.getElementById("save-btn");

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล");
      return;
    }

    saveBtn.addEventListener("click", async () => {
      const userId = user.uid;

      const date = document.getElementById("date").value;
      const amount = parseFloat(document.getElementById("amount").value);
      const type = document.getElementById("transaction-type").value;
      const detail = document.getElementById("detail").value;
      const notify = document.getElementById("notify").checked;

      if (!date || isNaN(amount) || !type) {
        alert("กรุณากรอกข้อมูลให้ครบ");
        return;
      }

      try {
        await addDoc(collection(db, "budget", userId, "transaction"), {
          date,
          amount,
          type,
          detail,
          notify,
          createdAt: serverTimestamp()
        });

        alert("✅ บันทึกสำเร็จ");
        window.location.href = "calendar.html";
      } catch (err) {
        console.error("เกิดข้อผิดพลาด:", err);
        alert("บันทึกไม่สำเร็จ");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", setupSaveButton);
