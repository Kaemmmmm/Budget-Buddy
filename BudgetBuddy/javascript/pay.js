import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    addDoc,
    collection
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
  
      if (!hasPaid) {
        const actionArea = document.getElementById("action-area");
        const payBtn = document.createElement("button");
        payBtn.textContent = "ชำระเงิน";
        payBtn.classList.add("pay-button");
  
        payBtn.addEventListener("click", async () => {
          const now = new Date();
          const onTime = now <= dueDate;
        
          try {
            // ✅ Update transaction status
            await updateDoc(docRef, {
              paid: true,
              paidAt: serverTimestamp(),
              onTime: onTime
            });
        
            // ✅ Define correct collection path based on type
            let collectionName = "";
            const type = data.type.toLowerCase();
        
            if (type === "dca") {
              await addDoc(collection(db, "goal", user.uid, "dca_history"), {
                amount: data.amount,
                date: now.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
              });
            
              const goalRef = doc(db, "goal", user.uid);
              const goalSnap = await getDoc(goalRef);
              let currentInvested = goalSnap.data()?.dca?.invested || 0;
            
              await updateDoc(goalRef, {
                "dca.invested": currentInvested + data.amount
              });
            
            } else if (type === "saving") {
              await addDoc(collection(db, "goal", user.uid, "saving_history"), {
                amount: data.amount,
                date: now.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
              });
            
              const goalRef = doc(db, "goal", user.uid);
              const goalSnap = await getDoc(goalRef);
              let currentSaving = goalSnap.data()?.savings?.amount || 0;
            
              await updateDoc(goalRef, {
                "savings.amount": currentSaving + data.amount
              });
            
            } else if (type === "installment") {
              await addDoc(collection(db, "goal", user.uid, "installment_history"), {
                amount: data.amount,
                date: now.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })
              });
            
              const goalRef = doc(db, "goal", user.uid);
              const goalSnap = await getDoc(goalRef);
              const dataGoal = goalSnap.data();
            
              const assetPrice = dataGoal.installment?.assetPrice || 0;
              const installmentDuration = dataGoal.installment?.installmentDuration || 1;
              const paidMonths = dataGoal.installment?.paidMonths || 0;
            
              const monthlyInstallment = assetPrice / (installmentDuration * 12);
              const paidMonthsToAdd = data.amount / monthlyInstallment;
            
              await updateDoc(goalRef, {
                "installment.paidMonths": paidMonths + paidMonthsToAdd
              });
            }            
        
            alert("✅ ทำรายการสำเร็จ กำลังกลับไปหน้าปฏิทิน...");
            location.href = "calendar.html";
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
  