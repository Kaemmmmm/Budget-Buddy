import { db, auth } from './firebase.js';
import { getDoc, doc, setDoc, serverTimestamp, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

async function autoAddDcaTransactionIfNotExists(userId) {
  try {
    const goalRef = doc(db, "goal", userId);
    const goalSnap = await getDoc(goalRef);

    if (!goalSnap.exists()) {
      console.log("ไม่มีข้อมูล DCA สำหรับผู้ใช้");
      return;
    }

    const dca = goalSnap.data().dca;
    if (!dca || !dca.investmentDate || !dca.monthlyInvestment) {
      console.log("ข้อมูล DCA ไม่ครบ");
      return;
    }

    const today = new Date();
    const thisMonth = today.toISOString().slice(0, 7); // e.g. "2025-04"

    // 1️⃣: Check if there's already a DCA transaction this month
    const transactionRef = collection(db, "budget", userId, "transaction");
    const snapshot = await getDocs(transactionRef);
    const dcaExists = snapshot.docs.some(doc => {
      const data = doc.data();
      return data.type === "DCA" && data.date && data.date.startsWith(thisMonth);
    });

    if (dcaExists) {
      console.log("มีธุรกรรม DCA ของเดือนนี้แล้ว");
      return;
    }

    // 2️⃣: Prepare and add transaction
    const year = today.getFullYear();
    const month = today.getMonth();
    const dueDate = new Date(year, month, parseInt(dca.investmentDate));

    const transactionId = `${Date.now()}`;
    const transactionData = {
      date: today.toISOString().split("T")[0],
      dueDate: dueDate.toISOString().split("T")[0],
      amount: parseFloat(dca.monthlyInvestment),
      type: "DCA",
      detail: "เพิ่มอัตโนมัติจากแผน DCA",
      notify: true,
      createdAt: serverTimestamp()
    };

    await setDoc(doc(db, "budget", userId, "transaction", transactionId), transactionData);
    console.log("เพิ่มธุรกรรม DCA อัตโนมัติเรียบร้อย");

  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการเพิ่มธุรกรรม DCA อัตโนมัติ:", error);
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    autoAddDcaTransactionIfNotExists(user.uid);
  }
});
