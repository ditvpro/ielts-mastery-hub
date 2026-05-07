/**
 * Utility functions for IELTS Mastery Hub
 */
const Utils = {
  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  },

  formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  formatDateTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  calculateWordCount(text) {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  },

  calculateBandAverage(scores) {
    if (!scores || scores.length === 0) return 0;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg * 2) / 2; // Round to nearest 0.5
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  showModal(title, content, buttons = []) {
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    const footerEl = document.getElementById('modalFooter');
    titleEl.textContent = title;
    bodyEl.innerHTML = content;
    footerEl.innerHTML = '';
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.className = `btn ${btn.class || 'btn-primary'}`;
      button.textContent = btn.text;
      button.onclick = () => { btn.onClick?.(); if (btn.closeOnClick !== false) this.closeModal(); };
      footerEl.appendChild(button);
    });
    overlay.style.display = 'flex';
    document.getElementById('modalClose').onclick = () => this.closeModal();
    overlay.onclick = (e) => { if (e.target === overlay) this.closeModal(); };
  },

  closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
  },

  getVoices() {
    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices();
      if (voices.length) {
        resolve(voices.filter(v => v.lang.startsWith('en')));
        return;
      }
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        resolve(voices.filter(v => v.lang.startsWith('en')));
      };
    });
  },

  populateVoiceSelect(selectElementId) {
    this.getVoices().then(voices => {
      const select = document.getElementById(selectElementId);
      if (!select) return;
      const defaultVoiceURI = Storage.getPreferredVoice();
      select.innerHTML = voices.map(v => 
        `<option value="${v.voiceURI}" ${v.voiceURI === defaultVoiceURI ? 'selected' : ''}>${v.name} (${v.lang})</option>`
      ).join('');
      
      select.addEventListener('change', (e) => {
        Storage.setPreferredVoice(e.target.value);
        Utils.showToast('Voice updated!', 'success');
      });
    });
  },

  showLoading(text = 'Processing...') {
    const overlay = document.getElementById('loadingOverlay');
    overlay.querySelector('.loading-text').textContent = text;
    overlay.style.display = 'flex';
  },

  hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
  },

  getBandColor(band) {
    if (band >= 7.0) return 'var(--accent-info)';
    if (band >= 6.0) return 'var(--accent-success)';
    if (band >= 5.0) return 'var(--accent-warning)';
    return 'var(--accent-error)';
  },

  createProgressBar(value, max = 9, size = '') {
    const pct = Math.min((value / max) * 100, 100);
    return `<div class="progress-bar ${size}"><div class="progress-bar-fill" style="width:${pct}%"></div></div>`;
  },
};
