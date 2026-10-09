/**
 * Отдельный сайт панели учителя (teacher.html)
 */
import './style.css';
import { playClick, unlockAudio } from './audio.js';
import { mountTeacher } from './teacher.js';

const app = document.getElementById('app');

function toast(message) {
  const box = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function createParticles() {
  const box = document.getElementById('bg-particles');
  if (!box) return;
  box.innerHTML = '';
  const symbols = ['🧬', '📊', '🏆', '🔬', '✨', '📋'];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    el.textContent = symbols[i % symbols.length];
    el.style.left = `${Math.random() * 100}%`;
    el.style.animationDuration = `${14 + Math.random() * 18}s`;
    el.style.animationDelay = `${-Math.random() * 20}s`;
    el.style.fontSize = `${1 + Math.random() * 1.2}rem`;
    box.appendChild(el);
  }
}

document.documentElement.setAttribute('data-theme', 'light');
createParticles();
document.addEventListener('pointerdown', () => unlockAudio(), { once: true });

function bootTeacher() {
  mountTeacher(app, {
    toast,
    playClick,
    goHome: bootTeacher,
  });
}

bootTeacher();
