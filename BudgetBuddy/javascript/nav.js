document.querySelectorAll('.toggle-submenu').forEach(menu => {
    menu.addEventListener('click', function(e) {
        e.preventDefault();
        
        let submenu = this.nextElementSibling;

        // Toggle submenu visibility
        submenu.classList.toggle('active');

        // Rotate the arrow
        this.classList.toggle('rotate');

        // Close other submenus when one is opened
        document.querySelectorAll('.submenu').forEach(sub => {
            if (sub !== submenu) {
                sub.classList.remove('active');
                sub.previousElementSibling.classList.remove('rotate');
            }
        });
    });
});