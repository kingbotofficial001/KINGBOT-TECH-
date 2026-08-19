(() => {
  const token = localStorage.getItem('kingbotToken');

  interface AnalyticsData {
    balance: number;
    winRate: number;
    monthlyPnL: number;
    connectedBrokers: number;
  }

  interface MarketItem {
    symbol: string;
    price: number;
    change: string;
  }

  const setText = (id: string, value: string): void => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const loadAnalytics = async (): Promise<void> => {
    if (!token) {
      window.location.href = '/login';
      return;
    }
    const res = await fetch('/api/analytics', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      window.location.href = '/login';
      return;
    }
    const data = (await res.json()) as AnalyticsData;
    ['balanceValue', 'winRateValue', 'pnlValue', 'brokerCount'].forEach((id) =>
      document.getElementById(id)?.classList.remove('skeleton')
    );
    setText('balanceValue', `$${data.balance}`);
    setText('winRateValue', `${data.winRate}%`);
    setText('pnlValue', `+$${data.monthlyPnL.toLocaleString()}`);
    setText('brokerCount', String(data.connectedBrokers));
  };

  const loadMarkets = async (): Promise<void> => {
    const res = await fetch('/api/markets');
    const data = (await res.json()) as { markets: MarketItem[] };
    const list = document.getElementById('marketList');
    if (!list) return;
    list.classList.remove('skeleton');
    (list as HTMLElement).style.height = 'auto';
    list.innerHTML = data.markets
      .map(
        (market) => `
      <div class="bot-card">
        <div><strong>${market.symbol}</strong></div>
        <div>${market.price} <span class="stat-pill">${market.change}</span></div>
      </div>
    `
      )
      .join('');
  };

  Promise.all([loadAnalytics(), loadMarkets()]).finally(() => {
    document.getElementById('pageLoader')?.classList.add('is-hidden');
  });
})();
