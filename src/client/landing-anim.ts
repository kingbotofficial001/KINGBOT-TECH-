(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  interface MarketItem {
    symbol: string;
    price: number;
    change: string;
  }

  function reveal(): void {
    const nodes = document.querySelectorAll<HTMLElement>('[data-cinematic]');
    if (prefersReduced) {
      nodes.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const delay = parseInt(el.getAttribute('data-delay') || '0', 10);
          setTimeout(() => {
            requestAnimationFrame(() => el.classList.add('is-visible'));
          }, delay * 1.8);
          io.unobserve(el);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );
    nodes.forEach((el) => io.observe(el));
  }

  function parallaxBrain(): void {
    if (prefersReduced) return;
    const img = document.querySelector<HTMLElement>('.hero-brain-img');
    const stage = document.querySelector<HTMLElement>('.hero-brain-stage');
    if (!img || !stage) return;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let running = false;
    const animate = (): void => {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      img.style.transform = `translateY(${currentY * -14}px) translateX(${currentX * 18}px) rotate(${currentX * 2.2}deg)`;
      if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
        requestAnimationFrame(animate);
      } else {
        running = false;
      }
    };
    window.addEventListener('mousemove', (e) => {
      const rect = stage.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      targetX = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
      targetY = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
      if (!running) {
        running = true;
        requestAnimationFrame(animate);
      }
    });
  }

  function scrollParallax(): void {
    if (prefersReduced) return;
    const bg = document.querySelector<HTMLElement>('.ambient-brain');
    const hero = document.querySelector<HTMLElement>('.hero-brain-stage');
    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = window.scrollY || 0;
          if (bg) bg.style.transform = `translate(-50%, ${y * 0.08}px)`;
          if (hero) {
            const rect = hero.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight) {
              hero.style.transform = `translateY(${y * 0.12}px)`;
            }
          }
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  function particles(): void {
    const canvas = document.getElementById('bgParticles') as HTMLCanvasElement | null;
    if (!canvas || prefersReduced) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      pulse: number;
    }
    const nodes: Particle[] = [];
    const COUNT = 60;
    const LINK = 130;

    const resize = (): void => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < COUNT; i += 1) {
      nodes.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 0.8 + Math.random() * 1.8,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    const frame = (): void => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const t = performance.now() / 1000;
      for (let i = 0; i < nodes.length; i += 1) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = window.innerWidth + 20;
        if (n.x > window.innerWidth + 20) n.x = -20;
        if (n.y < -20) n.y = window.innerHeight + 20;
        if (n.y > window.innerHeight + 20) n.y = -20;
        const glow = 0.35 + 0.3 * Math.sin(t * 0.6 + n.pulse);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,141,255,${glow.toFixed(3)})`;
        ctx.fill();
        for (let j = i + 1; j < nodes.length; j += 1) {
          const m = nodes[j];
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK) {
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.strokeStyle = `rgba(96,140,255,${(0.1 * (1 - dist / LINK)).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(frame);
    };
    frame();
  }

  function counters(): void {
    if (prefersReduced) return;
    const stats = document.querySelectorAll<HTMLElement>('.hstat strong');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          const text = (el.textContent || '').trim();
          const match = text.match(/^([\d.]+)(.*)$/);
          if (!match) return;
          const target = parseFloat(match[1]);
          const suffix = match[2] || '';
          const start = performance.now();
          const dur = 3400;
          const step = (now: number): void => {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 4);
            const val = target * eased;
            el.textContent = (target % 1 === 0 ? String(Math.round(val)) : val.toFixed(1)) + suffix;
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      },
      { threshold: 0.4 }
    );
    stats.forEach((el) => io.observe(el));
  }

  function ticker(): void {
    const host = document.getElementById('landingTicker');
    if (!host) return;
    const render = (markets: MarketItem[]): void => {
      const items = markets
        .map((market) => {
          const up = market.change.trim().charAt(0) === '+';
          return `<span>${market.symbol} <b class="${up ? 'tk-up' : 'tk-down'}">${Number(market.price).toLocaleString()} ${market.change}</b></span>`;
        })
        .join('');
      host.innerHTML = `<div class="ticker-marquee-track">${items}${items}</div>`;
    };
    const fallback = (): void => {
      render([
        { symbol: 'XAUUSD', price: 2385.45, change: '+0.79%' },
        { symbol: 'EURUSD', price: 1.0958, change: '+0.12%' },
        { symbol: 'BTCUSD', price: 64450, change: '+1.84%' },
        { symbol: 'NAS100', price: 18845, change: '+0.66%' },
        { symbol: 'GBPJPY', price: 195.42, change: '-0.21%' },
        { symbol: 'USDJPY', price: 152.35, change: '+0.08%' },
      ]);
    };
    fetch('/api/markets')
      .then((res) => {
        if (!res.ok) throw new Error('markets');
        return res.json();
      })
      .then((data: { markets?: MarketItem[] }) => {
        if (data && data.markets && data.markets.length) render(data.markets);
        else fallback();
      })
      .catch(fallback);
  }

  function initHeroVisible(): void {
    const hero = document.querySelectorAll<HTMLElement>('.hero-neural [data-cinematic]');
    hero.forEach((el, i) => {
      const delay = parseInt(el.getAttribute('data-delay') || String(i * 200), 10);
      setTimeout(() => {
        el.classList.add('is-visible');
      }, prefersReduced ? 0 : 500 + delay * 1.6);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initHeroVisible();
    reveal();
    parallaxBrain();
    scrollParallax();
    particles();
    counters();
    ticker();
  });
})();
