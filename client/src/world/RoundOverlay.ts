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
    overlay.id = 'round-spinner';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'background:rgba(255,255,255,0.65)',
      'z-index:40',
      'gap:16px',
      'font-family:sans-serif',
    ].join(';');

    const ring = document.createElement('div');
    ring.className = 'spinner'; // reuse existing spin animation from style.css
    overlay.appendChild(ring);

    const label = document.createElement('div');
    label.textContent = 'Analyzing...';
    label.style.cssText = 'font-size:15px;color:#555555;font-weight:600;';
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
    badge.id = 'round-countdown';
    badge.style.cssText = [
      'position:fixed',
      'top:16px',
      'right:16px',
      'background:rgba(0,0,0,0.75)',
      'color:#ffffff',
      'border-radius:6px',
      'padding:6px 14px',
      'font-family:sans-serif',
      'font-size:14px',
      'font-weight:700',
      'z-index:10',
      'user-select:none',
    ].join(';');

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
    card.id = 'round-outcome';

    const heading = document.createElement('div');
    heading.className = 'round-outcome__heading';
    heading.textContent = `Round ${data.roundNumber} Complete`;
    card.appendChild(heading);

    const survivorsEl = document.createElement('div');
    survivorsEl.className = 'round-outcome__section';
    survivorsEl.textContent = `Survived: ${data.survivors.length > 0 ? data.survivors.join(', ') : 'None'}`;
    card.appendChild(survivorsEl);

    const removedEl = document.createElement('div');
    removedEl.className = 'round-outcome__section';
    removedEl.textContent = `Eliminated: ${data.removed.length > 0 ? data.removed.join(', ') : 'None'}`;
    card.appendChild(removedEl);

    const hint = document.createElement('div');
    hint.className = 'round-outcome__hint';
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
