"use strict";
(() => {
    const riskPerTrade = document.getElementById('riskPerTrade');
    const maxDailyLoss = document.getElementById('maxDailyLoss');
    const maxTrades = document.getElementById('maxTrades');
    const autoPause = document.getElementById('autoPause');
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el)
            el.textContent = value;
    };
    const sync = () => {
        setText('riskPerTradeValue', `${riskPerTrade?.value ?? 2}%`);
        setText('maxDailyLossValue', `${maxDailyLoss?.value ?? 5}%`);
        setText('maxTradesValue', `${maxTrades?.value ?? 6}`);
        setText('prevRisk', `${riskPerTrade?.value ?? 2}%`);
        setText('prevDaily', `${maxDailyLoss?.value ?? 5}%`);
        setText('prevTrades', `${maxTrades?.value ?? 6}`);
        setText('prevPause', autoPause?.checked ? 'Enabled' : 'Disabled');
    };
    [riskPerTrade, maxDailyLoss, maxTrades, autoPause].forEach((input) => input?.addEventListener('input', sync));
    sync();
    document.getElementById('riskForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const form = event.target;
        const button = form.querySelector('button');
        window.KingBotUI?.setButtonLoading(button, true, 'Saving');
        setTimeout(() => {
            window.KingBotUI?.setButtonLoading(button, false);
            window.KingBotUI?.toast('Risk settings saved', 'success');
        }, 700);
    });
    document.getElementById('pageLoader')?.classList.add('is-hidden');
})();
