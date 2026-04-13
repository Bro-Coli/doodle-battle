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
    overlay.className =
      'fixed inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-white/65';

    const spinner = document.createElement('div');
    spinner.className =
      'h-10 w-10 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-800';

    const timeoutMsg = document.createElement('div');
    timeoutMsg.className = 'hidden text-[13px] text-neutral-500';
    timeoutMsg.textContent = 'Taking longer than expected...';

    overlay.appendChild(spinner);
    overlay.appendChild(timeoutMsg);
    document.body.appendChild(overlay);

    this.spinnerEl = overlay;

    // Soft timeout: show message after 10 seconds
    this.spinnerTimeoutId = setTimeout(() => {
      timeoutMsg.classList.remove('hidden');
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
    card.className =
      'fixed top-1/2 left-1/2 z-30 min-w-[260px] max-w-[400px] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-xl border border-neutral-300 bg-white px-9 py-7 text-center shadow-[0_8px_32px_rgba(0,0,0,0.18)] select-none';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', `Entity: ${profile.name}`);

    const nameEl = document.createElement('div');
    nameEl.className = 'mb-2.5 text-2xl font-bold text-neutral-950';
    nameEl.textContent = profile.name;

    const archetypeEl = document.createElement('div');
    archetypeEl.className =
      'mb-3.5 inline-block rounded bg-neutral-800 px-2.5 py-0.5 text-[0.7em] font-bold tracking-[0.1em] text-white uppercase';
    archetypeEl.textContent = profile.archetype.toUpperCase();

    const styleEl = document.createElement('div');
    styleEl.className = 'mb-2.5 text-[0.9em] italic text-neutral-600';
    styleEl.textContent =
      profile.movementStyle.charAt(0).toUpperCase() + profile.movementStyle.slice(1);

    const statsEl = document.createElement('div');
    statsEl.className = 'mb-4 text-[0.85em] text-neutral-700';
    statsEl.textContent = `HP ${profile.maxHealth} \u00B7 Speed ${profile.speed} \u00B7 Agility ${profile.agility} \u00B7 Energy ${profile.energy}`;

    const hintEl = document.createElement('div');
    hintEl.className = 'text-xs text-neutral-400';
    hintEl.textContent = 'Click to dismiss';

    card.appendChild(nameEl);
    card.appendChild(archetypeEl);
    card.appendChild(styleEl);
    card.appendChild(statsEl);
    card.appendChild(hintEl);
    document.body.appendChild(card);

    this.cardEl = card;

    card.addEventListener('click', dismiss);

    // Auto-dismiss after 5 seconds
    this.cardTimeoutId = setTimeout(dismiss, 5_000);
  }

  showError(message: string, onDismiss: () => void, onRetry?: () => void): void {
    this.hideSpinner();

    const dismiss = (): void => {
      if (this.toastEl) {
        this.toastEl.remove();
        this.toastEl = null;
      }
      onDismiss();
    };

    const toast = document.createElement('div');
    toast.className =
      'fixed top-20 left-1/2 z-30 flex max-w-[480px] -translate-x-1/2 items-center gap-3 rounded-lg bg-red-600/92 px-4 py-2.5 text-sm text-white shadow-[0_4px_16px_rgba(0,0,0,0.18)]';
    toast.setAttribute('role', 'alert');

    const msgEl = document.createElement('span');
    msgEl.className = 'flex-1';
    msgEl.textContent = message;

    const retryBtn = document.createElement('button');
    retryBtn.className =
      'cursor-pointer rounded border border-white/40 bg-white/20 px-2.5 py-1 text-[13px] text-white transition hover:bg-white/35';
    retryBtn.textContent = 'Retry';
    retryBtn.addEventListener('click', () => {
      if (this.toastEl) {
        this.toastEl.remove();
        this.toastEl = null;
      }
      if (onRetry) {
        onRetry();
      } else {
        onDismiss();
      }
    });

    const closeBtn = document.createElement('button');
    closeBtn.className =
      'cursor-pointer rounded border border-white/40 bg-white/20 px-2.5 py-1 text-[13px] text-white transition hover:bg-white/35';
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
    badge.className =
      'fixed bottom-4 left-4 z-10 rounded bg-black/12 px-2.5 py-1 text-[11px] tracking-[0.05em] text-neutral-500 select-none';
    badge.textContent = 'Mock Mode';
    document.body.appendChild(badge);

    this.mockBadgeEl = badge;
  }
}
