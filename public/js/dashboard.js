"use strict";
(() => {
    const token = localStorage.getItem('kingbotToken');
    if (!token)
        return;
    const authHeaders = { Authorization: `Bearer ${token}` };
    const drawSpark = (canvas, points, color) => {
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        const rect = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        ctx.scale(ratio, ratio);
        const w = rect.width;
        const h = rect.height;
        ctx.clearRect(0, 0, w, h);
        const max = Math.max(...points);
        const min = Math.min(...points);
        const range = max - min || 1;
        const step = w / (points.length - 1);
        ctx.beginPath();
        points.forEach((point, index) => {
            const x = index * step;
            const y = h - ((point - min) / range) * (h * 0.8) - h * 0.1;
            if (index === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        });
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, `${color}55`);
        gradient.addColorStop(1, `${color}00`);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.beginPath();
        points.forEach((point, index) => {
            const x = index * step;
            const y = h - ((point - min) / range) * (h * 0.8) - h * 0.1;
            if (index === 0)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.4;
        ctx.stroke();
    };
    const randomSeries = (base, count, volatility) => {
        const series = [base];
        for (let i = 1; i < count; i += 1) {
            series.push(series[i - 1] + (Math.random() - 0.48) * volatility);
        }
        return series;
    };
    const buildCandles = (base, count, volatility) => {
        const closes = randomSeries(base, count + 1, volatility);
        const candles = [];
        for (let i = 0; i < count; i += 1) {
            const open = closes[i];
            const close = closes[i + 1];
            const high = Math.max(open, close) + Math.random() * volatility * 0.6;
            const low = Math.min(open, close) - Math.random() * volatility * 0.6;
            candles.push({ open, high, low, close });
        }
        return candles;
    };
    const drawCandles = (canvas, candles) => {
        if (!canvas)
            return null;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return null;
        const rect = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        ctx.scale(ratio, ratio);
        const w = rect.width;
        const h = rect.height;
        ctx.clearRect(0, 0, w, h);
        const max = Math.max(...candles.map((c) => c.high));
        const min = Math.min(...candles.map((c) => c.low));
        const range = max - min || 1;
        const padTop = h * 0.08;
        const padBottom = h * 0.08;
        const usableH = h - padTop - padBottom;
        const toY = (price) => padTop + usableH - ((price - min) / range) * usableH;
        const slot = w / candles.length;
        const bodyWidth = Math.max(2, slot * 0.55);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let g = 1; g < 4; g += 1) {
            const y = (h / 4) * g;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        const obStart = Math.floor(candles.length * 0.18);
        const obEnd = Math.floor(candles.length * 0.34);
        const obSlice = candles.slice(obStart, obEnd);
        const obLow = Math.min(...obSlice.map((c) => c.low));
        const obHigh = Math.min(...obSlice.map((c) => c.open));
        ctx.fillStyle = 'rgba(51,214,139,0.14)';
        ctx.fillRect(obStart * slot, toY(Math.max(obHigh, obLow)), (obEnd - obStart) * slot, Math.abs(toY(obLow) - toY(obHigh)) || 6);
        ctx.fillStyle = 'rgba(51,214,139,0.85)';
        ctx.font = '600 10px Inter, sans-serif';
        ctx.fillText('OB', obStart * slot + 4, toY(obLow) - 4);
        const fvgIndex = Math.floor(candles.length * 0.58);
        const fvgCandle = candles[fvgIndex];
        if (fvgCandle) {
            ctx.strokeStyle = 'rgba(240,193,75,0.7)';
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(fvgIndex * slot - slot, toY(fvgCandle.high) - 4, slot * 2, 14);
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(240,193,75,0.9)';
            ctx.fillText('FVG', fvgIndex * slot - slot + 4, toY(fvgCandle.high) - 8);
        }
        const bosIndex = Math.floor(candles.length * 0.42);
        const bosCandle = candles[bosIndex];
        if (bosCandle) {
            ctx.strokeStyle = 'rgba(240,193,75,0.5)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(bosIndex * slot, toY(bosCandle.high));
            ctx.lineTo(w, toY(bosCandle.high));
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(240,193,75,0.9)';
            ctx.fillText('BOS', bosIndex * slot, toY(bosCandle.high) - 6);
        }
        const chochIndex = Math.floor(candles.length * 0.72);
        const chochCandle = candles[chochIndex];
        if (chochCandle) {
            ctx.fillStyle = 'rgba(255,97,97,0.9)';
            ctx.fillText('CHoCH', chochIndex * slot, toY(chochCandle.low) + 14);
        }
        candles.forEach((candle, index) => {
            const x = index * slot + slot / 2;
            const isUp = candle.close >= candle.open;
            ctx.strokeStyle = isUp ? '#33d68b' : '#ff6161';
            ctx.fillStyle = isUp ? '#33d68b' : '#ff6161';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, toY(candle.high));
            ctx.lineTo(x, toY(candle.low));
            ctx.stroke();
            const bodyTop = toY(Math.max(candle.open, candle.close));
            const bodyHeight = Math.max(1.5, Math.abs(toY(candle.open) - toY(candle.close)));
            ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
        });
        const last = candles[candles.length - 1];
        return { sellY: toY(last.low) - 8, buyY: toY(last.high) + 8, sellPrice: last.low, buyPrice: last.high };
    };
    const renderMainChart = () => {
        const canvas = document.getElementById('priceChart');
        if (!canvas)
            return;
        const candles = buildCandles(2390, 46, 5.5);
        const result = drawCandles(canvas, candles);
        if (!result)
            return;
        const wrap = canvas.parentElement;
        if (!wrap)
            return;
        const wrapHeight = wrap.getBoundingClientRect().height;
        const sellTag = document.getElementById('sellTag');
        const buyTag = document.getElementById('buyTag');
        if (sellTag) {
            sellTag.style.top = `${Math.min(Math.max(result.sellY, 10), wrapHeight - 30)}px`;
            const span = sellTag.querySelector('span');
            if (span)
                span.textContent = result.sellPrice.toFixed(2);
        }
        if (buyTag) {
            buyTag.style.top = `${Math.min(Math.max(result.buyY, 10), wrapHeight - 30)}px`;
            const span = buyTag.querySelector('span');
            if (span)
                span.textContent = result.buyPrice.toFixed(2);
        }
    };
    const renderHeroTicker = (markets) => {
        const host = document.getElementById('heroTicker');
        if (!host)
            return;
        const items = markets
            .map((market) => {
            const up = market.change.trim().startsWith('+');
            return `<span>${market.symbol} <b class="${up ? 'tk-up' : 'tk-down'}">${market.price.toLocaleString()} ${market.change}</b></span>`;
        })
            .join('');
        host.innerHTML = `<div class="ticker-marquee-track">${items}${items}</div>`;
    };
    const startClock = () => {
        const clockEl = document.getElementById('chartClock');
        if (!clockEl)
            return;
        const tick = () => {
            clockEl.textContent = `${new Date().toLocaleTimeString('en-GB')} (EAT)`;
        };
        tick();
        setInterval(tick, 1000);
    };
    const wireTimeframeTabs = () => {
        document.querySelectorAll('#timeframeTabs button').forEach((tab) => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#timeframeTabs button').forEach((btn) => btn.classList.remove('active'));
                tab.classList.add('active');
                renderMainChart();
            });
        });
    };
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el)
            el.textContent = value;
    };
    const loadDashboard = async () => {
        const [meRes, analyticsRes, botsRes, positionsRes, marketsRes] = await Promise.all([
            fetch('/api/me', { headers: authHeaders }),
            fetch('/api/analytics', { headers: authHeaders }),
            fetch('/api/bots', { headers: authHeaders }),
            fetch('/api/positions', { headers: authHeaders }),
            fetch('/api/markets'),
        ]);
        if (!meRes.ok) {
            localStorage.removeItem('kingbotToken');
            window.location.replace('/login');
            return;
        }
        const { user } = (await meRes.json());
        const analytics = analyticsRes.ok ? await analyticsRes.json() : null;
        const botsData = botsRes.ok ? (await botsRes.json()) : { bots: [] };
        const positionsData = positionsRes.ok ? (await positionsRes.json()) : { positions: [] };
        if (marketsRes.ok) {
            const { markets } = (await marketsRes.json());
            renderHeroTicker(markets);
        }
        const welcomeName = document.getElementById('welcomeName');
        if (welcomeName)
            welcomeName.textContent = `Welcome back, ${user.name || 'Trader'}`;
        const welcomeVip = document.getElementById('welcomeVip');
        if (welcomeVip) {
            if (user.isVip) {
                welcomeVip.textContent = user.planLabel;
                welcomeVip.style.display = 'inline-block';
            }
            else {
                welcomeVip.style.display = 'none';
            }
        }
        setText('statBalance', `$${(analytics?.balance ?? user.demoBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
        setText('statPnl', `$${(analytics?.monthlyPnL ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
        setText('statTrades', String(positionsData.positions.length));
        setText('statBots', `${analytics?.activeBots ?? 0} / ${analytics?.totalBots ?? botsData.bots.length}`);
        setText('statWinRate', `${analytics?.winRate ?? 0}%`);
        setText('perfProfit', `+$${(analytics?.monthlyPnL ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
        setText('perfWinRate', `${analytics?.winRate ?? 0}%`);
        const positionsList = document.getElementById('positionsList');
        if (positionsList) {
            positionsList.innerHTML =
                positionsData.positions
                    .map((position) => `
        <div class="position-row">
          <div><span class="side-tag ${position.side}">${position.side.toUpperCase()}</span><strong>${position.symbol}</strong></div>
          <div style="text-align:right;">
            <div style="color:${position.pnl >= 0 ? 'var(--success)' : 'var(--danger)'};font-weight:700;">${position.pnl >= 0 ? '+' : ''}$${position.pnl.toFixed(2)}</div>
            <div style="color:var(--muted);font-size:0.75rem;">${position.pnlPct >= 0 ? '+' : ''}${position.pnlPct}%</div>
          </div>
        </div>
      `)
                    .join('') || '<p style="color:var(--muted);">No open positions yet.</p>';
        }
        const activityFeed = document.getElementById('activityFeed');
        if (activityFeed) {
            const entries = [
                { time: 'now', text: 'XAUUSD buy order opened at market price' },
                { time: '2m', text: 'GBPUSD sell order closed with profit' },
                { time: '5m', text: 'EURUSD buy order opened' },
                { time: '9m', text: 'Risk level updated to Balanced' },
            ];
            activityFeed.innerHTML = entries
                .map((entry) => `<div class="feed-row"><span class="feed-time">${entry.time}</span><span>${entry.text}</span></div>`)
                .join('');
        }
        const marketSession = document.getElementById('marketSession');
        if (marketSession) {
            const sessions = [
                { name: 'Sydney', hours: '00:00 - 09:00', open: false },
                { name: 'Tokyo', hours: '02:00 - 11:00', open: false },
                { name: 'London', hours: '08:00 - 17:00', open: true },
                { name: 'New York', hours: '14:30 - 23:00', open: true },
            ];
            marketSession.innerHTML = sessions
                .map((session) => `<div class="kv-row"><span class="kv-label">${session.name}</span><span class="stat-pill" style="${session.open ? '' : 'opacity:0.5;'}">${session.hours}</span></div>`)
                .join('');
        }
        const newsAlerts = document.getElementById('newsAlerts');
        if (newsAlerts) {
            const news = [
                'XAUUSD volatility increased',
                'High impact news in 25 mins (USD CPI)',
                'BTCUSD breakout detected',
                'Weekly performance report ready',
            ];
            newsAlerts.innerHTML = news.map((item) => `<div class="feed-row"><span>${item}</span></div>`).join('');
        }
        drawSpark(document.getElementById('performanceChart'), randomSeries(1000, 24, 90), '#33d68b');
        renderMainChart();
    };
    const wireControls = () => {
        document.querySelectorAll('.mode-btn').forEach((button) => {
            button.addEventListener('click', async () => {
                document.querySelectorAll('.mode-btn').forEach((btn) => btn.classList.remove('active'));
                button.classList.add('active');
                try {
                    const res = await fetch('/api/mode', {
                        method: 'POST',
                        headers: { ...authHeaders, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ mode: button.dataset.mode }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                        window.KingBotUI?.toast(data.error || 'Unable to switch mode', 'error');
                        return;
                    }
                    window.KingBotUI?.toast(`Switched to ${data.mode} mode`, 'success');
                }
                catch {
                    window.KingBotUI?.toast('Network error switching mode', 'error');
                }
            });
        });
        const autoSwitch = document.getElementById('autoTradeSwitch');
        autoSwitch?.addEventListener('click', () => {
            autoSwitch.classList.toggle('is-on');
            window.KingBotUI?.toast(autoSwitch.classList.contains('is-on') ? 'Auto trading enabled' : 'Auto trading paused', 'info');
        });
        document.getElementById('pauseBotBtn')?.addEventListener('click', (event) => {
            const button = event.currentTarget;
            const paused = (button.textContent || '').trim() === 'Resume Bot';
            button.textContent = paused ? 'Pause Bot' : 'Resume Bot';
            setText('botStatusPill', paused ? 'ACTIVE' : 'PAUSED');
            window.KingBotUI?.toast(paused ? 'King Bot resumed' : 'King Bot paused', 'info');
        });
        document.getElementById('stopBotBtn')?.addEventListener('click', () => {
            setText('botStatusPill', 'STOPPED');
            window.KingBotUI?.toast('All bots stopped', 'error');
        });
    };
    const startLiveEngine = () => {
        const topClock = document.getElementById('topClock');
        const sessionEl = document.getElementById('sessionClock');
        const tickTop = () => {
            const now = new Date();
            if (topClock)
                topClock.textContent = now.toLocaleTimeString('en-GB');
            if (sessionEl) {
                const h = now.getUTCHours();
                let session = 'ASIAN SESSION';
                if (h >= 7 && h < 13)
                    session = 'LONDON SESSION';
                else if (h >= 13 && h < 21)
                    session = 'NY SESSION';
                sessionEl.textContent = session;
            }
        };
        tickTop();
        setInterval(tickTop, 1000);
        const latencyEl = document.querySelectorAll('.cyber-sys .sys-item .sys-val')[1];
        if (latencyEl) {
            setInterval(() => {
                latencyEl.textContent = `${18 + Math.floor(Math.random() * 14)}ms`;
            }, 4000);
        }
        let equity = null;
        let confidence = 92;
        setInterval(() => {
            const equityEl = document.getElementById('statEquity');
            const pnlEl = document.getElementById('statPnl');
            if (equityEl) {
                if (equity === null) {
                    const parsed = parseFloat((equityEl.textContent || '').replace(/[^0-9.]/g, ''));
                    equity = isNaN(parsed) ? 26174.52 : parsed;
                }
                equity += (Math.random() - 0.44) * 26;
                equityEl.textContent = `$${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                equityEl.classList.remove('tick-up', 'tick-down');
                void equityEl.offsetWidth;
                equityEl.classList.add(Math.random() > 0.42 ? 'tick-up' : 'tick-down');
            }
            if (pnlEl && equity !== null) {
                const pnl = equity - 25642.18;
                const pct = (pnl / 25642.18) * 100;
                pnlEl.textContent = `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${Math.abs(pct).toFixed(2)}%)`;
                pnlEl.style.color = pnl >= 0 ? 'var(--success, #33d68b)' : 'var(--danger, #ff6161)';
            }
            confidence = Math.min(98, Math.max(84, confidence + (Math.random() - 0.5) * 3));
            const confEl = document.getElementById('confidenceValue');
            const confBar = document.getElementById('confidenceBar');
            if (confEl)
                confEl.textContent = `${Math.round(confidence)}%`;
            if (confBar)
                confBar.style.width = `${Math.round(confidence)}%`;
        }, 3200);
        setInterval(() => {
            drawSpark(document.getElementById('performanceChart'), randomSeries(1000, 24, 90), '#33d68b');
        }, 9000);
    };
    document.addEventListener('DOMContentLoaded', () => {
        wireControls();
        wireTimeframeTabs();
        startClock();
        startLiveEngine();
        loadDashboard()
            .catch(() => window.KingBotUI?.toast('Could not load dashboard data', 'error'))
            .finally(() => {
            document.getElementById('pageLoader')?.classList.add('is-hidden');
        });
        window.addEventListener('resize', () => {
            clearTimeout(window.__kbResizeTimer);
            window.__kbResizeTimer = window.setTimeout(() => loadDashboard().catch(() => undefined), 300);
        });
    });
})();
