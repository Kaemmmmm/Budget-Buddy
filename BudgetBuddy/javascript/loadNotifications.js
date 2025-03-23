import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { auth, db } from "../javascript/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

async function loadNotifications() {
  const list = document.getElementById("notification-list");
  list.innerHTML = "";

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      list.innerHTML = "<li>ยังไม่มียอดค้างชำระขณะนี้</li>";
      return;
    }

    const userId = user.uid;

    try {
      const querySnapshot = await getDocs(collection(db, "budget", userId, "transaction"));
      let found = false;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        found = true;

        const li = document.createElement("li");

        // ✅ สร้างลิงก์ไป pay.html พร้อมส่ง id
        const link = document.createElement("a");
        link.href = `pay.html?id=${doc.id}`;
        link.textContent = `${data.date} : ${data.type} - ${data.amount} บาท`;
        link.style.textDecoration = "none";
        link.style.color = "#000";

        li.appendChild(link);
        list.appendChild(li);
      });

      if (!found) {
        list.innerHTML = "<li>ยังไม่มียอดค้างชำระขณะนี้</li>";
      }
    } catch (error) {
      list.innerHTML = "<li>เกิดข้อผิดพลาดในการโหลดข้อมูล</li>";
      console.error("loadNotifications error:", error);
    }
  });
}

loadNotifications();
