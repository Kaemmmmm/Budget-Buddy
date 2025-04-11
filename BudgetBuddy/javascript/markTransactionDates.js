import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { auth, db } from "../javascript/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const userId = user.uid;
  const transactions = [];

  try {
    const snapshot = await getDocs(collection(db, "budget", userId, "transaction"));
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.date && data.paid === false) {
        transactions.push({
          ...data,
          id: doc.id
        });
      }
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Tag each notification with its date correctly (✅ MOVE this here)
    transactions.forEach((t) => {
      const allSpans = document.querySelectorAll(`.notification-item span`);
      allSpans.forEach(span => {
        if (span.textContent.includes(t.date)) {
          span.parentElement.setAttribute("data-date", t.date);
        }
      });
    });

    // Add "!" to calendar date
    document.querySelectorAll(".calendar .date").forEach((el) => {
      const day = parseInt(el.textContent);
      const match = transactions.find(t => {
        const d = new Date(t.date);
        return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      if (match) {
        const mark = document.createElement("span");
        mark.textContent = " !";
        mark.style.color = "red";
        mark.style.fontWeight = "bold";
        el.appendChild(mark);
        el.style.cursor = "pointer";
        el.setAttribute("data-date", match.date);

        // On click → highlight all notifications for this date
        el.addEventListener("click", () => {
          const targets = document.querySelectorAll(`.notification-item[data-date="${match.date}"]`);
          if (targets.length > 0) {
            targets[0].scrollIntoView({ behavior: "smooth", block: "center" });
            targets.forEach(target => {
              target.classList.add("highlighted");
              setTimeout(() => target.classList.remove("highlighted"), 2000);
            });
          }
        });
      }
    });

  } catch (error) {
    console.error("Error marking transaction dates:", error);
  }
});
