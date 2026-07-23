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
  const riskValue = document.getElementById('riskValue');
  const previewStrategy = document.getElementById('previewStrategy');
  const previewTimeframe = document.getElementById('previewTimeframe');
  const previewMode = document.getElementById('previewMode');
  const previewRisk = document.getElementById('previewRisk');

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

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    syncPreview();
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

  syncPreview();
}
