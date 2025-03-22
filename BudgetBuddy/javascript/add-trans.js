import { auth, db, doc, setDoc } from './firebase.js'; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

let currentUser = null;

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is authenticated:", user.uid);
        currentUser = user.uid; // Store the user ID
    } else {
        console.log("No user is signed in.");
    }
});

const getCurrentUserId = () => {
    return currentUser; // Return the stored user ID
};



export async function saveTransaction() {
  const userId = getCurrentUserId();
  if (!userId) {
    alert("ไม่สามารถระบุผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
    return;
  }

  const date = document.getElementById('date').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const type = document.getElementById('transaction-type').value;
  const detail = document.getElementById('detail').value;
  const notify = document.getElementById('notify').checked;

  if (!date || isNaN(amount) || !type) {
    alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    return;
  }

  const transactionId = `${Date.now()}`; // Unique ID

  try {
    await setDoc(doc(db, "budget", userId, "transaction", transactionId), {
      date,
      amount,
      type,
      detail,
      notify,
      createdAt: serverTimestamp() // ✅ Firestore generates the timestamp on the server
    });

    alert("บันทึกธุรกรรมสำเร็จ!");
    location.reload(); // Or redirect as needed
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการบันทึก:", error);
    alert("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveTransaction);
  }
});
