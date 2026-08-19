"use strict";
(() => {
    document.getElementById('supportForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const form = event.target;
        const button = form.querySelector('button');
        window.KingBotUI?.setButtonLoading(button, true, 'Sending');
        setTimeout(() => {
            window.KingBotUI?.setButtonLoading(button, false);
            window.KingBotUI?.toast('Message sent. Our team will reply by email.', 'success');
            form.reset();
        }, 700);
    });
    document.getElementById('pageLoader')?.classList.add('is-hidden');
})();
