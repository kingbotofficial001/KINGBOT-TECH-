window.KingBotUI = ((): KingBotUIApi => {
  let toastHost: HTMLElement | null = null;

  const ensureToastHost = (): HTMLElement => {
    if (toastHost) return toastHost;
    toastHost = document.createElement('div');
    toastHost.className = 'toast-stack';
    document.body.appendChild(toastHost);
    return toastHost;
  };

  const toast = (message: string, type: 'info' | 'error' | 'success' = 'info', duration = 3800): void => {
    const host = ensureToastHost();
    host.querySelectorAll<HTMLElement>('.toast').forEach((el) => {
      el.classList.add('toast-out');
      setTimeout(() => el.remove(), 320);
    });
    const node = document.createElement('div');
    node.className = `toast${type === 'error' ? ' toast-error' : ''}${type === 'success' ? ' toast-success' : ''}`;
    node.textContent = message;
    host.appendChild(node);
    setTimeout(() => {
      node.classList.add('toast-out');
      setTimeout(() => node.remove(), 320);
    }, duration);
  };

  let modalScrollY = 0;

  const openModal = (modal: HTMLElement | null): void => {
    if (!modal) return;
    modal.classList.add('is-open');
    modalScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${modalScrollY}px`;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
  };

  const closeModal = (modal: HTMLElement | null): void => {
    if (!modal) return;
    modal.classList.remove('is-open');
    if (!document.querySelector('.modal-overlay.is-open')) {
      document.body.classList.remove('modal-open');
      document.body.style.paddingRight = '';
      document.body.style.top = '';
      window.scrollTo(0, modalScrollY || 0);
    }
  };

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const opener = target.closest<HTMLElement>('[data-modal-target]');
    if (opener) {
      event.preventDefault();
      const modalId = opener.dataset.modalTarget;
      const modal = modalId ? document.getElementById(modalId) : null;
      openModal(modal);
      return;
    }
    const closer = target.closest<HTMLElement>('[data-modal-close]');
    if (closer) {
      closeModal(closer.closest<HTMLElement>('.modal-overlay'));
      return;
    }
    if (target.classList.contains('modal-overlay')) {
      closeModal(target);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const openModalEl = document.querySelector<HTMLElement>('.modal-overlay.is-open');
      if (openModalEl) closeModal(openModalEl);
    }
  });

  const setButtonLoading = (button: HTMLButtonElement | null, isLoading: boolean, loadingLabel?: string): void => {
    if (!button) return;
    if (isLoading) {
      button.dataset.originalLabel = button.dataset.originalLabel || button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<span class="spinner-ring"></span> ${loadingLabel || 'Please wait'}`;
    } else {
      button.disabled = false;
      button.innerHTML = button.dataset.originalLabel || button.innerHTML;
    }
  };

  return { toast, openModal, closeModal, setButtonLoading };
})();

document.querySelectorAll<HTMLElement>('.year').forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});

const header = document.querySelector<HTMLElement>('.site-header');
if (header) {
  const updateHeaderShadow = (): void => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  updateHeaderShadow();
  window.addEventListener('scroll', updateHeaderShadow, { passive: true });
}

