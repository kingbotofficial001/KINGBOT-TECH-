(() => {
  const token = localStorage.getItem('kingbotToken');
  const authHeaders = { Authorization: `Bearer ${token}` };

  interface BotItem {
    _id: string;
    name: string;
    strategy: string;
    symbol: string;
    active: boolean;
  }

  const renderBots = (bots: BotItem[]): void => {
    const list = document.getElementById('botList');
    if (!list) return;
    if (!bots.length) {
      list.innerHTML = '<p style="color:var(--muted);">No bots yet. Create your first bot above.</p>';
      return;
    }
    list.innerHTML = bots
      .map(
        (bot) => `
      <div class="bot-card">
        <div>
          <strong>${bot.name}</strong>
          <div style="color:var(--muted);font-size:0.8rem;">${bot.strategy} &middot; ${bot.symbol}</div>
        </div>
        <div style="display:flex;align-items:center;gap:0.8rem;">
          <span class="stat-pill" style="${bot.active ? '' : 'opacity:0.5;'}">${bot.active ? 'ACTIVE' : 'PAUSED'}</span>
          <button class="button secondary button-sm" data-bot-toggle="${bot._id}">${bot.active ? 'Pause' : 'Resume'}</button>
        </div>
      </div>
    `
      )
      .join('');
  };

  const loadBots = async (): Promise<void> => {
    const res = await fetch('/api/bots', { headers: authHeaders });
    if (!res.ok) return;
    const { bots } = (await res.json()) as { bots: BotItem[] };
    renderBots(bots);
  };

  document.getElementById('createBotBtn')?.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    window.KingBotUI?.setButtonLoading(button, true, 'Deploying');
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });
      if (!res.ok) throw new Error();
      window.KingBotUI?.toast('New bot deployed', 'success');
      await loadBots();
    } catch {
      window.KingBotUI?.toast('Could not create bot', 'error');
    } finally {
      window.KingBotUI?.setButtonLoading(button, false);
    }
  });

  document.getElementById('botList')?.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const toggle = target.closest<HTMLElement>('[data-bot-toggle]');
    if (!toggle) return;
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id: toggle.dataset.botToggle }),
      });
      if (!res.ok) throw new Error();
      await loadBots();
    } catch {
      window.KingBotUI?.toast('Could not update bot', 'error');
    }
  });

  loadBots().finally(() => {
    document.getElementById('pageLoader')?.classList.add('is-hidden');
  });
})();
