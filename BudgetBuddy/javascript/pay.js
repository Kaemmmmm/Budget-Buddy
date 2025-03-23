import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
  } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
  import { auth, db } from "./firebase.js";
  import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
  
  const urlParams = new URLSearchParams(window.location.search);
  const transactionId = urlParams.get("id");
  const container = document.getElementById("transaction-details");
  
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      container.innerHTML = "กรุณาเข้าสู่ระบบก่อนดูข้อมูล";
      return;
    }
  
    if (!transactionId) {
      container.innerHTML = "ไม่พบรหัสธุรกรรม";
      return;
    }
  
    try {
      const docRef = doc(db, "budget", user.uid, "transaction", transactionId);
      const docSnap = await getDoc(docRef);
  
      if (!docSnap.exists()) {
        container.innerHTML = "ไม่พบข้อมูลธุรกรรมนี้";
        return;
      }
  
      const data = docSnap.data();
      const dueDate = new Date(data.date);
      const paidAt = data.paidAt?.toDate?.();
      const hasPaid = data.paid === true;
  
      // ตรวจสอบความตรงเวลา
      let timingText = "-";
      if (hasPaid && paidAt) {
        timingText = paidAt <= dueDate ? "✅ จ่ายตรงเวลา" : "❌ จ่ายล่าช้า";
      }
  
      container.innerHTML = `
        <p><strong>วันที่:</strong> ${data.date}</p>
        <p><strong>ประเภท:</strong> ${data.type}</p>
        <p><strong>จำนวน:</strong> ${data.amount} บาท</p>
        <p><strong>รายละเอียด:</strong> ${data.detail || '-'}</p>
        <p><strong>แจ้งเตือน:</strong> ${data.notify ? 'ใช่' : 'ไม่'}</p>
        <p><strong>สถานะ:</strong> ${hasPaid ? '✅ ชำระแล้ว' : '❌ ยังไม่ชำระ'}</p>
        ${hasPaid ? `<p><strong>วันที่ชำระ:</strong> ${paidAt.toLocaleDateString()}</p>` : ""}
        ${hasPaid ? `<p><strong>ความตรงเวลา:</strong> ${timingText}</p>` : ""}
        <div id="action-area"></div>
      `;
  
      // ถ้ายังไม่จ่าย → แสดงปุ่มชำระเงิน
      if (!hasPaid) {
        const actionArea = document.getElementById("action-area");
        const payBtn = document.createElement("button");
        payBtn.textContent = "ชำระเงิน";
        payBtn.classList.add("pay-button");
  
        payBtn.addEventListener("click", async () => {
          const now = new Date();
          const onTime = now <= dueDate;
  
          try {
            await updateDoc(docRef, {
              paid: true,
              paidAt: serverTimestamp(),
              onTime: onTime
            });
  
            alert("✅ ทำรายการสำเร็จ");
            location.reload();
          } catch (err) {
            console.error("❌ Error:", err);
            alert("เกิดข้อผิดพลาดในการชำระเงิน");
          }
        });
  
        actionArea.appendChild(payBtn);
      }
  
    } catch (err) {
      console.error("load error:", err);
      container.innerHTML = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
    }
  });
  