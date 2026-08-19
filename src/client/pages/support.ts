(() => {
  (document.getElementById('supportForm') as HTMLFormElement | null)?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const button = form.querySelector<HTMLButtonElement>('button');
    window.KingBotUI?.setButtonLoading(button, true, 'Sending');
    setTimeout(() => {
      window.KingBotUI?.setButtonLoading(button, false);
      window.KingBotUI?.toast('Message sent. Our team will reply by email.', 'success');
      form.reset();
    }, 700);
  });

  document.getElementById('pageLoader')?.classList.add('is-hidden');
})();
