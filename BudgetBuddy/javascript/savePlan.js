import { db, auth } from "./firebase.js";
import { doc, getDoc, setDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ฟังก์ชันบันทึกแผน (Archive เฉพาะกรณี isNewPlan = true)
export async function saveUserPlan(planSummaryHTML, financialData, isNewPlan = false) {
  const user = auth.currentUser;
  if (!user) return;

  const planDocRef = doc(db, "plan", user.uid);
  const currentPlanSnap = await getDoc(planDocRef);

  // Archive เฉพาะถ้า isNewPlan = true และเคยมี plan เดิม
  if (currentPlanSnap.exists() && isNewPlan) {
    const historyRef = collection(planDocRef, "planHistory");
    await addDoc(historyRef, {
      ...currentPlanSnap.data(),
      archivedAt: new Date()
    });
    console.log("Archive แผนเก่าเรียบร้อย (เพราะสร้างแผนใหม่)");
  }

  // setDoc เป็นแผนปัจจุบัน
  await setDoc(planDocRef, {
    plan: planSummaryHTML,
    planUpdatedAt: new Date(),
    ...financialData
  }, { merge: true });

  console.log("บันทึกแผนปัจจุบันเรียบร้อย");
}
