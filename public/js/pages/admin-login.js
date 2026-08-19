"use strict";
(() => {
    const existingAdminToken = localStorage.getItem('kingbotAdminToken');
    if (existingAdminToken)
        window.location.replace('/admin/dashboard');
    document.querySelectorAll('.pw-toggle').forEach((toggle) => {
        toggle.addEventListener('click', () => {
            const targetId = toggle.dataset.for;
            const input = targetId ? document.getElementById(targetId) : null;
            if (!input)
                return;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            toggle.textContent = isPassword ? 'Hide' : 'Show';
        });
    });
    document.getElementById('adminLoginForm')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        window.KingBotUI?.setButtonLoading(submitButton, true, 'Verifying');
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                window.KingBotUI?.toast(data.error || 'Admin login failed', 'error');
                return;
            }
            localStorage.setItem('kingbotAdminToken', data.token);
            window.location.replace('/admin/dashboard');
        }
        catch {
            window.KingBotUI?.toast('Network error, please try again', 'error');
        }
        finally {
            window.KingBotUI?.setButtonLoading(submitButton, false);
        }
    });
})();
