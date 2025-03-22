import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { db } from "../javascript/firebase.js"; // ใช้ db จาก firebase.js ที่ initialize แล้ว

async function loadNotifications() {
  const list = document.getElementById("notification-list");
  list.innerHTML = ""; // เคลียร์ข้อมูลเก่า

  try {
    const querySnapshot = await getDocs(collection(db, "transactions"));
    let found = false;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.notify) {
        found = true;
        const li = document.createElement("li");
        li.textContent = `${data.date} - ${data.transactionType} - ${data.amount} บาท`;
        list.appendChild(li);
      }
    });

    if (!found) {
      list.innerHTML = "<li>ยังไม่มียอดค้างชำระขณะนี้</li>";
    }
  } catch (error) {
    list.innerHTML = "<li>เกิดข้อผิดพลาดในการโหลดข้อมูล</li>";
    console.error("loadNotifications error:", error);
  }
}

loadNotifications();
