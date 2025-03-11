// When the page loads, the modal is already visible by default 
// (since "display: flex" is set in the CSS). 
// If you want it hidden initially, set .modal { display: none } in CSS
// and then show it here with modal.style.display = "flex" if needed.

function adjustPlan() {
    // Example action when user clicks "ปรับแผน"
    // You could close this popup and navigate to an "Adjust Plan" page
    alert("Navigating to adjust plan page...");
    // window.location.href = "adjust-plan.html";
  }
  
  function confirmPlan() {
    // Example action when user clicks "ยอมรับ"
    alert("Plan confirmed!");
    // You could close the popup or redirect to another page
    // document.getElementById("myModal").style.display = "none";
    // window.location.href = "dashboard.html";
  }

  window.onload = function() {
    document.getElementById("myModal").style.display = "flex";
  };
  
  