document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');
    const passwordInput = document.querySelector('input[type="password"]');
    const togglePassword = document.querySelector('.toggle-password');

    // 1. Show/Hide Password Toggle
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            // Check current type and flip it
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Change the icon/text based on state
            togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    // 2. Handle Form Submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Stop page from refreshing

        const email = document.querySelector('input[type="text"]').value;
        const password = passwordInput.value;

        // Visual feedback for the user
        const loginBtn = document.querySelector('.login-btn');
        loginBtn.textContent = "Logging in...";
        loginBtn.style.opacity = "0.7";

        // Simulated API Call
        console.log("Attempting login with:", { email, password });

        setTimeout(() => {
            alert(`Welcome back, ${email}!`);
            loginBtn.textContent = "Login";
            loginBtn.style.opacity = "1";
        }, 1500);
    });
});