(() => {
  interface ReferralEntry {
    name: string;
    plan: string;
    joinedAt: string;
  }

  interface ReferralData {
    code: string;
    count: number;
    earnings: number;
    tier: { name: string; rate: number };
    nextTier: { name: string; min: number; rate: number } | null;
    referrals: ReferralEntry[];
  }

  const token = localStorage.getItem('kingbotToken');

  const setText = (id: string, value: string): void => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const renderReferrals = (data: ReferralData): void => {
    const refInput = document.getElementById('refLink') as HTMLInputElement | null;
    if (refInput) refInput.value = `${window.location.origin}/signup?ref=${data.code}`;
    setText('refCount', String(data.count));
    setText('refEarnings', `$${(data.earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    setText('refTier', `${data.tier.name} (${data.tier.rate}%)`);
    const nextNote = document.getElementById('refNextTier');
    if (nextNote) {
      nextNote.textContent = data.nextTier
        ? `${Math.max(data.nextTier.min - data.count, 0)} more referral${data.nextTier.min - data.count === 1 ? '' : 's'} to unlock ${data.nextTier.name} at ${data.nextTier.rate}%.`
        : 'You are on the highest tier. Keep the momentum going.';
    }
    const list = document.getElementById('refList');
    if (list) {
      list.innerHTML = data.referrals.length
        ? data.referrals
            .map(
              (entry) => `
          <div class="kv-row">
            <span>${entry.name}</span>
            <span class="stat-pill">${(entry.plan || 'free').toUpperCase()}</span>
            <span class="kv-label">${entry.joinedAt ? new Date(entry.joinedAt).toLocaleDateString() : ''}</span>
          </div>
        `
            )
            .join('')
        : '<p style="color:var(--muted);font-size:0.88rem;">No referrals yet. Share your link to get started.</p>';
    }
  };

  const loadReferrals = async (): Promise<void> => {
    if (!token) return;
    try {
      const res = await fetch('/api/referrals', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = (await res.json()) as ReferralData;
      renderReferrals(data);
    } catch {
      window.KingBotUI?.toast('Could not load referral data', 'error');
    }
  };

  document.addEventListener('kingbot:user', (event) => {
    const detail = (event as CustomEvent<KingBotUserShape>).detail;
    const refInput = document.getElementById('refLink') as HTMLInputElement | null;
    if (refInput && !refInput.value) {
      const code = detail.referralCode || String(detail.id || 'kingbot').slice(-8);
      refInput.value = `${window.location.origin}/signup?ref=${code}`;
    }
  });

  document.getElementById('copyRefBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('refLink') as HTMLInputElement | null;
    if (!input) return;
    try {
      await navigator.clipboard.writeText(input.value);
      window.KingBotUI?.toast('Referral link copied', 'success');
    } catch {
      input.select();
      window.KingBotUI?.toast('Select and copy the link manually', 'info');
    }
  });

  loadReferrals().finally(() => {
    document.getElementById('pageLoader')?.classList.add('is-hidden');
  });
})();
