/**
 * Звуковые эффекты через Web Audio API (без внешних файлов)
 */

let audioCtx = null;
let enabled = true;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setSoundEnabled(value) {
  enabled = Boolean(value);
}

export function isSoundEnabled() {
  return enabled;
}

function tone(freq, duration, type = 'sine', gainValue = 0.08, when = 0) {
  if (!enabled) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue, ctx.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + duration + 0.02);
  } catch {
    // Audio may be blocked until user gesture
  }
}

export function playClick() {
  tone(520, 0.06, 'triangle', 0.05);
}

export function playCorrect() {
  tone(523, 0.1, 'sine', 0.09, 0);
  tone(659, 0.1, 'sine', 0.09, 0.1);
  tone(784, 0.16, 'sine', 0.1, 0.2);
}

export function playWrong() {
  tone(220, 0.18, 'sawtooth', 0.06, 0);
  tone(165, 0.22, 'sawtooth', 0.05, 0.12);
}

export function playTimeout() {
  tone(400, 0.1, 'square', 0.04, 0);
  tone(300, 0.12, 'square', 0.04, 0.12);
  tone(200, 0.2, 'square', 0.05, 0.24);
}

export function playFinish() {
  const notes = [523, 659, 784, 1046];
  notes.forEach((f, i) => tone(f, 0.18, 'sine', 0.08, i * 0.12));
}

export function playAchievement() {
  tone(660, 0.08, 'sine', 0.07, 0);
  tone(880, 0.08, 'sine', 0.07, 0.09);
  tone(1175, 0.2, 'sine', 0.09, 0.18);
}

export function playCombo() {
  tone(440, 0.07, 'triangle', 0.07, 0);
  tone(554, 0.07, 'triangle', 0.07, 0.07);
  tone(659, 0.07, 'triangle', 0.07, 0.14);
  tone(880, 0.15, 'triangle', 0.08, 0.21);
}

export function unlockAudio() {
  try {
    getCtx();
  } catch {
    /* ignore */
  }
}
