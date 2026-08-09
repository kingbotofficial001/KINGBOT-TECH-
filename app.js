const yearNodes = document.querySelectorAll('.year');
yearNodes.forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const form = document.getElementById('strategy-form');
if (form) {
  const strategyTemplate = document.getElementById('strategyTemplate');
  const timeframe = document.getElementById('timeframe');
  const market = document.getElementById('market');
  const riskMode = document.getElementById('riskMode');
  const riskPercent = document.getElementById('riskPercent');
  const maxDrawdown = document.getElementById('maxDrawdown');
  const maxDailyLoss = document.getElementById('maxDailyLoss');
  const riskValue = document.getElementById('riskValue');
  const previewStrategy = document.getElementById('previewStrategy');
  const previewTimeframe = document.getElementById('previewTimeframe');
  const previewMode = document.getElementById('previewMode');
  const previewRisk = document.getElementById('previewRisk');
  const saveRiskButton = document.getElementById('riskSaveBtn');

  const syncPreview = () => {
    if (!previewStrategy || !previewTimeframe || !previewMode || !previewRisk) return;
    previewStrategy.textContent = strategyTemplate?.value || 'Trend Breakout';
    previewTimeframe.textContent = timeframe?.value || '15m';
    previewMode.textContent = riskMode?.value || 'Normal';
    previewRisk.textContent = `${riskPercent?.value || 3}%`;
    if (riskValue) {
      riskValue.textContent = `${riskPercent?.value || 3}%`;
    }
  };

  ['change', 'input'].forEach((eventName) => {
    strategyTemplate?.addEventListener(eventName, syncPreview);
    timeframe?.addEventListener(eventName, syncPreview);
    market?.addEventListener(eventName, syncPreview);
    riskMode?.addEventListener(eventName, syncPreview);
    riskPercent?.addEventListener(eventName, syncPreview);
  });

  const saveRiskProfile = async () => {
    const token = localStorage.getItem('kingbotToken');
    if (!token) return;
    const payload = {
      riskMode: riskMode?.value || 'balanced',
      riskPercent: Number(riskPercent?.value || 3),
      maxDrawdown: Number(maxDrawdown?.value || 10),
      maxDailyLoss: Number(maxDailyLoss?.value || 500)
    };
    const response = await fetch('/api/risk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      const result = await response.json();
      if (previewRisk) previewRisk.textContent = `${result.risk?.riskPercent || 3}%`;
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    syncPreview();
    saveRiskProfile();
    const submitButton = form.querySelector('button');
    if (submitButton) {
      submitButton.textContent = 'Settings saved';
      submitButton.disabled = true;
      setTimeout(() => {
        submitButton.textContent = 'Save settings';
        submitButton.disabled = false;
      }, 1400);
    }
  });

  saveRiskButton?.addEventListener('click', saveRiskProfile);
  syncPreview();
}
