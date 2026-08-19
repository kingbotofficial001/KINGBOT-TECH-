(() => {
  const riskPerTrade = document.getElementById('riskPerTrade') as HTMLInputElement | null;
  const maxDailyLoss = document.getElementById('maxDailyLoss') as HTMLInputElement | null;
  const maxTrades = document.getElementById('maxTrades') as HTMLInputElement | null;
  const autoPause = document.getElementById('autoPause') as HTMLInputElement | null;

  const setText = (id: string, value: string): void => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const sync = (): void => {
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

  (document.getElementById('riskForm') as HTMLFormElement | null)?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const button = form.querySelector<HTMLButtonElement>('button');
    window.KingBotUI?.setButtonLoading(button, true, 'Saving');
    setTimeout(() => {
      window.KingBotUI?.setButtonLoading(button, false);
      window.KingBotUI?.toast('Risk settings saved', 'success');
    }, 700);
  });

  document.getElementById('pageLoader')?.classList.add('is-hidden');
})();
