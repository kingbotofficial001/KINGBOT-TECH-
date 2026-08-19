"use strict";
(() => {
    const token = localStorage.getItem('kingbotToken');
    if (!token) {
        window.location.replace('/login');
        return;
    }
    const icon = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
    const navItems = [
        { href: '/dashboard', icon: icon('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'), label: 'Dashboard' },
        { href: '/trading-bots', icon: icon('<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4M8 4h8"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/>'), label: 'Trading Bots' },
        { href: '/signals', icon: icon('<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>'), label: 'Signals', vip: true },
        { href: '/trade-history', icon: icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'), label: 'Trade History' },
        { href: '/analytics', icon: icon('<path d="M3 21h18"/><path d="M6 21V11M11 21V5M16 21v-9M21 21V8"/>'), label: 'Analytics' },
        { href: '/strategies', icon: icon('<circle cx="12" cy="12" r="9"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="3"/>'), label: 'Strategies' },
        { href: '/risk-manager', icon: icon('<path d="M12 3l8 3v6c0 4.4-3.2 7.7-8 9-4.8-1.3-8-4.6-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>'), label: 'Risk Manager' },
        { href: '/brokers', icon: icon('<path d="M4 17V7l8-4 8 4v10"/><path d="M4 17h16v3H4z"/><path d="M9 21v-6h6v6"/>'), label: 'MT5 Accounts' },
        { href: '/pricing', icon: icon('<path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8L12 2z"/>'), label: 'Subscriptions' },
        { href: '/academy', icon: icon('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>'), label: 'Academy' },
        { href: '/affiliates', icon: icon('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6c2.9.4 5.5 2.4 5.5 5.4"/>'), label: 'Affiliates' },
        { href: '/settings', icon: icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'), label: 'Settings' },
        { href: '/support', icon: icon('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>'), label: 'Support' },
    ];
    const currentPath = window.location.pathname.replace(/\.html$/, '') || '/';
    const navHtml = navItems
        .map((item) => {
        const active = currentPath === item.href ? 'active' : '';
        const vip = item.vip ? ' vip-link' : '';
        return `<a href="${item.href}" class="${active}${vip}"><span class="nav-ic">${item.icon}</span>${item.label}</a>`;
    })
        .join('');
    const sidebarHtml = `
    <div class="sidebar-brand">
      <img src="/assets/neural-brain-logo.png" alt="KINGBOT AI" class="sidebar-brain-logo" width="36" height="36" />
      <div class="brand-text">
        <strong class="brand-mark">KINGBOT AI</strong>
        <span>Neural Trading System</span>
      </div>
    </div>
    <nav class="sidebar-nav">${navHtml}</nav>
    <div class="sidebar-promo">
      <img src="/assets/neural-brain-logo.png" alt="" class="sidebar-brain-logo" width="32" height="32" style="margin:0 auto 0.4rem;" />
      <strong class="brand-mark">KINGBOT ELITE</strong>
      <p>Unlock live execution, priority signals, and the full neural stack.</p>
      <a href="/pricing" class="button button-block button-sm">Upgrade now</a>
    </div>
  `;
    const topbarHtml = `
    <button class="sidebar-toggle" id="sidebarToggle" type="button" aria-label="Toggle menu">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>
    <div class="ticker-strip" id="tickerStrip"></div>
    <div class="topbar-actions">
      <div class="notif-wrap">
        <button class="icon-btn" id="notifBtn" type="button" aria-label="Notifications" aria-expanded="false">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="dot"></span>
        </button>
        <div class="notif-panel" id="notifPanel" role="dialog" aria-label="Notifications">
          <div class="notif-panel-header">
            <span>Notifications</span>
            <button type="button" class="icon-btn" id="notifClose" aria-label="Close" style="width:28px;height:28px;border:0;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="notif-list" id="notifList">
            <div class="notif-empty">You are all caught up.</div>
          </div>
        </div>
      </div>
      <button class="icon-btn" id="fullscreenBtn" type="button" aria-label="Fullscreen">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
      </button>
      <button class="icon-btn" id="langBtn" type="button" aria-label="Language">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      </button>
      <a class="icon-btn" href="/support" aria-label="Help">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
      </a>
      <button class="icon-btn" id="logoutTopbarBtn" type="button" aria-label="Logout" title="Logout">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
      <div class="profile-chip" id="profileChip">
        <div class="avatar" id="profileAvatar">U</div>
        <div>
          <div class="p-name" id="profileName">Trader</div>
          <div class="p-plan" id="profilePlan">FREE</div>
        </div>
        <span class="chip-chevron">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </span>
      </div>
    </div>
  `;
    const NOTIFICATIONS = [
        { title: 'Neural engine online', body: 'All systems are running smoothly.' },
        { title: 'New signal available', body: 'XAUUSD setup reached 92% AI confidence.' },
        { title: 'Weekly report ready', body: 'Your performance summary is ready to view.' },
    ];
    document.addEventListener('DOMContentLoaded', () => {
        const shellRoot = document.getElementById('appShell');
        if (!shellRoot)
            return;
        const sidebar = document.createElement('aside');
        sidebar.className = 'app-sidebar';
        sidebar.id = 'appSidebar';
        sidebar.innerHTML = sidebarHtml;
        const scrim = document.createElement('div');
        scrim.className = 'sidebar-scrim';
        scrim.id = 'sidebarScrim';
        const topbar = document.createElement('div');
        topbar.className = 'app-topbar';
        topbar.innerHTML = topbarHtml;
        const contentHost = shellRoot.querySelector('[data-app-content]') || shellRoot;
        const existingContent = document.createElement('div');
        existingContent.className = 'app-content';
        while (contentHost.firstChild) {
            existingContent.appendChild(contentHost.firstChild);
        }
        const main = document.createElement('div');
        main.className = 'app-main';
        main.appendChild(topbar);
        main.appendChild(existingContent);
        shellRoot.innerHTML = '';
        shellRoot.appendChild(sidebar);
        shellRoot.appendChild(scrim);
        shellRoot.appendChild(main);
        const toggleSidebar = (force) => {
            const open = force === undefined ? !sidebar.classList.contains('is-open') : force;
            sidebar.classList.toggle('is-open', open);
            scrim.classList.toggle('is-open', open);
            document.body.classList.toggle('sidebar-open', open);
        };
        document.getElementById('sidebarToggle')?.addEventListener('click', () => toggleSidebar());
        scrim.addEventListener('click', () => toggleSidebar(false));
        document.getElementById('logoutTopbarBtn')?.addEventListener('click', () => {
            window.kingbotLogout?.();
        });
        document.getElementById('profileChip')?.addEventListener('click', () => {
            window.location.href = '/settings';
        });
        fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => {
            if (!res.ok)
                throw new Error('unauthorized');
            return res.json();
        })
            .then(({ user }) => {
            const nameEl = document.getElementById('profileName');
            const planEl = document.getElementById('profilePlan');
            const avatarEl = document.getElementById('profileAvatar');
            if (nameEl)
                nameEl.textContent = user.name || 'Trader';
            if (planEl) {
                planEl.textContent = user.planLabel || 'FREE';
                planEl.classList.toggle('is-vip', !!user.isVip);
            }
            if (avatarEl) {
                if (user.avatar) {
                    avatarEl.innerHTML = `<img src="${user.avatar}" alt="${user.name || 'Trader'}" />`;
                }
                else {
                    avatarEl.textContent = (user.name || 'T').trim().charAt(0).toUpperCase();
                }
            }
            window.KingBotUser = user;
            document.dispatchEvent(new CustomEvent('kingbot:user', { detail: user }));
            document.getElementById('pageLoader')?.classList.add('is-hidden');
        })
            .catch(() => {
            localStorage.removeItem('kingbotToken');
            window.location.replace('/login');
        });
        fetch('/api/markets')
            .then((res) => res.json())
            .then(({ markets }) => {
            const strip = document.getElementById('tickerStrip');
            if (!strip)
                return;
            strip.innerHTML = markets
                .map((market) => {
                const up = market.change.trim().startsWith('+');
                return `<span>${market.symbol} <b class="${up ? 'tk-up' : 'tk-down'}">${market.price.toLocaleString()} ${market.change}</b></span>`;
            })
                .join('');
        })
            .catch(() => undefined);
        const notifBtn = document.getElementById('notifBtn');
        const notifPanel = document.getElementById('notifPanel');
        const notifClose = document.getElementById('notifClose');
        const notifList = document.getElementById('notifList');
        if (notifList) {
            notifList.innerHTML = NOTIFICATIONS.map((item) => `<div class="notif-item"><strong>${item.title}</strong>${item.body}</div>`).join('');
        }
        const toggleNotif = (open) => {
            if (!notifPanel || !notifBtn)
                return;
            const shouldOpen = open === undefined ? !notifPanel.classList.contains('is-open') : open;
            notifPanel.classList.toggle('is-open', shouldOpen);
            document.body.classList.toggle('notif-open', shouldOpen);
            notifBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
            if (shouldOpen)
                notifBtn.querySelector('.dot')?.remove();
        };
        notifBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNotif();
        });
        notifClose?.addEventListener('click', () => toggleNotif(false));
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (notifPanel &&
                notifPanel.classList.contains('is-open') &&
                target &&
                !notifPanel.contains(target) &&
                notifBtn &&
                !notifBtn.contains(target)) {
                toggleNotif(false);
            }
        });
        document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.().catch(() => undefined);
            }
            else {
                document.exitFullscreen?.();
            }
        });
        document.getElementById('langBtn')?.addEventListener('click', () => {
            window.KingBotUI?.toast('Language selection coming soon', 'info');
        });
    });
    window.kingbotLogout = () => {
        localStorage.removeItem('kingbotToken');
        window.location.replace('/login');
    };
})();
