"use strict";
(() => {
    const token = localStorage.getItem('kingbotToken');
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el)
            el.textContent = value;
    };
    const loadAnalytics = async () => {
        if (!token) {
            window.location.href = '/login';
            return;
        }
        const res = await fetch('/api/analytics', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
            window.location.href = '/login';
            return;
        }
        const data = (await res.json());
        ['balanceValue', 'winRateValue', 'pnlValue', 'brokerCount'].forEach((id) => document.getElementById(id)?.classList.remove('skeleton'));
        setText('balanceValue', `$${data.balance}`);
        setText('winRateValue', `${data.winRate}%`);
        setText('pnlValue', `+$${data.monthlyPnL.toLocaleString()}`);
        setText('brokerCount', String(data.connectedBrokers));
    };
    const loadMarkets = async () => {
        const res = await fetch('/api/markets');
        const data = (await res.json());
        const list = document.getElementById('marketList');
        if (!list)
            return;
        list.classList.remove('skeleton');
        list.style.height = 'auto';
        list.innerHTML = data.markets
            .map((market) => `
      <div class="bot-card">
        <div><strong>${market.symbol}</strong></div>
        <div>${market.price} <span class="stat-pill">${market.change}</span></div>
      </div>
    `)
            .join('');
    };
    Promise.all([loadAnalytics(), loadMarkets()]).finally(() => {
        document.getElementById('pageLoader')?.classList.add('is-hidden');
    });
})();
