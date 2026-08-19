(() => {
  const existingToken = localStorage.getItem('kingbotToken');
  if (existingToken) {
    window.location.replace('/dashboard');
    return;
  }

  const page = document.body.dataset.authPage || 'login';
  let pendingCredential: string | null = null;

  const pendingRef = (() => {
    const fromUrl = new URLSearchParams(window.location.search).get('ref');
    if (fromUrl) localStorage.setItem('kingbotRef', fromUrl.trim().toUpperCase());
    return localStorage.getItem('kingbotRef') || '';
  })();

  const finishAuth = (data: { token: string }): void => {
    localStorage.setItem('kingbotToken', data.token);
    localStorage.removeItem('kingbotRef');
    window.location.replace('/dashboard');
  };

  const handleGoogleCredential = async (response: GoogleCredentialResponse): Promise<void> => {
    const termsCheckbox = document.getElementById('termsCheckbox') as HTMLInputElement | null;
    const acceptedTerms = page === 'login' ? true : !!termsCheckbox?.checked;
    if (page === 'signup' && !acceptedTerms) {
      pendingCredential = response.credential;
      window.KingBotUI?.openModal(document.getElementById('termsModal'));
      return;
    }
    await submitGoogleCredential(response.credential, acceptedTerms);
  };

  const submitGoogleCredential = async (credential: string, acceptedTerms: boolean): Promise<void> => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, acceptedTerms, ref: pendingRef }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'terms_required') {
          pendingCredential = credential;
          window.KingBotUI?.openModal(document.getElementById('termsModal'));
          return;
        }
        window.KingBotUI?.toast(data.error || 'Google sign-in failed', 'error');
        return;
      }
      window.KingBotUI?.toast('Signed in with Google', 'success');
      finishAuth(data);
    } catch {
      window.KingBotUI?.toast('Network error during Google sign-in', 'error');
    }
  };

  const initGoogle = (clientId: string): void => {
    const target = document.getElementById('googleBtn');
    if (!clientId) {
      if (target) {
        target.innerHTML =
          '<p style="font-size:0.8rem;color:var(--muted);text-align:center;margin:0;">Google sign-in is not configured yet.</p>';
      }
      return;
    }
    if (!window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleCredential });
    if (target) {
      const width = Math.min(Math.max(target.offsetWidth || 320, 240), 400);
      window.google.accounts.id.renderButton(target, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        width,
        text: page === 'signup' ? 'signup_with' : 'signin_with',
        logo_alignment: 'center',
      });
    }
  };

  const loadGoogleScript = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google script'));
      document.head.appendChild(script);
    });

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const configRes = await fetch('/api/config');
      const config = (await configRes.json()) as { googleClientId?: string };
      await loadGoogleScript();
      initGoogle(config.googleClientId || '');
    } catch {
      const target = document.getElementById('googleBtn');
      if (target) {
        target.innerHTML =
          '<p style="font-size:0.8rem;color:var(--muted);text-align:center;margin:0;">Google sign-in unavailable right now.</p>';
      }
    }
  });

  document.getElementById('acceptTermsBtn')?.addEventListener('click', async () => {
    const modal = document.getElementById('termsModal');
    window.KingBotUI?.closeModal(modal);
    const checkbox = document.getElementById('termsCheckbox') as HTMLInputElement | null;
    if (checkbox) checkbox.checked = true;
    if (pendingCredential) {
      await submitGoogleCredential(pendingCredential, true);
      pendingCredential = null;
    }
  });

  const eyeOpen = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeClosed = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  document.querySelectorAll<HTMLButtonElement>('.pw-toggle').forEach((toggle) => {
    toggle.innerHTML = eyeClosed;
    toggle.setAttribute('aria-label', 'Show password');
    toggle.addEventListener('click', () => {
      const targetId = toggle.dataset.for;
      const input = targetId ? (document.getElementById(targetId) as HTMLInputElement | null) : null;
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggle.innerHTML = isPassword ? eyeOpen : eyeClosed;
      toggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  });

  const loginForm = document.getElementById('loginForm') as HTMLFormElement | null;
  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = loginForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    window.KingBotUI?.setButtonLoading(submitButton, true, 'Logging in');
    const formData = new FormData(loginForm);
    const payload = Object.fromEntries(formData.entries());
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        window.KingBotUI?.toast(data.error || 'Login failed', 'error');
        return;
      }
      window.KingBotUI?.toast('Login successful', 'success');
      finishAuth(data);
    } catch {
      window.KingBotUI?.toast('Network error, please try again', 'error');
    } finally {
      window.KingBotUI?.setButtonLoading(submitButton, false);
    }
  });

  const signupForm = document.getElementById('signupForm') as HTMLFormElement | null;
  const signupSubmit = signupForm?.querySelector<HTMLButtonElement>('button[type="submit"]') || null;
  const signupTerms = document.getElementById('termsCheckbox') as HTMLInputElement | null;

  const refBadge = document.getElementById('refBadge');
  if (refBadge && pendingRef) {
    refBadge.style.display = 'flex';
    const codeEl = refBadge.querySelector('[data-ref-code]');
    if (codeEl) codeEl.textContent = pendingRef;
  }

  const syncSignupButton = (): void => {
    if (signupSubmit) signupSubmit.disabled = !signupTerms?.checked;
  };
  signupTerms?.addEventListener('change', syncSignupButton);
  syncSignupButton();

  signupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!signupTerms?.checked) {
      window.KingBotUI?.toast('Please accept the Terms and Conditions to continue', 'error');
      return;
    }
    window.KingBotUI?.setButtonLoading(signupSubmit ?? null, true, 'Creating account');
    const formData = new FormData(signupForm);
    const payload: Record<string, unknown> = Object.fromEntries(formData.entries());
    payload.acceptedTerms = true;
    if (pendingRef) payload.ref = pendingRef;
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        window.KingBotUI?.toast(data.error || 'Signup failed', 'error');
        return;
      }
      window.KingBotUI?.toast('Account created. Welcome to King Bot.', 'success');
      finishAuth(data);
    } catch {
      window.KingBotUI?.toast('Network error, please try again', 'error');
    } finally {
      window.KingBotUI?.setButtonLoading(signupSubmit ?? null, false);
    }
  });
})();
