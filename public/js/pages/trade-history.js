"use strict";
(() => {
    const closedTrades = [
        { symbol: 'XAUUSD', side: 'buy', entry: 2381.1, exit: 2398.45, closed: 'Today, 11:52', pnl: 173.5 },
        { symbol: 'EURUSD', side: 'sell', entry: 1.0921, exit: 1.0894, closed: 'Today, 09:14', pnl: 27.0 },
        { symbol: 'GBPUSD', side: 'buy', entry: 1.2683, exit: 1.27154, closed: 'Yesterday, 18:40', pnl: 32.4 },
        { symbol: 'BTCUSD', side: 'sell', entry: 66120.0, exit: 65342.21, closed: 'Yesterday, 14:02', pnl: -18.9 },
    ];
    const body = document.getElementById('historyBody');
    if (body) {
        body.innerHTML = closedTrades
            .map((row) => `
      <tr style="border-top: 1px solid var(--border); font-size: 0.86rem;">
        <td style="padding: 0.65rem 0.4rem; font-weight: 700;">${row.symbol}</td>
        <td style="padding: 0.65rem 0.4rem;"><span class="side-tag ${row.side}">${row.side.toUpperCase()}</span></td>
        <td style="padding: 0.65rem 0.4rem;">${row.entry}</td>
        <td style="padding: 0.65rem 0.4rem;">${row.exit}</td>
        <td style="padding: 0.65rem 0.4rem; color: var(--muted);">${row.closed}</td>
        <td style="padding: 0.65rem 0.4rem; color: ${row.pnl >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">${row.pnl >= 0 ? '+' : ''}$${row.pnl.toFixed(2)}</td>
      </tr>
    `)
            .join('');
    }
    document.getElementById('pageLoader')?.classList.add('is-hidden');
})();