const navToggle = document.querySelector<HTMLButtonElement>('.nav-toggle');
const navLinks = document.querySelector<HTMLElement>('.nav-links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
document.querySelectorAll<HTMLAnchorElement>('.nav-links a').forEach((link) => {
  const linkPath = link.getAttribute('href');
  if (!linkPath) return;
  const normalized = linkPath.replace(/\/$/, '') || '/';
  if (normalized === currentPath) link.classList.add('active');
});

const authAction = document.getElementById('authAction');
if (authAction) {
  const token = localStorage.getItem('kingbotToken');
  if (token) {
    authAction.textContent = 'Dashboard';
    authAction.setAttribute('href', '/dashboard');
  } else {
    const guestLabel = authAction.dataset.guestLabel || authAction.textContent || '';
    const guestHref = authAction.dataset.guestHref || authAction.getAttribute('href') || '/';
    authAction.textContent = guestLabel;
    authAction.setAttribute('href', guestHref);
  }
}

(function initReveals() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const autoSelectors = [
    '.page-intro',
    '.feature-card',
    '.pricing-card',
    '.stat-card',
    '.widget-panel',
    '.chart-panel',
    '.control-panel',
    '.side-panel',
    '.strategy-card',
    '.broker-card',
    '.preview-card',
    '.panel.hoverable',
  ];
  const autoNodes: HTMLElement[] = [];
  document.querySelectorAll<HTMLElement>(autoSelectors.join(',')).forEach((el) => {
    if (el.closest('[data-cinematic]') || el.hasAttribute('data-cinematic')) return;
    if (el.classList.contains('reveal') || el.classList.contains('reveal-stagger')) return;
    el.classList.add('reveal');
    autoNodes.push(el);
  });
  const groups = new Map<HTMLElement, number>();
  autoNodes.forEach((el) => {
    const parent = el.parentElement || document.body;
    const index = groups.get(parent) || 0;
    groups.set(parent, index + 1);
    el.style.transitionDelay = `${Math.min(index * 140, 700)}ms`;
  });
  const targets = document.querySelectorAll<HTMLElement>('.reveal, .reveal-stagger');
  if (prefersReduced || !('IntersectionObserver' in window)) {
    targets.forEach((target) => target.classList.add('in-view'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        requestAnimationFrame(() => el.classList.add('in-view'));
        observer.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  targets.forEach((target) => observer.observe(target));
})();

const strategyForm = document.getElementById('strategy-form') as HTMLFormElement | null;
if (strategyForm) {
  const strategyTemplate = document.getElementById('strategyTemplate') as HTMLSelectElement | null;
  const timeframeSelect = document.getElementById('timeframe') as HTMLSelectElement | null;
  const marketSelect = document.getElementById('market') as HTMLSelectElement | null;
  const riskModeSelect = document.getElementById('riskMode') as HTMLSelectElement | null;
  const riskPercent = document.getElementById('riskPercent') as HTMLInputElement | null;
  const riskValue = document.getElementById('riskValue');
  const previewStrategy = document.getElementById('previewStrategy');
  const previewTimeframe = document.getElementById('previewTimeframe');
  const previewMode = document.getElementById('previewMode');
  const previewRisk = document.getElementById('previewRisk');

  const applyParamToSelect = (select: HTMLSelectElement | null, value: string | null): void => {
    if (!select || !value) return;
    const match = Array.from(select.options).find((option) => option.value.toLowerCase() === value.toLowerCase());
    if (match) select.value = match.value;
  };

  const params = new URLSearchParams(window.location.search);
  applyParamToSelect(strategyTemplate, params.get('template'));
  applyParamToSelect(timeframeSelect, params.get('timeframe'));
  applyParamToSelect(marketSelect, params.get('market'));

  const syncPreview = (): void => {
    if (!previewStrategy || !previewTimeframe || !previewMode || !previewRisk) return;
    previewStrategy.textContent = strategyTemplate?.value || 'Trend Breakout';
    previewTimeframe.textContent = timeframeSelect?.value || '15m';
    previewMode.textContent = riskModeSelect?.value || 'Normal';
    previewRisk.textContent = `${riskPercent?.value || 3}%`;
    if (riskValue) riskValue.textContent = `${riskPercent?.value || 3}%`;
  };

  ['change', 'input'].forEach((eventName) => {
    strategyTemplate?.addEventListener(eventName, syncPreview);
    timeframeSelect?.addEventListener(eventName, syncPreview);
    marketSelect?.addEventListener(eventName, syncPreview);
    riskModeSelect?.addEventListener(eventName, syncPreview);
    riskPercent?.addEventListener(eventName, syncPreview);
  });

  strategyForm.addEventListener('submit', (event) => {
    event.preventDefault();
    syncPreview();
    const submitButton = strategyForm.querySelector<HTMLButtonElement>('button');
    if (submitButton) {
      submitButton.textContent = 'Settings saved';
      submitButton.disabled = true;
      setTimeout(() => {
        submitButton.textContent = 'Save settings';
        submitButton.disabled = false;
      }, 1400);
    }
  });

  if (params.get('template')) {
    strategyForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  syncPreview();
}
