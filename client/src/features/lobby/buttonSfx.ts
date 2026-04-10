import lobbyButtonClickPrimary from './assets/lobby-button-click-primary.wav';

let lobbyClickAudio: HTMLAudioElement | null = null;

export function playButtonSfx(): void {
  if (typeof Audio === 'undefined') return;
  if (!lobbyClickAudio) {
    lobbyClickAudio = new Audio(lobbyButtonClickPrimary);
    lobbyClickAudio.preload = 'auto';
  }

  lobbyClickAudio.currentTime = 0;
  void lobbyClickAudio.play().catch(() => {
    // Ignore autoplay/promise rejection noise.
  });
}
