"use strict";
(() => {
    const adminToken = localStorage.getItem('kingbotAdminToken');
    if (!adminToken) {
        window.location.replace('/admin/login');
        return;
    }
    const headers = { Authorization: `Bearer ${adminToken}` };
    const sidebar = document.getElementById('adminSidebar');
    const scrim = document.getElementById('adminSidebarScrim');
    const closeSidebar = () => {
        sidebar?.classList.remove('is-open');
        scrim?.classList.remove('is-open');
        document.body.classList.remove('sidebar-open');
    };
    const openSidebar = () => {
        sidebar?.classList.add('is-open');
        scrim?.classList.add('is-open');
        document.body.classList.add('sidebar-open');
    };
    document.getElementById('adminSidebarToggle')?.addEventListener('click', () => {
        if (sidebar?.classList.contains('is-open'))
            closeSidebar();
        else
            openSidebar();
    });
    scrim?.addEventListener('click', closeSidebar);
    document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('kingbotAdminToken');
        window.location.replace('/admin/login');
    });
    const showSection = (id) => {
        document.querySelectorAll('[data-section-panel]').forEach((el) => {
            el.classList.toggle('is-active', el.getAttribute('data-section-panel') === id);
        });
        document.querySelectorAll('.admin-nav-link').forEach((a) => {
            a.classList.toggle('active', a.getAttribute('data-section') === id);
        });
        closeSidebar();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    document.querySelectorAll('.admin-nav-link').forEach((a) => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const id = a.getAttribute('data-section');
            if (id) {
                showSection(id);
                history.replaceState(null, '', `#${id}`);
            }
        });
    });
    if (location.hash) {
        const id = location.hash.replace('#', '');
        if (document.querySelector(`[data-section-panel="${id}"]`))
            showSection(id);
    }
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el)
            el.textContent = value;
    };
    let allUsers = [];
    const renderUsers = (list) => {
        const body = document.getElementById('usersBody');
        const subs = document.getElementById('subsBody');
        const label = document.getElementById('userCountLabel');
        if (label)
            label.textContent = `${list.length} user${list.length === 1 ? '' : 's'}`;
        const row = (u) => {
            const initial = (u.name || 'U').trim().charAt(0).toUpperCase();
            const av = u.avatar
                ? `<span class="user-av"><img src="${u.avatar}" alt="" /></span>`
                : `<span class="user-av">${initial}</span>`;
            return `<tr>
        <td><div class="user-cell">${av}<span>${u.name || '—'}</span></div></td>
        <td style="color:var(--muted);">${u.email || '—'}</td>
        <td><span class="stat-pill">${(u.plan || 'free').toUpperCase()}</span></td>
        <td>${u.mode || 'demo'}</td>
        <td>${u.verified ? '<span class="status-on">Verified</span>' : '<span class="status-off">Unverified</span>'}</td>
        <td style="color:var(--muted);">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
      </tr>`;
        };
        if (body) {
            body.innerHTML = list.length
                ? list.map(row).join('')
                : '<tr><td colspan="6" style="padding:1rem;color:var(--muted);">No users found.</td></tr>';
        }
        if (subs) {
            const paid = list.filter((u) => u.plan && u.plan !== 'free');
            subs.innerHTML = paid.length
                ? paid
                    .map((u) => `<tr>
            <td>${u.name || '—'}</td>
            <td style="color:var(--muted);">${u.email || '—'}</td>
            <td><span class="stat-pill">${(u.plan || '').toUpperCase()}</span></td>
            <td style="color:var(--muted);">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
          </tr>`)
                    .join('')
                : '<tr><td colspan="4" style="padding:1rem;color:var(--muted);">No paid subscriptions yet.</td></tr>';
        }
        const counts = { free: 0, starter: 0, professional: 0, enterprise: 0 };
        list.forEach((u) => {
            const p = (u.plan || 'free').toLowerCase();
            if (counts[p] !== undefined)
                counts[p] += 1;
            else
                counts.free += 1;
        });
        setText('planFree', String(counts.free));
        setText('planStarter', String(counts.starter));
        setText('planPro', String(counts.professional));
        setText('planEnt', String(counts.enterprise));
    };
    document.getElementById('userSearch')?.addEventListener('input', (e) => {
        const q = (e.target.value || '').toLowerCase().trim();
        if (!q) {
            renderUsers(allUsers);
            return;
        }
        renderUsers(allUsers.filter((u) => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)));
    });
    const load = async () => {
        try {
            const [statsRes, usersRes, healthRes] = await Promise.all([
                fetch('/api/admin/stats', { headers }),
                fetch('/api/admin/users', { headers }),
                fetch('/api/health'),
            ]);
            if (statsRes.status === 401 || statsRes.status === 403 || usersRes.status === 401 || usersRes.status === 403) {
                localStorage.removeItem('kingbotAdminToken');
                window.location.replace('/admin/login');
                return;
            }
            if (statsRes.ok) {
                const data = await statsRes.json();
                setText('statTotalUsers', String(data.totalUsers ?? 0));
                setText('statTotalBots', String(data.totalBots ?? 0));
                setText('statActiveBots', String(data.activeBots ?? 0));
                setText('statTotalBrokers', String(data.totalBrokers ?? 0));
                setText('botsTotal', String(data.totalBots ?? 0));
                setText('botsActive', String(data.activeBots ?? 0));
                setText('brokerTotal', String(data.totalBrokers ?? 0));
            }
            if (usersRes.ok) {
                const data = await usersRes.json();
                allUsers = data.users || [];
                renderUsers(allUsers);
            }
            if (healthRes.ok) {
                const h = await healthRes.json();
                setText('dbStatus', h.db === false ? 'Offline' : 'Connected');
                const dbEl = document.getElementById('dbStatus');
                if (dbEl)
                    dbEl.className = h.db === false ? 'status-off' : 'ok';
            }
            else {
                setText('dbStatus', 'Unknown');
            }
        }
        catch {
            window.KingBotUI?.toast('Network error loading admin data', 'error');
        }
        finally {
            document.getElementById('pageLoader')?.classList.add('is-hidden');
        }
    };
    load();
})();
