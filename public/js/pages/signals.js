"use strict";
(() => {
    const signals = [
        { symbol: 'XAUUSD', side: 'buy', entry: 2398.45, sl: 2391.2, tp: 2412.6, confidence: 92 },
        { symbol: 'GBPUSD', side: 'sell', entry: 1.27154, sl: 1.2745, tp: 1.2668, confidence: 84 },
        { symbol: 'BTCUSD', side: 'buy', entry: 65342.21, sl: 64580.0, tp: 67100.0, confidence: 88 },
    ];
    const grid = document.getElementById('signalGrid');
    if (grid) {
        grid.innerHTML = signals
            .map((signal) => `
      <div class="widget-panel reveal">
        <h3>${signal.symbol} <span class="verdict-badge" style="background:${signal.side === 'buy' ? 'rgba(51,214,139,0.16)' : 'rgba(255,97,97,0.16)'};color:${signal.side === 'buy' ? 'var(--success)' : 'var(--danger)'};">${signal.side.toUpperCase()}</span></h3>
        <div class="kv-row"><span class="kv-label">Entry</span><strong>${signal.entry}</strong></div>
        <div class="kv-row"><span class="kv-label">Stop Loss</span><strong>${signal.sl}</strong></div>
        <div class="kv-row"><span class="kv-label">Take Profit</span><strong>${signal.tp}</strong></div>
        <div class="kv-row"><span class="kv-label">AI Confidence</span><strong>${signal.confidence}%</strong></div>
        <div class="confidence-bar"><span style="width:${signal.confidence}%;"></span></div>
      </div>
    `)
            .join('');
    }
    document.getElementById('pageLoader')?.classList.add('is-hidden');
})();
