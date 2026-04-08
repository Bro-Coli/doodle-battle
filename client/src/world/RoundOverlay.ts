/**
 * RoundOverlay manages two DOM overlays for the round lifecycle:
 *
 * 1. Analyzing spinner — shown while waiting for the AI interaction matrix
 * 2. Countdown timer — shown during the 30s simulation phase
 *
 * Follows the create-on-show / remove-on-dismiss pattern from RecognitionOverlay.
 */
export class RoundOverlay {
  private _spinnerEl: HTMLDivElement | null = null;
  private _countdownEl: HTMLDivElement | null = null;
  private _countdownInterval: ReturnType<typeof setInterval> | null = null;

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
}
