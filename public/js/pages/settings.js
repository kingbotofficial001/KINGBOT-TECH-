"use strict";
(() => {
    const token = () => localStorage.getItem('kingbotToken');
    const params = new URLSearchParams(window.location.search);
    const preselectedPlan = params.get('plan');
    if (preselectedPlan) {
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('paymentForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
    const markCurrentPlan = (current) => {
        document.querySelectorAll('.plan-btn').forEach((button) => {
            if (button.dataset.plan === current) {
                button.textContent = 'Current plan';
                button.disabled = true;
            }
        });
    };
    document.addEventListener('kingbot:user', (event) => {
        const detail = event.detail;
        if (!detail)
            return;
        markCurrentPlan(detail.plan);
        fillProfile(detail);
    });
    document.querySelectorAll('.plan-btn').forEach((button) => {
        button.addEventListener('click', async () => {
            const t = token();
            if (!t) {
                window.location.href = '/login';
                return;
            }
            window.KingBotUI?.setButtonLoading(button, true, 'Activating');
            let activated = false;
            try {
                const res = await fetch('/api/payment', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plan: button.dataset.plan }),
                });
                const data = await res.json();
                if (!res.ok) {
                    window.KingBotUI?.toast(data.error || 'Could not activate plan', 'error');
                    return;
                }
                window.KingBotUI?.toast(data.message || 'Plan activated', 'success');
                activated = true;
            }
            catch {
                window.KingBotUI?.toast('Network error, please try again', 'error');
            }
            finally {
                window.KingBotUI?.setButtonLoading(button, false);
                if (activated) {
                    document.querySelectorAll('.plan-btn').forEach((btn) => {
                        btn.disabled = false;
                        const plan = btn.dataset.plan || '';
                        btn.dataset.originalLabel = `Choose ${plan.charAt(0).toUpperCase()}${plan.slice(1)}`;
                        btn.textContent = btn.dataset.originalLabel;
                    });
                    button.dataset.originalLabel = 'Current plan';
                    button.textContent = 'Current plan';
                    button.disabled = true;
                }
            }
        });
    });
    const fillProfile = (user) => {
        const nameInput = document.getElementById('profileNameInput');
        const emailInput = document.getElementById('profileEmailInput');
        const av = document.getElementById('settingsAvatar');
        const dn = document.getElementById('settingsDisplayName');
        const de = document.getElementById('settingsDisplayEmail');
        const plan = document.getElementById('settingsPlanPill');
        if (nameInput)
            nameInput.value = user.name || '';
        if (emailInput)
            emailInput.value = user.email || '';
        if (dn)
            dn.textContent = user.name || 'Trader';
        if (de)
            de.textContent = user.email || '—';
        if (plan)
            plan.textContent = user.planLabel || (user.plan || 'free').toUpperCase();
        if (av) {
            if (user.avatar) {
                av.innerHTML = `<img src="${user.avatar}" alt="" />`;
            }
            else {
                av.textContent = (user.name || 'T').trim().charAt(0).toUpperCase();
            }
        }
    };
    const loadMe = async () => {
        const t = token();
        if (!t)
            return;
        try {
            const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${t}` } });
            if (!res.ok)
                return;
            const data = await res.json();
            if (data.user)
                fillProfile(data.user);
        }
        catch {
            window.KingBotUI?.toast('Could not load profile', 'error');
        }
    };
    document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const t = token();
        if (!t) {
            window.location.href = '/login';
            return;
        }
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        const name = document.getElementById('profileNameInput')?.value?.trim();
        const email = document.getElementById('profileEmailInput')?.value?.trim();
        window.KingBotUI?.setButtonLoading(btn, true, 'Saving');
        try {
            const res = await fetch('/api/me', {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email }),
            });
            const data = await res.json();
            if (!res.ok) {
                window.KingBotUI?.toast(data.error || 'Could not update profile', 'error');
                return;
            }
            fillProfile(data.user);
            const nameEl = document.getElementById('profileName');
            const avatarEl = document.getElementById('profileAvatar');
            if (nameEl)
                nameEl.textContent = data.user.name || 'Trader';
            if (avatarEl) {
                if (data.user.avatar)
                    avatarEl.innerHTML = `<img src="${data.user.avatar}" alt="" />`;
                else
                    avatarEl.textContent = (data.user.name || 'T').trim().charAt(0).toUpperCase();
            }
            window.KingBotUI?.toast('Profile updated', 'success');
        }
        catch {
            window.KingBotUI?.toast('Network error', 'error');
        }
        finally {
            window.KingBotUI?.setButtonLoading(btn, false);
        }
    });
    const strategyForm = document.getElementById('strategy-form');
    strategyForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        window.KingBotUI?.toast('Strategy settings saved', 'success');
    });
    const risk = document.getElementById('riskPercent');
    const riskVal = document.getElementById('riskValue');
    const syncPreview = () => {
        const map = [
            ['strategyTemplate', 'previewStrategy'],
            ['timeframe', 'previewTimeframe'],
            ['riskMode', 'previewMode'],
        ];
        map.forEach(([id, pid]) => {
            const a = document.getElementById(id);
            const b = document.getElementById(pid);
            if (a && b)
                b.textContent = a.value;
        });
        if (risk && riskVal) {
            riskVal.textContent = `${risk.value}%`;
            const pr = document.getElementById('previewRisk');
            if (pr)
                pr.textContent = `${risk.value}%`;
        }
    };
    risk?.addEventListener('input', syncPreview);
    ['strategyTemplate', 'timeframe', 'riskMode'].forEach((id) => {
        document.getElementById(id)?.addEventListener('change', syncPreview);
    });
    loadMe();
})();
