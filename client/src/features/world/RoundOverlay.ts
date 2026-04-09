/**
 * Data for the round outcome card shown after each round ends.
 */
export interface RoundOutcome {
  roundNumber: number;
  survivors: string[];  // entity names alive at round end
  removed: string[];    // entity names eliminated during round
}

/**
 * RoundOverlay manages three DOM overlays for the round lifecycle:
 *
 * 1. Analyzing spinner — shown while waiting for the AI interaction matrix
 * 2. Countdown timer — shown during the 30s simulation phase
 * 3. Outcome card — shown after the round ends; dismissed by player click
 *
 * Follows the create-on-show / remove-on-dismiss pattern from RecognitionOverlay.
 */
export class RoundOverlay {
  private _spinnerEl: HTMLDivElement | null = null;
  private _countdownEl: HTMLDivElement | null = null;
  private _countdownInterval: ReturnType<typeof setInterval> | null = null;
  private _outcomeEl: HTMLDivElement | null = null;

  /** Show a full-screen semi-transparent overlay with a spinner and "Analyzing..." label. */
  showAnalyzingSpinner(): void {
    if (this._spinnerEl) return; // already visible

    const overlay = document.createElement('div');
    overlay.className =
      'fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-white/65';

    const ring = document.createElement('div');
    ring.className =
      'h-10 w-10 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-800';
    overlay.appendChild(ring);

    const label = document.createElement('div');
    label.textContent = 'Analyzing...';
    label.className = 'text-[15px] font-semibold text-neutral-600';
    overlay.appendChild(label);

    document.body.appendChild(overlay);
    this._spinnerEl = overlay;
  }

  /** Remove the analyzing spinner from the DOM. */
  hideAnalyzingSpinner(): void {
    if (this._spinnerEl) {
      this._spinnerEl.remove();
      this._spinnerEl = null;
    }
  }

  /**
   * Show a countdown badge in the top-right corner and decrement every second.
   *
   * Uses setInterval (wall-clock) rather than PixiJS ticker — this is a display
   * counter that should count seconds regardless of frame rate.
   *
   * @param seconds - Total seconds for the countdown (e.g. 30)
   */
  startCountdown(seconds: number): void {
    if (this._countdownEl) this.stopCountdown(); // clean up any previous

    let remaining = seconds;

    const badge = document.createElement('div');
    badge.className =
      'fixed top-4 right-4 z-10 rounded-md bg-black/75 px-3.5 py-1.5 text-sm font-bold text-white select-none';

    const updateLabel = (): void => {
      badge.textContent = `${remaining}s`;
    };

    updateLabel();
    document.body.appendChild(badge);
    this._countdownEl = badge;

    this._countdownInterval = setInterval(() => {
      remaining -= 1;
      updateLabel();
      if (remaining <= 0) {
        this.stopCountdown();
      }
    }, 1000);
  }

  /** Clear the countdown interval and remove the badge from the DOM. */
  stopCountdown(): void {
    if (this._countdownInterval !== null) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }
    if (this._countdownEl) {
      this._countdownEl.remove();
      this._countdownEl = null;
    }
  }

  /**
   * Show the round outcome card centered on screen.
   *
   * Player clicks anywhere on the card to dismiss it, which triggers onDismiss.
   * Does NOT auto-dismiss on a timer — player reads at their own pace.
   *
   * @param data - Outcome data: round number, survivor names, eliminated names
   * @param onDismiss - Callback fired once when the player clicks to dismiss
   */
  showOutcome(data: RoundOutcome, onDismiss: () => void): void {
    if (this._outcomeEl) return; // already visible — guard against double-show

    let dismissed = false;
    const dismiss = (): void => {
      if (dismissed) return;
      dismissed = true;
      if (this._outcomeEl) {
        this._outcomeEl.remove();
        this._outcomeEl = null;
      }
      onDismiss();
    };

    const card = document.createElement('div');
    card.className =
      'fixed top-1/2 left-1/2 z-50 min-w-[260px] max-w-[400px] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-xl border border-neutral-300 bg-white px-9 py-7 text-center shadow-[0_8px_32px_rgba(0,0,0,0.18)] select-none';

    const heading = document.createElement('div');
    heading.className = 'mb-4 text-[1.4em] font-bold text-neutral-900';
    heading.textContent = `Round ${data.roundNumber} Complete`;
    card.appendChild(heading);

    const survivorsEl = document.createElement('div');
    survivorsEl.className = 'mb-2 text-[0.95em] leading-6 text-neutral-700';
    survivorsEl.textContent = `Survived: ${data.survivors.length > 0 ? data.survivors.join(', ') : 'None'}`;
    card.appendChild(survivorsEl);

    const removedEl = document.createElement('div');
    removedEl.className = 'mb-2 text-[0.95em] leading-6 text-neutral-700';
    removedEl.textContent = `Eliminated: ${data.removed.length > 0 ? data.removed.join(', ') : 'None'}`;
    card.appendChild(removedEl);

    const hint = document.createElement('div');
    hint.className = 'mt-4 text-xs text-neutral-400';
    hint.textContent = 'Click to continue drawing';
    card.appendChild(hint);

    document.body.appendChild(card);
    this._outcomeEl = card;

    card.addEventListener('click', dismiss);
  }

  /**
   * Force-remove the outcome card without triggering onDismiss.
   * Use for cleanup only (e.g. navigating away mid-display).
   */
  hideOutcome(): void {
    if (this._outcomeEl) {
      this._outcomeEl.remove();
      this._outcomeEl = null;
    }
  }
}
