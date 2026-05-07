/**
 * Reading Module - IELTS reading practice with auto-grading and AI explanations
 */
const Reading = {
  passage: null,
  answers: {},
  submitted: false,
  timer: null,
  highlightEnabled: false,
  activeTopic: null,
  allGroups: null,

  render: async function(force = false) {
    const container = document.getElementById('view-reading');
    if (this.isRendered && !force) return;
    this.isRendered = true;
    const history = Storage.getReadingHistory();
    container.innerHTML = `
      <div class="reading-container animate-fadeInUp">
        <div class="section-header">
          <h1>Reading Library</h1>
          <p>Choose a story or comic to improve your reading comprehension</p>
        </div>
        <div id="readingWorkspace"></div>
        <div id="libraryContainer"></div>
      </div>`;
    
    if (!this.allGroups) {
      try {
        const passages = await API.getAllReadingPassages();
        const groupsMap = {};
        
        passages.forEach(p => {
          if (!groupsMap[p.topic]) groupsMap[p.topic] = [];
          groupsMap[p.topic].push({
            id: p.id,
            title: p.title,
            topic: p.topic,
            level: p.difficulty,
            img: p.img || `https://picsum.photos/seed/comic${p.id}/300/400`
          });
        });
        
        this.allGroups = Object.keys(groupsMap).map(topic => ({
          topic: topic,
          comics: groupsMap[topic]
        }));
      } catch (err) {
        console.error("Failed to load library:", err);
        this.allGroups = [];
      }
    }
    
    this.renderLibrary();
  },
  
  setActiveTopic(topic) {
    this.activeTopic = topic;
    this.renderLibrary();
    window.scrollTo(0, 0);
  },
  
  renderLibrary() {
    const history = Storage.getReadingHistory();
    const lastRead = history.length > 0 ? history[0] : null;
    const container = document.getElementById('libraryContainer');
    if (!container) return;
    
    let html = '';
    
    // Top Level: Categories & Continue Reading
    if (!this.activeTopic) {
      // Continue Reading (up to 3 items)
      let recentReads = history.slice(0, 3);
      
      // MOCK DATA FOR DEMONSTRATION IF EMPTY
      if (recentReads.length === 0) {
        recentReads = [
          { id: '100', title: 'The Last Guardian', correct: 2, total: 5, date: new Date().toISOString() },
          { id: '105', title: 'Hidden Heart', correct: 4, total: 5, date: new Date(Date.now() - 86400000).toISOString() },
          { id: '112', title: 'Dark Shadow', correct: 1, total: 5, date: new Date(Date.now() - 172800000).toISOString() }
        ];
      }

      if (recentReads && recentReads.length > 0) {
        html += `
          <h2 style="font-size: var(--fs-lg); margin-bottom: var(--space-sm); color: var(--text-primary);">Continue Reading</h2>
          <div class="continue-carousel" style="display: flex; gap: var(--space-md); margin-bottom: var(--space-xl); overflow-x: auto; padding-bottom: var(--space-sm); scroll-snap-type: x mandatory;">
            ${recentReads.map(h => `
              <div class="continue-card" onclick="Reading.loadPassage('${h.id || ''}')" style="min-width: 300px; flex: 0 0 auto; margin-bottom: 0; scroll-snap-align: start;">
                <img src="https://picsum.photos/seed/comic${h.id || Math.floor(Math.random()*100)}/100/100" class="continue-cover" alt="Last read">
                <div class="continue-info" style="min-width: 0;">
                  <div class="continue-label">Recently Read</div>
                  <div class="continue-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${Utils.escapeHtml(h.title || 'Reading Practice')}</div>
                  <div class="continue-meta">Score: ${h.correct || 0}/${h.total || 0} · ${Utils.formatDate(h.date)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
      
      // Category Grid
      html += `
        <h2 style="font-size: var(--fs-lg); margin-bottom: var(--space-md); color: var(--text-primary);">Categories</h2>
        <div class="category-grid">
          ${this.allGroups.map(group => `
            <div class="category-card" onclick="Reading.setActiveTopic('${group.topic}')">
              <div class="category-title">${group.topic}</div>
              <div class="category-count">${group.comics.length} stories</div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      // Back Button when viewing a specific category
      html += `
        <div style="margin-bottom: var(--space-lg);">
          <button class="btn btn-ghost" onclick="Reading.setActiveTopic(null)">⬅️ All Categories</button>
        </div>
      `;
    }
    
    // Render Comic Grids
    const groupsToRender = this.activeTopic ? this.allGroups.filter(g => g.topic === this.activeTopic) : this.allGroups;
    
    html += groupsToRender.map(group => `
      <div class="topic-section" style="margin-bottom: var(--space-2xl);">
        <h2 style="font-size: var(--fs-xl); font-weight: 800; margin-bottom: var(--space-md); color: var(--text-primary); border-bottom: 2px solid var(--border-color); padding-bottom: var(--space-sm); display:flex; justify-content:space-between; align-items:flex-end;">
          ${group.topic}
          <span style="font-size: var(--fs-sm); font-weight: 700; color: var(--text-muted); background: var(--bg-tertiary); padding: 2px 10px; border-radius: var(--radius-xl);">${group.comics.length} Stories</span>
        </h2>
        <div class="comic-grid">
          ${group.comics.map(comic => `
            <div class="comic-card" onclick="Reading.loadPassage('${comic.id}')">
              <img src="${comic.img}" loading="lazy" alt="${comic.title}" class="comic-cover">
              <div class="comic-info">
                <div class="comic-title">${comic.title}</div>
                <div class="comic-meta">
                  <span style="color: var(--accent-secondary)">${comic.topic}</span>
                  <span style="color: var(--accent-success)">${comic.level}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
    
    container.innerHTML = html;
  },
  
  async loadPassage(id) {
    Utils.showLoading();
    try {
      this.passage = await API.getReadingPassage(id);
      this.answers = {};
      this.submitted = false;
      this.renderWorkspace();
      // Start timer
      if (this.timer) this.timer.pause();
      this.timer = new Timer(CONFIG.TIMER.READING,
        (r) => {
          const el = document.getElementById('readingTime');
          if (el) { el.textContent = Utils.formatTime(r); el.parentElement.classList.toggle('warning', r <= 60); }
        },
        () => Utils.showToast('Time is up!', 'warning')
      );
      this.timer.start();
    } catch (err) { Utils.showToast('Failed to load passage: ' + err.message, 'error'); }
    Utils.hideLoading();
  },

  renderWorkspace() {
    const p = this.passage;
    
    document.getElementById('libraryContainer').style.display = 'none';
    
    document.getElementById('readingWorkspace').innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-md)">
        <button class="btn btn-ghost" onclick="Reading.closePassage()">Back to Library</button>
      </div>
      <div class="reading-workspace">
        <div class="passage-panel">
          <div class="passage-header">
            <h3 style="font-size:var(--fs-base)">${Utils.escapeHtml(p.title)}</h3>
            <div class="btn-group">
              <button class="btn btn-sm btn-ghost" id="toggleHighlight">🖍️ Highlight</button>
            </div>
          </div>
          <div class="passage-body" id="passageBody">${this.renderPassageText(p.passage)}</div>
        </div>
        <div class="questions-panel">
          <div class="questions-header" style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:var(--fs-base)">Questions (${p.questions.length})</h3>
            <div style="display:flex; gap: var(--space-sm); align-items:center">
              <button class="btn btn-sm btn-ghost" id="pauseReading" title="Pause Timer">⏸️ Pause</button>
              <div class="timer-display" id="readingTimerDisplay" style="font-size:var(--fs-sm)">
                ⏱️ <span id="readingTime">20:00</span>
              </div>
            </div>
          </div>
          <div class="questions-body" id="questionsBody">
            ${p.questions.map((q, i) => this.renderQuestion(q, i)).join('')}
            <div style="margin-top:var(--space-lg); display:flex; gap: var(--space-sm);">
              <button class="btn btn-danger btn-lg" id="cancelReading" style="flex:1">⏹️ Cancel</button>
              <button class="btn btn-primary btn-lg" id="submitReadingAnswers" style="flex:3">📤 Submit Answers</button>
            </div>
          </div>
        </div>
      </div>`;
    document.getElementById('submitReadingAnswers').addEventListener('click', () => this.submitAnswers());
    document.getElementById('toggleHighlight')?.addEventListener('click', () => {
      this.highlightEnabled = !this.highlightEnabled;
      Utils.showToast(this.highlightEnabled ? 'Click words in passage to highlight' : 'Highlighting off', 'info');
    });
    // Word click handler
    document.getElementById('passageBody')?.addEventListener('click', (e) => {
      if (this.timer && !this.timer.isRunning()) return; // Don't allow clicking if paused
      if (e.target.classList.contains('word-clickable')) {
        const word = e.target.textContent.replace(/[^a-zA-Z'-]/g, '');
        if (this.highlightEnabled) { e.target.classList.toggle('highlight'); }
        else if (word.length > 2) {
          Utils.showModal(`📚 "${word}"`, '<p>Loading definition...</p>', [
            { text: 'Save to Vocabulary', class: 'btn-primary', onClick: () => {
              Storage.saveWord({ word, context: this.passage.title });
              Utils.showToast(`"${word}" saved to vocabulary!`, 'success');
            }}
          ]);
          API.defineWord(word, this.passage.title).then(def => {
            const body = document.getElementById('modalBody');
            if (body) body.innerHTML = `
              <p><strong>${def.partOfSpeech || ''}</strong> ${def.pronunciation || ''}</p>
              <p>${Utils.escapeHtml(def.definition || '')}</p>
              ${def.vietnameseMeaning ? `<p style="color:var(--accent); font-weight:600; margin-top:4px;">${Utils.escapeHtml(def.vietnameseMeaning)}</p>` : ''}
              <p style="color:var(--text-muted);font-size:var(--fs-xs);margin-top:var(--space-sm)">
                ${(def.examples || []).map(ex => `<em>"${Utils.escapeHtml(ex)}"</em>`).join('<br>')}
              </p>`;
          }).catch(() => {});
        }
      }
    });

    document.getElementById('pauseReading')?.addEventListener('click', (e) => {
      if (!this.timer) return;
      if (this.timer.isRunning()) {
        this.timer.pause();
        e.target.innerHTML = '▶️ Resume';
        document.getElementById('passageBody').style.opacity = '0.1'; // Hide passage while paused
        document.getElementById('questionsBody').style.opacity = '0.1';
      } else {
        this.timer.start();
        e.target.innerHTML = '⏸️ Pause';
        document.getElementById('passageBody').style.opacity = '1';
        document.getElementById('questionsBody').style.opacity = '1';
      }
    });

    document.getElementById('cancelReading')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to cancel this reading session? Your progress will be lost.')) {
        if (this.timer) this.timer.stop();
        this.passage = null;
        this.answers = {};
        document.getElementById('readingWorkspace').innerHTML = '';
        document.getElementById('libraryContainer').style.display = 'block';
      }
    });

    this.bindQuestionEvents();
  },

  closePassage() {
    this.passage = null;
    this.answers = {};
    this.submitted = false;
    if (this.timer) {
      this.timer.stop();
      this.timer = null;
    }
    document.getElementById('readingWorkspace').innerHTML = '';
    document.getElementById('libraryContainer').style.display = 'block';
  },

  renderPassageText(text) {
    return text.split('\n').map(para =>
      `<p>${para.split(/\s+/).map(w => `<span class="word-clickable">${Utils.escapeHtml(w)}</span>`).join(' ')}</p>`
    ).join('');
  },

  renderQuestion(q, index) {
    const num = index + 1;
    let inputHtml = '';
    if (q.type === 'true-false-not-given') {
      inputHtml = `<div class="tfng-options">
        ${['TRUE', 'FALSE', 'NOT GIVEN'].map(opt => `<button class="tfng-btn" data-qid="${q.id}" data-value="${opt}">${opt}</button>`).join('')}
      </div>`;
    } else if (q.type === 'multiple-choice' || q.type === 'matching-headings') {
      inputHtml = `<div class="question-options">${(q.options || []).map(opt => {
        const val = opt.replace(/^[A-Z]\)\s*/, '');
        return `<label class="option-label"><input type="radio" name="q_${q.id}" value="${Utils.escapeHtml(opt.charAt(0))}" data-qid="${q.id}"> ${Utils.escapeHtml(opt)}</label>`;
      }).join('')}</div>`;
    } else {
      inputHtml = `<input type="text" class="input completion-input" data-qid="${q.id}" placeholder="Type your answer">`;
    }
    return `<div class="question-item" id="qi_${q.id}">
      <div class="question-number">Question ${num}</div>
      <div class="question-text">${Utils.escapeHtml(q.question)}</div>
      ${inputHtml}
      <div id="explain_${q.id}"></div>
    </div>`;
  },

  bindQuestionEvents() {
    document.querySelectorAll('.tfng-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qid = btn.dataset.qid;
        document.querySelectorAll(`.tfng-btn[data-qid="${qid}"]`).forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.answers[qid] = btn.dataset.value;
      });
    });
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => { this.answers[radio.dataset.qid] = radio.value; });
    });
    document.querySelectorAll('.completion-input').forEach(input => {
      input.addEventListener('input', () => { this.answers[input.dataset.qid] = input.value.trim(); });
    });
  },

  submitAnswers() {
    if (this.submitted) return;
    this.submitted = true;
    if (this.timer) this.timer.pause();
    let correct = 0;
    const total = this.passage.questions.length;

    this.passage.questions.forEach(q => {
      const userAnswer = (this.answers[q.id] || '').toUpperCase().trim();
      const correctAnswer = (q.answer || '').toUpperCase().trim();
      const isCorrect = userAnswer === correctAnswer || (q.type === 'sentence-completion' && correctAnswer.includes(userAnswer) && userAnswer.length > 1);
      if (isCorrect) correct++;

      const item = document.getElementById(`qi_${q.id}`);
      if (item) {
        item.classList.add(isCorrect ? 'correct' : 'incorrect');
        if (!isCorrect) {
          item.insertAdjacentHTML('beforeend', `
            <div style="font-size:var(--fs-xs);margin-top:var(--space-sm);">
              <span style="color:var(--accent-success)">Correct: ${Utils.escapeHtml(q.answer)}</span>
              <button class="btn btn-sm btn-ghost explain-btn" data-qid="${q.id}">💡 Explain</button>
            </div>`);
        }
      }
      // Style the options/buttons
      if (q.type === 'true-false-not-given') {
        document.querySelectorAll(`.tfng-btn[data-qid="${q.id}"]`).forEach(btn => {
          if (btn.dataset.value === correctAnswer) btn.classList.add('correct-answer');
          else if (btn.classList.contains('selected') && !isCorrect) btn.classList.add('wrong-answer');
        });
      }
    });

    // Score display
    const score = Math.round((correct / total) * 9 * 2) / 2;
    document.getElementById('readingWorkspace').insertAdjacentHTML('afterbegin', `
      <div class="reading-score animate-bounceIn">
        <div class="score-number">${correct}/${total}</div>
        <div style="flex:1"><div style="font-weight:600">Estimated Band: ${score}</div>
        <div style="font-size:var(--fs-xs);color:var(--text-muted)">${correct >= total * 0.7 ? 'Great job!' : 'Keep practicing!'}</div></div>
      </div>`);

    Storage.saveReadingAttempt({ id: Utils.generateId(), title: this.passage.title, correct, total, score, date: new Date().toISOString() });
    document.getElementById('submitReadingAnswers').disabled = true;

    // Explain buttons
    document.querySelectorAll('.explain-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const qid = btn.dataset.qid;
        const q = this.passage.questions.find(x => x.id === qid);
        const explainDiv = document.getElementById(`explain_${qid}`);
        if (explainDiv.innerHTML) { explainDiv.innerHTML = ''; return; }
        btn.disabled = true; btn.textContent = '⏳ Loading...';
        try {
          const result = await API.explainReading(this.passage.passage.substring(0, 1000), q.question, this.answers[qid] || '', q.answer);
          explainDiv.innerHTML = `<div class="explanation-panel">${result.explanation}</div>`;
        } catch (err) { explainDiv.innerHTML = `<div class="explanation-panel">${Utils.escapeHtml(q.explanation || 'No explanation available.')}</div>`; }
        btn.disabled = false; btn.textContent = '💡 Explain';
      });
    });
  },
};
