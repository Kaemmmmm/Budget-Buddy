import { saveUserPlan, cachedSummaryText, cachedFinancialData } from './currentPlan.js';


function openModal() {
  if (cachedSummaryText && cachedFinancialData) {
    saveUserPlan(cachedSummaryText, cachedFinancialData)
      .then(() => {
        document.getElementById('myModal').style.display = 'flex';
      })
      .catch((error) => {
        alert("เกิดข้อผิดพลาดในการบันทึกแผน: " + error.message);
      });
  } else {
    alert("กรุณารอให้ระบบประเมินแผนก่อนกดบันทึก");
  }
}


function closeModal() {
  document.getElementById('myModal').style.display = 'none';
}

window.openModal = openModal;
window.closeModal = closeModal;
