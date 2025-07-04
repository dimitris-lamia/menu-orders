// landing.js
// Handles login and redirects with ?auth=1 for protected pages

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const codeInput = document.getElementById('accessCode');
    const errorDiv = document.getElementById('loginError');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const code = codeInput.value.trim();
        if (!code) {
            errorDiv.textContent = 'Please enter a code.';
            errorDiv.style.display = 'block';
            return;
        }
        try {
            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            if (!res.ok) {
                errorDiv.textContent = 'Invalid code.';
                errorDiv.style.display = 'block';
                return;
            }
            const data = await res.json();
            let target = '';
            if (data.role === 'admin') {
                target = `admin.html?auth=${encodeURIComponent(data.token)}`;
            } else if (data.role === 'kitchen') {
                target = `kitchen.html?auth=${encodeURIComponent(data.token)}`;
            } else if (data.role === 'waiter') {
                target = `orders.html?auth=${encodeURIComponent(data.token)}`;
            } else {
                errorDiv.textContent = 'Unknown role. Contact admin.';
                errorDiv.style.display = 'block';
                return;
            }
            window.location.href = target;
        } catch (err) {
            errorDiv.textContent = 'Login error.';
            errorDiv.style.display = 'block';
        }
    });
});
