// backButton.js
document.addEventListener("DOMContentLoaded", () => {
  const backButton = document.createElement("button");
  backButton.textContent = "ย้อนกลับ";
  backButton.className = "back-btn";
  backButton.onclick = () => history.back();
  document.body.appendChild(backButton);
});
