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

    const months = years * 12; // Convert years to months
    const monthlyRate = annualInterestRate / 100 / 12; // Convert annual interest rate to monthly rate

    let futureValue = 0;
    if (monthlyRate > 0) {
        futureValue = monthlyInvestment * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    } else {
        futureValue = monthlyInvestment * months; // No interest case
    }

    const totalInvested = monthlyInvestment * months;
    displayResults(totalInvested, futureValue);
    updateChart(totalInvested, futureValue);
}

function displayResults(totalInvested, finalAmount) {
    document.getElementById("total-invested").textContent = `เงินลงทุนทั้งหมด: ${totalInvested.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`;
    document.getElementById("final-amount").textContent = `มูลค่ารวมที่ได้รับ: ${finalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`;
}

function updateChart(totalInvested, finalAmount) {
    const ctx = document.getElementById('dcaChart').getContext('2d');

    // Destroy existing chart to prevent duplication
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
