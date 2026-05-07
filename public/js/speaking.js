/**
 * Speaking Module - AI-powered IELTS speaking practice
 */
const Speaking = {
  sessionId: null,
  currentPart: 1,
  messages: [],
  recognition: null,
  isRecording: false,
  timer: null,

  render(force = false) {
    const container = document.getElementById('view-speaking');
    if (this.isRendered && !force) return;
    this.isRendered = true;
    const history = Storage.getSpeakingHistory();
    container.innerHTML = `
      <div class="speaking-container animate-fadeInUp">
        <div class="section-header">
          <h1>🎙️ Speaking Practice</h1>
          <p>Practice with an AI examiner using your microphone</p>
        </div>

        <!-- Part Selector -->
        <div class="part-selector" id="partSelector">
          <button class="part-btn active" data-part="1">
            <span class="part-number">Part 1</span>
            <span class="part-label">Introduction & Interview</span>
          </button>
          <button class="part-btn" data-part="2">
            <span class="part-number">Part 2</span>
            <span class="part-label">Long Turn (Cue Card)</span>
          </button>
          <button class="part-btn" data-part="3">
            <span class="part-number">Part 3</span>
            <span class="part-label">Discussion</span>
          </button>
        </div>

        <!-- Topic Input -->
        <div class="card">
          <div class="input-group">
            <label class="input-label">Topic (optional - leave blank for random)</label>
            <div style="display: flex; gap: var(--space-sm);">
              <input type="text" class="input" id="speakingTopic" placeholder="e.g., Hometown, Education, Technology...">
              <button class="btn btn-primary" id="startSpeaking">Start Session</button>
            </div>
          </div>
        </div>

        <!-- Timer (for Part 2) -->
        <div id="speakingTimer" class="hidden">
          <div class="timer-display" id="speakingTimerDisplay">
            <span class="timer-icon">⏱️</span>
            <span id="speakingTimeText">00:00</span>
          </div>
        </div>

        <!-- Chat Interface -->
        <div class="chat-container" id="chatContainer" style="display: none;">
          <div class="chat-header">
            <div class="chat-status">
              <span class="status-dot" id="statusDot"></span>
              <span id="statusText">Ready</span>
            </div>
            <div class="btn-group">
              <select class="select btn-sm" id="voiceSelect" style="max-width: 150px;"></select>
              <button class="btn btn-sm btn-ghost" id="speakerToggle" title="Toggle text-to-speech">🔊</button>
              <button class="btn btn-sm btn-danger" id="endSession">End Session</button>
            </div>
          </div>
          <div class="chat-messages" id="chatMessages"></div>
          <div class="chat-input-area">
            <input type="text" class="input" id="textInput" placeholder="Type your answer or use the microphone...">
            <button class="mic-btn" id="micBtn" title="Hold to record" aria-label="Record speech">🎤</button>
            <button class="btn btn-primary" id="sendText">Send</button>
          </div>
        </div>

        <!-- History -->
        ${history.length ? `
        <div class="card">
          <div class="card-header"><h3 class="card-title">📋 Session History</h3></div>
          <div class="session-list">
            ${history.slice(0, 5).map(s => `
              <div class="session-item">
                <div>
                  <div style="font-weight: 600; font-size: var(--fs-sm);">Part ${s.part} - ${Utils.escapeHtml(s.topic || 'General')}</div>
                  <div style="font-size: var(--fs-xs); color: var(--text-muted);">${Utils.formatDate(s.date)}</div>
                </div>
                <span class="badge badge-primary">Band ${s.bandEstimate || '—'}</span>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
      </div>
    `;
    this.bindEvents();
  },

  bindEvents() {
    // Part selector
    document.querySelectorAll('.part-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.part-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPart = parseInt(btn.dataset.part);
      });
    });

    document.getElementById('startSpeaking').addEventListener('click', () => this.startSession());
    document.getElementById('endSession')?.addEventListener('click', () => this.endSession());
    document.getElementById('micBtn')?.addEventListener('click', () => this.toggleRecording());
    document.getElementById('sendText')?.addEventListener('click', () => this.sendTextInput());
    document.getElementById('textInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendTextInput();
    });

    // Speaker toggle
    this.ttsEnabled = true;
    document.getElementById('speakerToggle')?.addEventListener('click', (e) => {
      this.ttsEnabled = !this.ttsEnabled;
      e.target.textContent = this.ttsEnabled ? '🔊' : '🔇';
    });
    
    // Populate voice select
    Utils.populateVoiceSelect('voiceSelect');
  },

  async startSession() {
    const topic = document.getElementById('speakingTopic').value.trim();
    Utils.showLoading('Starting speaking session...');
    try {
      const data = await API.startSpeaking(this.currentPart, topic || undefined);
      this.sessionId = data.sessionId;
      this.messages = [];

      document.getElementById('chatContainer').style.display = 'flex';
      document.getElementById('statusDot').classList.add('active');
      document.getElementById('statusText').textContent = 'Session Active';

      this.appendMessage('examiner', data.examinerMessage, data.vietnameseTranslation, data.corrections);
      if (this.ttsEnabled) {
        this.speakText(data.examinerMessage);
      }

      // Part 2: start prep timer
      if (this.currentPart === 2) {
        document.getElementById('speakingTimer').classList.remove('hidden');
        this.startPrepTimer();
      }
    } catch (err) {
      Utils.showToast('Failed to start session: ' + err.message, 'error');
    }
    Utils.hideLoading();
  },

  startPrepTimer() {
    Utils.showToast('You have 1 minute to prepare!', 'info');
    this.timer = new Timer(CONFIG.TIMER.SPEAKING_PREP,
      (remaining) => {
        const el = document.getElementById('speakingTimeText');
        const display = document.getElementById('speakingTimerDisplay');
        if (el) el.textContent = Utils.formatTime(remaining);
        if (display) display.classList.toggle('warning', remaining <= 10);
      },
      () => {
        Utils.showToast('Preparation time is over! Start speaking.', 'warning');
        this.startSpeakingTimer();
      }
    );
    this.timer.start();
  },

  startSpeakingTimer() {
    this.timer = new Timer(CONFIG.TIMER.SPEAKING_PART2,
      (remaining) => {
        const el = document.getElementById('speakingTimeText');
        const display = document.getElementById('speakingTimerDisplay');
        if (el) el.textContent = Utils.formatTime(remaining);
        if (display) display.classList.toggle('warning', remaining <= 30);
      },
      () => Utils.showToast('Speaking time is up!', 'warning')
    );
    this.timer.start();
  },

  toggleRecording() {
    if (this.isRecording) { 
      this.stopRecording(); 
      const text = document.getElementById('textInput').value.trim();
      if (text) {
        document.getElementById('textInput').value = '';
        this.sendResponse(text);
      }
      return; 
    }
    
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      Utils.showToast('Speech recognition not supported. Please use Chrome.', 'error');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = CONFIG.SPEECH_LANG;
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    let finalTranscript = '';
    document.getElementById('textInput').value = '';

    this.recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      document.getElementById('textInput').value = finalTranscript + interim;
      
      // Auto-stop and send after 3 seconds of silence
      clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => {
        if (this.isRecording) {
          this.stopRecording();
          const text = document.getElementById('textInput').value.trim();
          if (text) {
            document.getElementById('textInput').value = '';
            this.sendResponse(text);
          }
        }
      }, 3000);
    };

    this.recognition.onerror = (e) => {
      console.error('Speech error:', e.error);
      this.stopRecording();
      if (e.error !== 'aborted') Utils.showToast('Speech recognition error: ' + e.error, 'error');
    };

    this.recognition.onend = () => {
      if (this.isRecording) {
        this.stopRecording();
      }
    };

    this.recognition.start();
    this.isRecording = true;
    document.getElementById('micBtn').classList.add('recording');
    document.getElementById('statusDot').classList.add('recording');
    document.getElementById('statusText').textContent = 'Recording...';
    
    // Initial silence timeout
    clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      if (this.isRecording && !document.getElementById('textInput').value.trim()) {
        this.stopRecording();
        Utils.showToast('Microphone stopped due to silence', 'info');
      }
    }, 5000);
  },

  stopRecording() {
    if (this.recognition) { this.recognition.stop(); }
    this.isRecording = false;
    clearTimeout(this.silenceTimer);
    document.getElementById('micBtn')?.classList.remove('recording');
    document.getElementById('statusDot')?.classList.remove('recording');
    if (document.getElementById('statusText')) {
      document.getElementById('statusText').textContent = 'Session Active';
    }
  },

  sendTextInput() {
    const input = document.getElementById('textInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    if (this.isRecording) {
      this.stopRecording();
    }
    this.sendResponse(text);
  },

  async sendResponse(text) {
    if (!this.sessionId) return;
    this.appendMessage('user', text);
    document.getElementById('statusText').textContent = 'AI is thinking...';

    try {
      const data = await API.continueSpeaking(this.sessionId, text);
      if (data.examinerResponse) {
        this.appendMessage('examiner', data.examinerResponse, data.vietnameseTranslation, data.corrections);
        if (this.ttsEnabled) {
          this.speakText(data.examinerResponse);
        }
      }
      document.getElementById('statusText').textContent = 'Session Active';

      if (data.bandEstimate) {
        this.lastBandEstimate = data.bandEstimate;
      }
      if (data.testComplete || data.partComplete) {
        this.endSession();
      }
    } catch (err) {
      Utils.showToast('Error: ' + err.message, 'error');
      document.getElementById('statusText').textContent = 'Error occurred';
    }
  },

  appendMessage(role, text, translation = '', corrections = []) {
    this.messages.push({ role, text, translation, corrections, time: new Date().toISOString() });
    const container = document.getElementById('chatMessages');
    const transId = 'trans_' + Math.random().toString(36).substr(2, 9);
    let html = `
      <div class="chat-bubble ${role}">
        <div class="bubble-sender" style="display: flex; justify-content: space-between; align-items: center;">
          <span>${role === 'examiner' ? '🎓 Examiner' : '👤 You'}</span>
          ${translation ? `<button class="btn btn-ghost" style="padding: 0 4px; font-size: 14px; height: auto;" onclick="document.getElementById('${transId}').style.display = document.getElementById('${transId}').style.display === 'none' ? 'block' : 'none'" title="Toggle Translation">🇻🇳</button>` : ''}
        </div>
        <div>${Utils.escapeHtml(text)}</div>
        ${translation ? `<div id="${transId}" style="display: none; font-size: 0.85em; color: var(--text-muted); margin-top: 5px; font-style: italic; border-top: 1px dashed var(--border-color); padding-top: 5px;">${Utils.escapeHtml(translation)}</div>` : ''}
      </div>
    `;
    if (corrections && corrections.length) {
      html += `<div class="corrections-panel">${corrections.map(c => `
        <div class="correction-item">
          <span class="correction-original">${Utils.escapeHtml(c.original)}</span> → 
          <span class="correction-fixed">${Utils.escapeHtml(c.corrected)}</span>
          ${c.explanation ? `<div style="font-size:10px;color:var(--text-muted)">${Utils.escapeHtml(c.explanation)}</div>` : ''}
        </div>`).join('')}</div>`;
    }
    container.insertAdjacentHTML('beforeend', html);
    container.scrollTop = container.scrollHeight;
  },

  speakText(text) {
    if (!this.ttsEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const prefVoice = Storage.getPreferredVoice();
    if (prefVoice) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.voiceURI === prefVoice);
      if (voice) utterance.voice = voice;
    }
    
    utterance.lang = CONFIG.SPEECH_LANG;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  },

  endSession() {
    if (this.timer) this.timer.pause();
    this.stopRecording();
    window.speechSynthesis?.cancel();

    // Save session
    Storage.saveSpeakingSession({
      id: Utils.generateId(),
      sessionId: this.sessionId,
      part: this.currentPart,
      topic: document.getElementById('speakingTopic')?.value || 'General',
      messages: this.messages,
      bandEstimate: this.lastBandEstimate || 0,
      date: new Date().toISOString(),
    });

    this.sessionId = null;
    Utils.showToast('Session saved!', 'success');
    this.render(true);
  },
};
