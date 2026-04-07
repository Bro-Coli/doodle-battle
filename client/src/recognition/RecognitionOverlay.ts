import type { EntityProfile } from '@crayon-world/shared';

export class RecognitionOverlay {
  private spinnerEl: HTMLDivElement | null = null;
  private spinnerTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private cardEl: HTMLDivElement | null = null;
  private cardTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private toastEl: HTMLDivElement | null = null;
  private mockBadgeEl: HTMLDivElement | null = null;

  showSpinner(): void {
    if (this.spinnerEl) return;

    const overlay = document.createElement('div');
    overlay.className = 'spinner-overlay';

    const spinner = document.createElement('div');
    spinner.className = 'spinner';

    const timeoutMsg = document.createElement('div');
    timeoutMsg.className = 'spinner-timeout-msg';
    timeoutMsg.textContent = 'Taking longer than expected...';
    timeoutMsg.style.display = 'none';

    overlay.appendChild(spinner);
    overlay.appendChild(timeoutMsg);
    document.body.appendChild(overlay);

    this.spinnerEl = overlay;

    // Soft timeout: show message after 10 seconds
    this.spinnerTimeoutId = setTimeout(() => {
      timeoutMsg.style.display = 'block';
    }, 10_000);
  }

  hideSpinner(): void {
    if (this.spinnerTimeoutId !== null) {
      clearTimeout(this.spinnerTimeoutId);
      this.spinnerTimeoutId = null;
    }
    if (this.spinnerEl) {
      this.spinnerEl.remove();
      this.spinnerEl = null;
    }
  }

  showCard(profile: EntityProfile, onDismiss: () => void): void {
    this.hideSpinner();

    let dismissed = false;
    const dismiss = (): void => {
      if (dismissed) return;
      dismissed = true;
      if (this.cardTimeoutId !== null) {
        clearTimeout(this.cardTimeoutId);
        this.cardTimeoutId = null;
      }
      if (this.cardEl) {
        this.cardEl.remove();
        this.cardEl = null;
      }
      onDismiss();
    };

    const card = document.createElement('div');
    card.className = 'result-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', `Entity: ${profile.name}`);

    const nameEl = document.createElement('div');
    nameEl.className = 'result-card__name';
    nameEl.textContent = profile.name;

    const archetypeEl = document.createElement('div');
    archetypeEl.className = 'result-card__archetype';
    archetypeEl.textContent = profile.archetype.toUpperCase();

    const traitsEl = document.createElement('div');
    traitsEl.className = 'result-card__traits';
    traitsEl.textContent = profile.traits.join(', ');

    const roleEl = document.createElement('div');
    roleEl.className = 'result-card__role';
    roleEl.textContent = profile.role;

    const hintEl = document.createElement('div');
    hintEl.className = 'result-card__hint';
    hintEl.textContent = 'Click to dismiss';

    card.appendChild(nameEl);
    card.appendChild(archetypeEl);
    card.appendChild(traitsEl);
    card.appendChild(roleEl);
    card.appendChild(hintEl);
    document.body.appendChild(card);

    this.cardEl = card;

    card.addEventListener('click', dismiss);

    // Auto-dismiss after 5 seconds
    this.cardTimeoutId = setTimeout(dismiss, 5_000);
  }

  showError(message: string, onDismiss: () => void): void {
    this.hideSpinner();

    const dismiss = (): void => {
      if (this.toastEl) {
        this.toastEl.remove();
        this.toastEl = null;
      }
      onDismiss();
    };

    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.setAttribute('role', 'alert');

    const msgEl = document.createElement('span');
    msgEl.className = 'error-toast__msg';
    msgEl.textContent = message;

    const retryBtn = document.createElement('button');
    retryBtn.className = 'error-toast__retry';
    retryBtn.textContent = 'Retry';
    retryBtn.addEventListener('click', dismiss);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'error-toast__close';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Dismiss');
    closeBtn.addEventListener('click', dismiss);

    toast.appendChild(msgEl);
    toast.appendChild(retryBtn);
    toast.appendChild(closeBtn);
    document.body.appendChild(toast);

    this.toastEl = toast;
  }

  showMockBadge(): void {
    if (this.mockBadgeEl) return;

    const badge = document.createElement('div');
    badge.className = 'mock-badge';
    badge.textContent = 'Mock Mode';
    document.body.appendChild(badge);

    this.mockBadgeEl = badge;
  }
}
