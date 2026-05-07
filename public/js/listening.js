/**
 * Listening Module - IELTS listening practice with transcript and speed control
 */
const Listening = {
  currentSet: null,
  answers: {},
  submitted: false,
  playbackSpeed: 1,
  showTranscript: false,
  utterance: null,
  speaking: false,
  currentWordIndex: 0,
  words: [],
  timer: null,
  isPaused: true,

  render(force = false) {
    const container = document.getElementById('view-listening');
    if (this.isRendered && !force) return;
    this.isRendered = true;
    const history = Storage.getListeningHistory();
    container.innerHTML = `
      <div class="listening-container animate-fadeInUp">
        <div class="section-header">
          <h1>Listening Practice</h1>
          <p>Practice listening comprehension with transcripts</p>
        </div>
        <div class="card mb-lg">
          <div class="btn-group">
            <button class="btn btn-primary" id="loadRandomListening">Random Set</button>
            <button class="btn btn-secondary" id="browseListening">Browse All</button>
          </div>
        </div>
        <div id="listeningWorkspace"></div>
        ${history.length ? `
        <div class="card mt-lg">
          <div class="card-header"><h3 class="card-title">Listening History</h3></div>
          <div class="session-list">
            ${history.slice(0, 5).map(h => `
              <div class="session-item">
                <div>
                  <div style="font-weight:600;font-size:var(--fs-sm);">${Utils.escapeHtml(h.title || 'Listening Set')}</div>
                  <div style="font-size:var(--fs-xs);color:var(--text-muted);">${Utils.formatDate(h.date)}</div>
                </div>
                <span class="badge ${h.correct >= 7 ? 'badge-success' : 'badge-warning'}">${h.correct}/${h.total}</span>
              </div>`).join('')}
          </div>
        </div>` : ''}
      </div>`;
    document.getElementById('loadRandomListening').addEventListener('click', () => this.loadSet());
    document.getElementById('browseListening').addEventListener('click', () => this.browseSets());
  },

  async browseSets() {
    try {
      const list = await API.getAllListeningSets();
      const html = list.map(s => `
        <div class="session-item" style="cursor:pointer" data-id="${s.id}">
          <div><div style="font-weight:600">${Utils.escapeHtml(s.title)}</div>
          <div style="font-size:var(--fs-xs);color:var(--text-muted)">${s.section} · ${s.topic}</div></div>
        </div>`).join('');
      Utils.showModal('Select a Listening Set', `<div class="session-list">${html}</div>`, []);
      setTimeout(() => {
        document.querySelectorAll('#modalBody .session-item').forEach(item => {
          item.addEventListener('click', () => { this.loadSet(item.dataset.id); Utils.closeModal(); });
        });
      }, 100);
    } catch (err) { Utils.showToast('Failed to load sets', 'error'); }
  },

  async loadSet(id) {
    Utils.showLoading('Loading listening set...');
    try {
      this.currentSet = await API.getListeningSet(id);
      this.answers = {};
      this.submitted = false;
      this.showTranscript = false;
      this.isPaused = true;
      this.words = this.currentSet.transcript.split(/\s+/);
      this.currentWordIndex = 0;
      this.renderWorkspace();
    } catch (err) { Utils.showToast('Failed to load: ' + err.message, 'error'); }
    Utils.hideLoading();
  },

  renderWorkspace() {
    const s = this.currentSet;
    document.getElementById('listeningWorkspace').innerHTML = `
      <div class="audio-player-card mb-lg">
        <h3 style="margin-bottom:var(--space-md)">${Utils.escapeHtml(s.title)} <span class="badge badge-info">${s.section}</span></h3>
        <div class="audio-controls">
          <button class="play-btn" id="playBtn">▶️</button>
          <div class="audio-progress">
            <div class="audio-progress-bar" id="progressBar">
              <div class="audio-progress-fill" id="progressFill"></div>
            </div>
          </div>
          <span class="audio-time" id="audioTime">0:00</span>
          <div class="speed-controls">
            <select class="select btn-sm" id="voiceSelect" style="max-width: 150px; margin-right: 8px;"></select>
            <button class="speed-btn" data-speed="0.75">0.75x</button>
            <button class="speed-btn active" data-speed="1">1x</button>
            <button class="speed-btn" data-speed="1.25">1.25x</button>
          </div>
        </div>
        <p style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:var(--space-sm);">
          ℹ️ Audio is simulated using text-to-speech. Click Play to hear the transcript read aloud.
        </p>
      </div>
      <div class="listening-questions mb-lg">
        <h3 style="margin-bottom:var(--space-md)">Questions</h3>
        ${s.questions.map((q, i) => this.renderQuestion(q, i)).join('')}
        <div style="margin-top:var(--space-lg); display:flex; gap: var(--space-sm);">
          <button class="btn btn-danger btn-lg" id="cancelListening" style="flex:1">⏹️ Cancel</button>
          <button class="btn btn-primary btn-lg" id="submitListeningAnswers" style="flex:3">📤 Submit Answers</button>
        </div>
      </div>
      <div class="transcript-toggle">
        <button class="btn btn-secondary" id="toggleTranscript" ${!this.submitted ? 'disabled' : ''}>
          📝 ${this.showTranscript ? 'Hide' : 'Show'} Transcript
        </button>
      </div>
      <div id="transcriptContent" class="${this.showTranscript ? '' : 'hidden'}">
        <div class="transcript-content">${Utils.escapeHtml(s.transcript)}</div>
      </div>
      <div id="listeningScoreContainer"></div>`;

    this.bindEvents();
  },

  renderQuestion(q, index) {
    let input = '';
    if (q.type === 'multiple-choice') {
      input = `<div class="question-options">${(q.options || []).map(opt =>
        `<label class="option-label"><input type="radio" name="lq_${q.id}" value="${opt.charAt(0)}" data-qid="${q.id}"> ${Utils.escapeHtml(opt)}</label>`
      ).join('')}</div>`;
    } else {
      input = `<input type="text" class="input listening-input" data-qid="${q.id}" placeholder="Type your answer">`;
    }
    return `<div class="listening-question-item" id="lqi_${q.id}">
      <div class="question-number">Question ${index + 1}</div>
      <div class="question-text">${Utils.escapeHtml(q.question)}</div>
      ${input}
    </div>`;
  },

  bindEvents() {
    document.getElementById('playBtn')?.addEventListener('click', () => this.togglePlay());
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.playbackSpeed = parseFloat(btn.dataset.speed);
        if (this.speaking) { this.stopSpeaking(); this.startSpeaking(); }
      });
    });
    document.getElementById('submitListeningAnswers')?.addEventListener('click', () => this.submitAnswers());
    document.getElementById('cancelListening')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to cancel this listening session? Your progress will be lost.')) {
        this.stopSpeaking();
        this.currentSet = null;
        this.answers = {};
        document.getElementById('listeningWorkspace').innerHTML = '';
      }
    });
    document.getElementById('toggleTranscript')?.addEventListener('click', () => {
      this.showTranscript = !this.showTranscript;
      document.getElementById('transcriptContent')?.classList.toggle('hidden');
      const btn = document.getElementById('toggleTranscript');
      if (btn) btn.textContent = `📝 ${this.showTranscript ? 'Hide' : 'Show'} Transcript`;
    });
    // Collect answers
    document.querySelectorAll('input[type="radio"]').forEach(r => {
      r.addEventListener('change', () => { this.answers[r.dataset.qid] = r.value; });
    });
    document.querySelectorAll('.listening-input').forEach(input => {
      input.addEventListener('input', () => { this.answers[input.dataset.qid] = input.value.trim(); });
    });
    
    // Populate voice select
    Utils.populateVoiceSelect('voiceSelect');
  },

  togglePlay() {
    if (this.speaking) { this.stopSpeaking(); }
    else { this.startSpeaking(); }
  },

  startSpeaking() {
    if (!('speechSynthesis' in window)) { Utils.showToast('Text-to-speech not supported', 'error'); return; }
    const text = this.currentSet.transcript;
    window.speechSynthesis.cancel();
    this.utterance = new SpeechSynthesisUtterance(text);
    
    const prefVoice = Storage.getPreferredVoice();
    if (prefVoice) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.voiceURI === prefVoice);
      if (voice) this.utterance.voice = voice;
    }
    
    this.utterance.lang = CONFIG.SPEECH_LANG;
    this.utterance.rate = this.playbackSpeed;
    this.speaking = true;

    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.textContent = '⏸️';

    // Simulate progress
    const estimatedDuration = (text.split(/\s+/).length / 2.5) / this.playbackSpeed;
    let elapsed = 0;
    this.progressInterval = setInterval(() => {
      elapsed += 0.1;
      const pct = Math.min((elapsed / estimatedDuration) * 100, 100);
      const fill = document.getElementById('progressFill');
      if (fill) fill.style.width = `${pct}%`;
      const time = document.getElementById('audioTime');
      if (time) time.textContent = Utils.formatTime(Math.floor(elapsed));
    }, 100);

    this.utterance.onend = () => { this.stopSpeaking(); };
    window.speechSynthesis.speak(this.utterance);
  },

  stopSpeaking() {
    window.speechSynthesis.cancel();
    this.speaking = false;
    clearInterval(this.progressInterval);
    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.textContent = '▶️';
  },

  submitAnswers() {
    if (this.submitted) return;
    this.submitted = true;
    this.stopSpeaking();
    let correct = 0;
    const total = this.currentSet.questions.length;

    this.currentSet.questions.forEach(q => {
      const userAnswer = (this.answers[q.id] || '').trim().toLowerCase();
      const correctAnswer = (q.answer || '').trim().toLowerCase();
      const isCorrect = userAnswer === correctAnswer;
      if (isCorrect) correct++;

      const item = document.getElementById(`lqi_${q.id}`);
      if (item) {
        item.classList.add(isCorrect ? 'correct' : 'incorrect');
        if (!isCorrect) {
          item.insertAdjacentHTML('beforeend', `<div class="correct-answer-display">✅ Correct: ${Utils.escapeHtml(q.answer)}</div>`);
        }
      }
    });

    // Score
    const score = Math.round((correct / total) * 9 * 2) / 2;
    document.getElementById('listeningScoreContainer').innerHTML = `
      <div class="listening-score mt-lg">
        <div class="score-number">${correct}/${total}</div>
        <div style="flex:1"><div style="font-weight:600">Estimated Band: ${score}</div></div>
      </div>`;

    Storage.saveListeningAttempt({ id: Utils.generateId(), title: this.currentSet.title, correct, total, score, date: new Date().toISOString() });
    document.getElementById('submitListeningAnswers').disabled = true;
    document.getElementById('toggleTranscript').disabled = false;
    Utils.showToast(`Score: ${correct}/${total}`, correct >= 7 ? 'success' : 'warning');
  },
};
