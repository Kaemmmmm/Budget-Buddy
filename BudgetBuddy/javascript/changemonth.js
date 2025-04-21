document.addEventListener('DOMContentLoaded', function () {
  const monthYearText = document.getElementById('monthYearText');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const calendar = document.querySelector('.calendar');

  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
    "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
    "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  //  แก้ตรงนี้ให้ใช้วันที่ปัจจุบัน
  const today = new Date();
  let currentMonth = today.getMonth(); // 0 = ม.ค.
  let currentYear = today.getFullYear() + 543; // แปลงเป็น พ.ศ.

  function isLeapYear(year) {
    const gregorianYear = year - 543;
    return ((gregorianYear % 4 === 0 && gregorianYear % 100 !== 0) || (gregorianYear % 400 === 0));
  }

  function updateCalendar() {
    monthYearText.innerHTML = `${thaiMonths[currentMonth]} <strong>${currentYear}</strong>`;

    const oldDates = calendar.querySelectorAll('.date');
    oldDates.forEach(dateEl => dateEl.remove());

    let totalDays = daysInMonth[currentMonth];
    if (currentMonth === 1 && isLeapYear(currentYear)) {
      totalDays = 29;
    }

    const gregorianYear = currentYear - 543;
    const firstDayOfMonth = new Date(gregorianYear, currentMonth, 1).getDay();

    for (let i = 0; i < firstDayOfMonth; i++) {
      const emptyEl = document.createElement('div');
      emptyEl.classList.add('date', 'empty');
      calendar.appendChild(emptyEl);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateEl = document.createElement('div');
      dateEl.classList.add('date');
      dateEl.textContent = day;
      calendar.appendChild(dateEl);
    }
  }

  prevBtn.addEventListener('click', function () {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    updateCalendar();
  });

  nextBtn.addEventListener('click', function () {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    updateCalendar();
  });

  updateCalendar();
});
