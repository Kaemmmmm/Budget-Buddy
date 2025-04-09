document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("calculate-btn").addEventListener("click", calculateDCA);
});

let dcaChart; // Global variable for the chart

function calculateDCA() {
    const monthlyInvestment = parseFloat(document.getElementById('monthly-investment').value);
    const years = parseFloat(document.getElementById('investment-duration').value);
    const annualInterestRate = parseFloat(document.getElementById('interest-rate').value);

    // Validate input
    if (isNaN(monthlyInvestment) || isNaN(years) || isNaN(annualInterestRate) || monthlyInvestment <= 0 || years <= 0 || annualInterestRate < 0) {
        alert("กรุณากรอกข้อมูลให้ครบทุกช่องและต้องเป็นค่าที่ถูกต้อง");
        return;
    }

    const months = years * 12;
    const monthlyRate = annualInterestRate / 100 / 12;

    let futureValue = 0;
    if (monthlyRate > 0) {
        futureValue = monthlyInvestment * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    } else {
        futureValue = monthlyInvestment * months;
    }

    const totalInvested = monthlyInvestment * months;
    displayResults(totalInvested, futureValue);
    updateChart(totalInvested, futureValue);
    displayDCAAdvice(totalInvested, futureValue); // ✅ advice added here
}

function displayResults(totalInvested, finalAmount) {
    document.getElementById("total-invested").textContent = `เงินลงทุนทั้งหมด: ${totalInvested.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`;
    document.getElementById("final-amount").textContent = `มูลค่ารวมที่ได้รับ: ${finalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`;
}

function updateChart(totalInvested, finalAmount) {
    const ctx = document.getElementById('dcaChart').getContext('2d');

    if (dcaChart) {
        dcaChart.destroy();
    }

    dcaChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['เงินลงทุนทั้งหมด', 'กำไรจากดอกเบี้ย'],
            datasets: [{
                data: [totalInvested, finalAmount - totalInvested],
                backgroundColor: ['#007bff', '#ffc107']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    enabled: true
                }
            }
        }
    });
}

function displayDCAAdvice(totalInvested, finalAmount) {
    const gain = finalAmount - totalInvested;
    const gainPercent = (gain / totalInvested) * 100;

    let advice = "";

    if (gainPercent >= 100) {
        advice = "✅ ยอดเงินของคุณเติบโตมากกว่าเท่าตัว ถือว่าเป็นอัตราผลตอบแทนที่ยอดเยี่ยม! รักษาวินัยในการลงทุนอย่างต่อเนื่อง";
    } else if (gainPercent >= 50) {
        advice = "👍 คุณได้รับผลตอบแทนที่ดีจากการลงทุน ควรศึกษาหรือตรวจสอบกองทุนที่ให้ผลตอบแทนต่อเนื่อง";
    } else if (gainPercent >= 20) {
        advice = "⚠️ ผลตอบแทนอยู่ในระดับพอใช้ อาจลองพิจารณากองทุนที่มีศักยภาพสูงขึ้นหรือเพิ่มระยะเวลาลงทุน";
    } else {
        advice = "❗ ผลตอบแทนค่อนข้างต่ำ ลองตรวจสอบว่าอัตราดอกเบี้ยที่ใส่สอดคล้องกับความคาดหวังหรือไม่ และทบทวนแผนการลงทุนอีกครั้ง";
    }

    document.getElementById("dca-advice").textContent = advice;
}


document.addEventListener("DOMContentLoaded", () => {
    const infoModal = document.getElementById("info-modal");
    const infoButton = document.getElementById("info-button");
    const infoClose = document.getElementById("info-close");
  
    if (infoButton && infoModal && infoClose) {
      infoButton.addEventListener("click", () => {
        infoModal.style.display = "flex";
      });
  
      infoClose.addEventListener("click", () => {
        infoModal.style.display = "none";
      });
  
      window.addEventListener("click", (e) => {
        if (e.target === infoModal) {
          infoModal.style.display = "none";
        }
      });
    }
  });
  