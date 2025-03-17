 // ------------------------------
    // ตัวอย่างค่าจำลอง (สมมติ)
    // ------------------------------
    // 1) เปอร์เซ็นต์การออม (เทียบกับรายได้ต่อเดือน)
    const savingPercent = 10; 
    // 2) สัดส่วนสินทรัพย์สุทธิ (หลังหักหนี้) เทียบกับรายได้ต่อเดือน (%)
    const netAssetsPercent = 10;
    // 3) สถานะหนี้ ("no-debt", "managed", "outstanding")
    const debtStatus = "managed";
    // 4) จำนวนเดือนที่เงินฉุกเฉินครอบคลุมรายจ่าย
    const emergencyMonth = 2;

    // ฟังก์ชันอัปเดตสถานะ (วงกลม+ข้อความ) ตามสีและข้อความที่ต้องการ
    function updateStatus(circleId, textId, detailId, colorClass, titleText, detailText) {
      const circleEl = document.getElementById(circleId);
      const textEl   = document.getElementById(textId);
      const detailEl = document.getElementById(detailId);

      // ลบ class สีเก่า
      circleEl.classList.remove("circle-green", "circle-yellow", "circle-red");
      // เพิ่ม class สีใหม่
      circleEl.classList.add(colorClass);

      // อัปเดตข้อความ
      textEl.textContent   = titleText;
      detailEl.textContent = detailText;
    }

    // ------------------------------------------------
    // 1) ประเมิน "สัดส่วนการออม (Good Liquidity)"
    //    - Green: >= 10%
    //    - Yellow: 5-9.9%
    //    - Red: < 5%
    // ------------------------------------------------
    if (savingPercent >= 10) {
      updateStatus(
        "saving-circle", "saving-text", "saving-detail",
        "circle-green",
        "ดีมาก",
        "การออม ≥ 10% ของรายได้ แสดงถึงสภาพคล่องและวินัยการออมที่ดี"
      );
    } else if (savingPercent >= 5) {
      updateStatus(
        "saving-circle", "saving-text", "saving-detail",
        "circle-yellow",
        "พอใช้",
        "การออม 5-9% ของรายได้ ยังพอใช้ได้ แต่ควรเพิ่มขึ้นเพื่อความมั่นคง"
      );
    } else {
      updateStatus(
        "saving-circle", "saving-text", "saving-detail",
        "circle-red",
        "ต้องปรับปรุง",
        "การออม < 5% ของรายได้ ค่อนข้างน้อย ควรเพิ่มการออม"
      );
    }

    // ------------------------------------------------
    // 2) ประเมิน "ความมั่งคั่ง (Wealth Assessment)"
    //    - Green: >= 50%
    //    - Yellow: 20-49%
    //    - Red: < 20%
    // ------------------------------------------------
    if (netAssetsPercent >= 50) {
      updateStatus(
        "wealth-circle", "wealth-text", "wealth-detail",
        "circle-green",
        "ดีมาก",
        "สินทรัพย์สุทธิ ≥ 50% ของรายได้ต่อเดือน สะท้อนความมั่งคั่งสูง"
      );
    } else if (netAssetsPercent >= 20) {
      updateStatus(
        "wealth-circle", "wealth-text", "wealth-detail",
        "circle-yellow",
        "พอใช้",
        "สินทรัพย์สุทธิ 20-49% ของรายได้ต่อเดือน ควรเพิ่มสินทรัพย์หรือปรับลดหนี้"
      );
    } else {
      updateStatus(
        "wealth-circle", "wealth-text", "wealth-detail",
        "circle-red",
        "ต้องปรับปรุง",
        "สินทรัพย์สุทธิ < 20% ของรายได้ต่อเดือน เสี่ยงต่อปัญหาการเงินในอนาคต"
      );
    }

    // ------------------------------------------------
    // 3) ประเมิน "สถานะหนี้ (Debt-Free Status)"
    //    - Green: no-debt
    //    - Yellow: managed
    //    - Red: outstanding
    // ------------------------------------------------
    if (debtStatus === "no-debt") {
      updateStatus(
        "debt-circle", "debt-text", "debt-detail",
        "circle-green",
        "ไม่มีหนี้",
        "ไม่มีหนี้คงค้าง ถือเป็นสถานะการเงินที่ดี"
      );
    } else if (debtStatus === "managed") {
      updateStatus(
        "debt-circle", "debt-text", "debt-detail",
        "circle-yellow",
        "ผ่อนตรงเวลา",
        "มีหนี้แต่ผ่อนชำระตรงเวลา อยู่ในเกณฑ์ที่จัดการได้"
      );
    } else {
      updateStatus(
        "debt-circle", "debt-text", "debt-detail",
        "circle-red",
        "มีหนี้ค้างชำระ",
        "มีหนี้ที่ผิดนัดหรือจ่ายล่าช้า ควรเร่งปรับแผนชำระหนี้"
      );
    }

    // ------------------------------------------------
    // 4) ประเมิน "เงินฉุกเฉิน (Emergency Funds)"
    //    - Green: > 6 เดือน
    //    - Yellow: 3-6 เดือน
    //    - Red: < 3 เดือน
    // ------------------------------------------------
    if (emergencyMonth > 6) {
      updateStatus(
        "emergency-circle", "emergency-text", "emergency-detail",
        "circle-green",
        "ดีมาก",
        "เงินฉุกเฉินครอบคลุม > 6 เดือน มีความปลอดภัยทางการเงินสูง"
      );
    } else if (emergencyMonth >= 3) {
      updateStatus(
        "emergency-circle", "emergency-text", "emergency-detail",
        "circle-yellow",
        "พอใช้",
        "เงินฉุกเฉินครอบคลุม 3-6 เดือน ยังอยู่ในเกณฑ์พื้นฐาน"
      );
    } else {
      updateStatus(
        "emergency-circle", "emergency-text", "emergency-detail",
        "circle-red",
        "ต้องปรับปรุง",
        "เงินฉุกเฉินครอบคลุมน้อยกว่า 3 เดือน ไม่เพียงพอต่อเหตุฉุกเฉิน"
      );
    }

    // ------------------------------
    // เมนูย่อย (toggle) หากต้องการให้กดแล้วแสดง
    // ------------------------------
    const toggles = document.querySelectorAll('.toggle-submenu');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const submenu = toggle.nextElementSibling;
        if (submenu.style.display === 'block') {
          submenu.style.display = 'none';
        } else {
          submenu.style.display = 'block';
        }
      });
    });