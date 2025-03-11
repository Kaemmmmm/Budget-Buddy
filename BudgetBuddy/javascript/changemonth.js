document.addEventListener('DOMContentLoaded', function() {
  const monthYearText = document.getElementById('monthYearText');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const calendar = document.querySelector('.calendar');

  // รายชื่อเดือนภาษาไทย
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
    "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
    "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  // จำนวนวันในแต่ละเดือน (ไม่รวมปีที่กุมภามี29วัน)
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // เริ่มต้นที่เดือน 0 (มกราคม), ปี 2568 (ตัวอย่าง)
  let currentMonth = 0;
  let currentYear = 2568;

  // ฟังก์ชันเช็คปีที่กุมภามี29วัน (Leap year) แบบคร่าว ๆ
  function isLeapYear(year) {
    // year ในปฏิทินสากล (Gregorian) ต้องลบ 543 ก่อน ถ้าคุณใช้ พ.ศ.
    const gregorianYear = year - 543; 
    return ((gregorianYear % 4 === 0 && gregorianYear % 100 !== 0) || (gregorianYear % 400 === 0));
  }

  // ฟังก์ชันอัปเดตปฏิทิน
  function updateCalendar() {
    // 1) อัปเดตชื่อเดือน-ปีใน <p id="monthYearText">
    monthYearText.innerHTML = `${thaiMonths[currentMonth]} <strong>${currentYear}</strong>`;

    // 2) ลบ <div class="date"> เก่าที่เคยมีอยู่ (เพื่อเคลียร์ก่อนสร้างใหม่)
    const oldDates = calendar.querySelectorAll('.date');
    oldDates.forEach(dateEl => dateEl.remove());

    // 3) คำนวณจำนวนวันของเดือนปัจจุบัน
    let totalDays = daysInMonth[currentMonth];
    // ถ้าเป็นเดือนกุมภาพันธ์ (index = 1) และเป็นปีอธิกสุรทิน ให้เพิ่มอีก 1 วัน
    if (currentMonth === 1 && isLeapYear(currentYear)) {
      totalDays = 29;
    }

    // 4) คำนวณ day of week ของวันที่ 1 (เพื่อเว้นช่องว่าง ถ้าอยากให้ตรงกับวันจริง)
    // แปลง พ.ศ. เป็น ค.ศ. ก่อน
    const gregorianYear = currentYear - 543;
    const firstDayOfMonth = new Date(gregorianYear, currentMonth, 1).getDay(); 
    // getDay() จะคืนค่า 0=อาทิตย์, 1=จันทร์, ..., 6=เสาร์

    // 5) สร้างช่องว่าง (empty) สำหรับวันก่อนหน้าวันที่ 1 (ถ้าต้องการแสดงให้ตรงกับวัน)
    for (let i = 0; i < firstDayOfMonth; i++) {
      const emptyEl = document.createElement('div');
      emptyEl.classList.add('date');
      emptyEl.classList.add('empty'); // class "empty" สำหรับช่องว่าง
      calendar.appendChild(emptyEl);
    }

    // 6) สร้าง <div class="date"> สำหรับแต่ละวัน
    for (let day = 1; day <= totalDays; day++) {
      const dateEl = document.createElement('div');
      dateEl.classList.add('date');
      dateEl.textContent = day; // ใส่ตัวเลขวันลงไป
      calendar.appendChild(dateEl);
    }
  }

  // เมื่อกดปุ่มย้อนเดือน
  prevBtn.addEventListener('click', function() {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;     // ถ้าย้อนเกินมกราคม ให้ไปธันวาคม
      currentYear--;
    }
    updateCalendar();
  });

  // เมื่อกดปุ่มเดือนถัดไป
  nextBtn.addEventListener('click', function() {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;     // ถ้าเลยธันวาคม ให้กลับไปมกราคม
      currentYear++;
    }
    updateCalendar();
  });

  // เรียกครั้งแรกเพื่อแสดงปฏิทินเริ่มต้น
  updateCalendar();
});
