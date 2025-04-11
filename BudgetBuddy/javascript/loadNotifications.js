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
      
        if (data.notify && !data.paid) {
          found = true;
      
          const li = document.createElement("div");
          li.classList.add("notification-item");
      
          const text = document.createElement("span");
          text.textContent = `${data.date} : ${data.type} - ${data.amount} บาท`;
      
          const button = document.createElement("button");
          button.textContent = "จ่าย";
          button.classList.add("pay-now-button");
          button.onclick = () => {
            window.location.href = `pay.html?id=${doc.id}`;
          };
      
          li.appendChild(text);
          li.appendChild(button);
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
  });
}

loadNotifications();
