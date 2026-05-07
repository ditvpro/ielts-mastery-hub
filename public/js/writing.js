/**
 * Writing Module - IELTS writing practice with AI grading
 */
const Writing = {
  currentTask: 'task2',
  currentTopic: null,
  timer: null,
  gradingResult: null,

  render(force = false) {
    const container = document.getElementById('view-writing');
    if (this.isRendered && !force) return;
    this.isRendered = true;
    const history = Storage.getWritingHistory();
    container.innerHTML = `
      <div class="writing-container animate-fadeInUp">
        <div class="section-header">
          <h1>Writing Practice</h1>
          <p>Practice Task 1 & Task 2 essays with AI grading</p>
        </div>

        <!-- Task Tabs -->
        <div class="tab-nav">
          <button class="tab-btn ${this.currentTask === 'task1' ? 'active' : ''}" data-task="task1">Task 1 (Report)</button>
          <button class="tab-btn ${this.currentTask === 'task2' ? 'active' : ''}" data-task="task2">Task 2 (Essay)</button>
        </div>

        <!-- Topic Controls -->
        <div class="card mb-lg">
          <div class="btn-group">
            <button class="btn btn-primary" id="generateTopic">Random Topic</button>
            <button class="btn btn-secondary" id="browseTopic">Browse Topics</button>
          </div>
        </div>

        <!-- Workspace -->
        <div class="writing-workspace" id="writingWorkspace" style="display: none;">
          <div class="topic-panel">
            <h3 style="margin-bottom: var(--space-md);">Topic</h3>
            <div class="topic-content" id="topicContent"></div>
            <div class="topic-meta">
              <span class="badge badge-info" id="taskTypeBadge"></span>
              <span class="badge badge-warning" id="wordLimitBadge"></span>
            </div>
          </div>
          <div class="editor-panel">
            <div class="editor-toolbar">
              <div class="word-counter" id="wordCounter">Words: 0</div>
              <div style="display:flex; gap: var(--space-sm); align-items:center">
                <button class="btn btn-sm btn-ghost" id="pauseWriting" title="Pause">Pause</button>
                <div class="timer-display" id="writingTimerDisplay">
                  <span id="writingTimeText">--:--</span>
                </div>
              </div>
            </div>
            <textarea class="essay-textarea" id="essayText" placeholder="Start writing your essay here..."></textarea>
            <div class="editor-footer" style="display:flex; justify-content:space-between; width:100%">
              <div class="btn-group">
                <button class="btn btn-danger btn-sm" id="cancelWriting">Cancel</button>
                <button class="btn btn-ghost btn-sm" id="clearEssay">Clear</button>
              </div>
              <button class="btn btn-primary" id="submitEssay">Submit for Grading</button>
            </div>
          </div>
        </div>

        <!-- Grading Result -->
        <div id="gradingResultContainer"></div>

        <!-- History -->
        ${history.length ? `
        <div class="card mt-lg">
          <div class="card-header"><h3 class="card-title">Essay History</h3></div>
          <div class="writing-history">
            ${history.slice(0, 8).map(h => `
              <div class="history-item">
                <div>
                  <div style="font-weight: 600; font-size: var(--fs-sm);">${Utils.escapeHtml((h.topic || '').substring(0, 60))}...</div>
                  <div style="font-size: var(--fs-xs); color: var(--text-muted);">${Utils.formatDate(h.date)} · Task ${h.taskType || '2'} · ${h.wordCount || 0} words</div>
                </div>
                <span class="history-score">${h.bandScore || '—'}</span>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
      </div>
    `;
    this.bindEvents();
  },

  bindEvents() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentTask = btn.dataset.task;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    document.getElementById('generateTopic')?.addEventListener('click', () => this.generateTopic());
    document.getElementById('browseTopic')?.addEventListener('click', () => this.browseTopic());
    document.getElementById('submitEssay')?.addEventListener('click', () => this.submitEssay());
    document.getElementById('clearEssay')?.addEventListener('click', () => {
      document.getElementById('essayText').value = '';
      this.updateWordCount();
    });
    document.getElementById('essayText')?.addEventListener('input', Utils.debounce(() => this.updateWordCount(), 100));

    document.getElementById('pauseWriting')?.addEventListener('click', (e) => {
      if (!this.timer) return;
      if (this.timer.isRunning()) {
        this.timer.pause();
        e.target.innerHTML = '▶️ Resume';
        document.getElementById('essayText').disabled = true;
      } else {
        this.timer.start();
        e.target.innerHTML = '⏸️ Pause';
        document.getElementById('essayText').disabled = false;
        document.getElementById('essayText').focus();
      }
    });

    document.getElementById('cancelWriting')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to cancel? Your progress will be lost.')) {
        if (this.timer) this.timer.stop();
        this.currentTopic = null;
        this.gradingResult = null;
        document.getElementById('essayText').value = '';
        document.getElementById('essayText').disabled = false;
        document.getElementById('writingWorkspace').style.display = 'none';
        document.getElementById('gradingResultContainer').innerHTML = '';
        document.getElementById('pauseWriting').innerHTML = 'Pause';
      }
    });
  },

  async generateTopic() {
    Utils.showLoading('Generating topic...');
    try {
      const taskType = this.currentTask === 'task1' ? '1' : '2';
      const result = await API.generateWritingTopic(taskType);
      this.setTopic(result.topic || result, taskType);
    } catch (err) {
      Utils.showToast('Failed to generate topic: ' + err.message, 'error');
    }
    Utils.hideLoading();
  },

  async browseTopic() {
    try {
      const topics = await API.getWritingTopics();
      const taskType = this.currentTask;
      const filtered = topics.filter(t => t.taskType === taskType);
      if (!filtered.length) { Utils.showToast('No topics found', 'warning'); return; }

      const listHtml = filtered.map((t, i) => `
        <div class="session-item" style="cursor:pointer" data-idx="${i}">
          <div style="font-size: var(--fs-sm);">${Utils.escapeHtml(t.topic.substring(0, 100))}...</div>
          <span class="badge badge-info">${t.category || ''}</span>
        </div>
      `).join('');

      Utils.showModal('Select a Topic', `<div class="session-list">${listHtml}</div>`, []);

      setTimeout(() => {
        document.querySelectorAll('#modalBody .session-item').forEach(item => {
          item.addEventListener('click', () => {
            const idx = parseInt(item.dataset.idx);
            const selected = filtered[idx];
            this.setTopic(selected.topic, taskType === 'task1' ? '1' : '2');
            Utils.closeModal();
          });
        });
      }, 100);
    } catch (err) {
      Utils.showToast('Failed to load topics: ' + err.message, 'error');
    }
  },

  setTopic(topic, taskType) {
    this.currentTopic = topic;
    const workspace = document.getElementById('writingWorkspace');
    workspace.style.display = 'grid';
    document.getElementById('topicContent').textContent = typeof topic === 'string' ? topic : topic.topic || JSON.stringify(topic);
    document.getElementById('taskTypeBadge').textContent = `Task ${taskType}`;
    const wordLimit = taskType === '1' ? 150 : 250;
    document.getElementById('wordLimitBadge').textContent = `Min ${wordLimit} words`;

    // Start timer
    const duration = taskType === '1' ? CONFIG.TIMER.WRITING_TASK1 : CONFIG.TIMER.WRITING_TASK2;
    if (this.timer) this.timer.pause();
    this.timer = new Timer(duration,
      (remaining) => {
        const el = document.getElementById('writingTimeText');
        const display = document.getElementById('writingTimerDisplay');
        if (el) el.textContent = Utils.formatTime(remaining);
        if (display) display.classList.toggle('warning', remaining <= 60);
      },
      () => Utils.showToast('Time is up! Submit your essay.', 'warning')
    );
    this.timer.start();
    document.getElementById('essayText').focus();
  },

  updateWordCount() {
    const text = document.getElementById('essayText')?.value || '';
    const count = Utils.calculateWordCount(text);
    const counter = document.getElementById('wordCounter');
    if (!counter) return;
    const taskType = this.currentTask === 'task1' ? '1' : '2';
    const min = taskType === '1' ? 150 : 250;
    counter.textContent = `Words: ${count}`;
    counter.className = 'word-counter ' + (count >= min ? 'sufficient' : count >= min * 0.7 ? 'warning' : 'insufficient');
  },

  async submitEssay() {
    const essay = document.getElementById('essayText')?.value?.trim();
    if (!essay || essay.length < 30) { Utils.showToast('Please write more before submitting.', 'warning'); return; }

    if (this.timer) this.timer.pause();
    Utils.showLoading('AI is grading your essay...');

    try {
      const text = essay;
      const taskType = this.currentTask === 'task1' ? '1' : '2';
      const topicText = typeof this.currentTopic === 'string' ? this.currentTopic : this.currentTopic?.topic || '';
      const result = await API.gradeWriting(taskType, essay, topicText);
      this.gradingResult = result;

      // Save
      Storage.saveWritingEssay({
        id: Utils.generateId(),
        task: this.currentTask,
        topic: this.currentTopic?.topic || 'Custom Topic',
        essay: text,
        score: result.bandScore,
        feedback: result,
        date: new Date().toISOString()
      });

      this.renderGradingResult(result);
      
      // Disable editing after submit
      const essayEl = document.getElementById('essayText');
      if (essayEl) essayEl.disabled = true;
      const submitBtn = document.getElementById('submitEssay');
      if (submitBtn) submitBtn.style.display = 'none';
      const pauseBtn = document.getElementById('pauseWriting');
      if (pauseBtn) pauseBtn.style.display = 'none';

      // Show celebration modal
      const modalContent = `
        <div style="text-align: center; padding: var(--space-xl) 0;">
          <div style="font-size: 5rem; margin-bottom: var(--space-sm); animation: bounceIn 0.8s ease-out;">${result.bandScore >= 7.0 ? '🌟' : result.bandScore >= 6.0 ? '🎉' : '📈'}</div>
          <h2 style="margin-bottom: var(--space-sm); color: var(--text-primary); font-size: var(--fs-2xl);">Chấm điểm hoàn tất!</h2>
          <div style="font-size: 3.5rem; font-weight: 800; color: var(--accent); margin-bottom: var(--space-md);">
            Band ${result.bandScore || 0}
          </div>
          <p style="color: var(--text-secondary); margin-bottom: var(--space-lg); font-size: var(--fs-md); max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.6;">
            ${Utils.escapeHtml(result.overallComment || 'Good effort! Check out the detailed analysis below to see how you can improve.')}
          </p>
        </div>
      `;
      Utils.showModal('Kết quả phân tích Writing', modalContent, [
        { 
          text: 'Xem chi tiết phân tích', 
          class: 'btn-primary', 
          onClick: () => {
            Utils.closeModal();
            setTimeout(() => {
              document.getElementById('gradingResultContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
          } 
        }
      ]);

      Utils.showToast(`Essay graded: Band ${result.bandScore}`, 'success');
    } catch (err) {
      Utils.showToast('Grading failed: ' + err.message, 'error');
    }
    Utils.hideLoading();
  },

  renderGradingResult(result) {
    const container = document.getElementById('gradingResultContainer');
    const criteria = result.criteria || {};
    const renderCriteria = (label, data) => {
      if (!data) return '';
      return `<div class="criteria-item">
        <div class="criteria-label"><span>${label}</span><span class="criteria-score">${data.score || 0}</span></div>
        ${Utils.createProgressBar(data.score || 0)}
        <div class="criteria-feedback">${Utils.escapeHtml(data.feedback || '')}</div>
      </div>`;
    };

    container.innerHTML = `
      <div class="grading-result mt-lg">
        <div class="grading-header">
          <div class="overall-band">
            <div class="band-number">${result.bandScore || 0}</div>
            <div class="band-label">Overall Band</div>
          </div>
          <div class="overall-comment">${Utils.escapeHtml(result.overallComment || '')}</div>
        </div>
        <div class="criteria-breakdown">
          ${renderCriteria('Task Achievement', criteria.taskAchievement)}
          ${renderCriteria('Coherence & Cohesion', criteria.coherenceCohesion)}
          ${renderCriteria('Lexical Resource', criteria.lexicalResource)}
          ${renderCriteria('Grammar Range', criteria.grammaticalRange)}
        </div>
        ${(result.corrections || []).length ? `
        <div class="corrections-list">
          <h3>✏️ Corrections</h3>
          ${result.corrections.map(c => `
            <div class="correction-card">
              <div class="original">${Utils.escapeHtml(c.original)}</div>
              <div class="corrected">→ ${Utils.escapeHtml(c.corrected)}</div>
              <div class="correction-type">${c.type || ''}</div>
            </div>
          `).join('')}
        </div>` : ''}
        ${(result.vocabularyUpgrades || []).length ? `
        <div class="vocab-upgrades">
          <h3 style="margin-bottom: var(--space-md);">📚 Vocabulary Upgrades</h3>
          ${result.vocabularyUpgrades.map(v => `
            <div class="vocab-upgrade-item">
              <span class="vocab-original">${Utils.escapeHtml(v.original)}</span>
              <span class="vocab-arrow">→</span>
              <span class="vocab-upgrade">${Utils.escapeHtml(v.upgrade)}</span>
            </div>
          `).join('')}
        </div>` : ''}
      </div>
    `;
  },
};
