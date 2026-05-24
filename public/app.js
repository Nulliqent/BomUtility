document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        // Initial theme setup
        const currentTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        themeToggleBtn.innerText = currentTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';

        themeToggleBtn.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                themeToggleBtn.innerText = '🌙 Dark Mode';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeToggleBtn.innerText = '☀️ Light Mode';
            }
        });
    }
});
