// backButton.js
document.addEventListener("DOMContentLoaded", () => {
  const backButton = document.createElement("button");
  backButton.textContent = "ย้อนกลับ";
  backButton.className = "back-btn";
  backButton.onclick = () => history.back();
  document.body.appendChild(backButton);
});
document.addEventListener("DOMContentLoaded", () => {
  const backButton = document.createElement("button");
  backButton.textContent = "ย้อนกลับ";
  backButton.className = "back-btn";
  backButton.onclick = () => {
    const referrer = document.referrer;
    if (referrer.includes('progress.html')) {
      window.location.href = 'dashboard.html';
    } else {
      history.back();
    }
  };
  document.body.appendChild(backButton);
});
