"use strict";
(() => {
    const lessons = [
        { title: 'Reading Order Blocks', level: 'Beginner', minutes: 8 },
        { title: 'Liquidity Sweeps Explained', level: 'Beginner', minutes: 10 },
        { title: 'Fair Value Gaps in Practice', level: 'Intermediate', minutes: 12 },
        { title: 'Position Sizing and Risk', level: 'Intermediate', minutes: 9 },
        { title: 'Trading the London Session', level: 'Intermediate', minutes: 11 },
        { title: 'Reading AI Confidence Scores', level: 'Advanced', minutes: 14 },
    ];
    const grid = document.getElementById('lessonGrid');
    if (grid) {
        grid.innerHTML = lessons
            .map((lesson) => `
      <div class="widget-panel reveal">
        <h3>${lesson.title}</h3>
        <p style="color: var(--muted); font-size: 0.85rem;">${lesson.level} &middot; ${lesson.minutes} min lesson</p>
        <span class="stat-pill">Coming soon</span>
      </div>
    `)
            .join('');
    }
    document.getElementById('pageLoader')?.classList.add('is-hidden');
})();
