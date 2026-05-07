/**
 * Vocabulary Module - Word management with flashcards and discovery
 */
const Vocabulary = {
  currentTab: 'myWords',
  searchQuery: '',
  sortBy: 'date',
  flashcardIndex: 0,
  flashcardRevealed: false,
  discoverData: null,

  render(force = false) {
    const container = document.getElementById('view-vocabulary');
    if (this.isRendered && !force) {
      this.renderContent();
      return;
    }
    this.isRendered = true;
    container.innerHTML = `
      <div class="speaking-container animate-fadeInUp">
        <div class="section-header">
          <h1>📚 Vocabulary Builder</h1>
          <p>Build and review your IELTS vocabulary</p>
        </div>
        <div class="tab-nav">
          <button class="tab-btn ${this.currentTab === 'myWords' ? 'active' : ''}" data-tab="myWords">My Words (${Storage.getVocabulary().length})</button>
          <button class="tab-btn ${this.currentTab === 'discover' ? 'active' : ''}" data-tab="discover">Discover</button>
          <button class="tab-btn ${this.currentTab === 'flashcards' ? 'active' : ''}" data-tab="flashcards">Flashcards</button>
        </div>
        <div id="vocabContent"></div>
      </div>`;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentTab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderTab();
      });
    });
    this.renderTab();
  },

  renderTab() {
    const content = document.getElementById('vocabContent');
    if (this.currentTab === 'myWords') this.renderMyWords(content);
    else if (this.currentTab === 'discover') this.renderDiscover(content);
    else this.renderFlashcards(content);
  },

  renderMyWords(container) {
    let words = Storage.getVocabulary();
    // Sort
    if (this.sortBy === 'alpha') words.sort((a, b) => a.word.localeCompare(b.word));
    else if (this.sortBy === 'reviews') words.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    // Filter
    if (this.searchQuery) words = words.filter(w => w.word.toLowerCase().includes(this.searchQuery.toLowerCase()));

    container.innerHTML = `
      <div class="card mb-md">
        <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap;align-items:center;">
          <input type="text" class="input" id="vocabSearch" placeholder="🔍 Search words..." value="${Utils.escapeHtml(this.searchQuery)}" style="flex:1;min-width:200px;">
          <select class="select" id="vocabSort" style="width:auto;min-width:140px;">
            <option value="date" ${this.sortBy === 'date' ? 'selected' : ''}>Recent first</option>
            <option value="alpha" ${this.sortBy === 'alpha' ? 'selected' : ''}>Alphabetical</option>
            <option value="reviews" ${this.sortBy === 'reviews' ? 'selected' : ''}>Most reviewed</option>
          </select>
          <button class="btn btn-ghost btn-sm" id="exportVocab">📤 Export</button>
        </div>
      </div>
      ${!words.length ? '<div class="empty-state"><div class="empty-icon">📚</div><p>No words saved yet. Click words while reading or use Discover to add words.</p></div>' : `
      <div class="accordion">
        ${words.map(w => `
          <div class="accordion-item" data-word="${Utils.escapeHtml(w.word)}">
            <button class="accordion-header">
              <div style="display:flex;align-items:center;gap:var(--space-sm)">
                <strong>${Utils.escapeHtml(w.word)}</strong>
                ${w.bandLevel ? `<span class="badge badge-info" style="font-size:10px">${w.bandLevel}</span>` : ''}
                <span style="font-size:var(--fs-xs);color:var(--text-muted)">reviewed ${w.reviewCount || 0}x</span>
              </div>
              <span class="accordion-arrow">▼</span>
            </button>
            <div class="accordion-body">
              <p style="margin-bottom:var(--space-sm)">
                <strong>${Utils.escapeHtml(w.definition || 'No definition')}</strong>
                ${w.vietnameseMeaning ? `<br><span style="color:var(--text-muted); font-size:var(--fs-sm)">(${Utils.escapeHtml(w.vietnameseMeaning)})</span>` : ''}
              </p>
              ${w.example ? `<p style="font-style:italic;color:var(--text-muted);font-size:var(--fs-xs)">"${Utils.escapeHtml(w.example)}"</p>` : ''}
              ${(w.synonyms || []).length ? `<p style="font-size:var(--fs-xs);margin-top:var(--space-sm)">Synonyms: ${w.synonyms.map(s => `<span class="badge badge-primary" style="margin:2px">${Utils.escapeHtml(s)}</span>`).join('')}</p>` : ''}
              <div style="margin-top:var(--space-sm)">
                <button class="btn btn-sm btn-ghost" onclick="Vocabulary.lookupWord('${Utils.escapeHtml(w.word)}')">🔍 AI Define</button>
                <button class="btn btn-sm btn-danger" onclick="Vocabulary.removeWord('${Utils.escapeHtml(w.word)}')">🗑️ Remove</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>`}`;

    document.getElementById('vocabSearch')?.addEventListener('input', Utils.debounce((e) => {
      this.searchQuery = e.target.value;
      this.renderMyWords(container);
    }, 200));
    document.getElementById('vocabSort')?.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.renderMyWords(container);
    });
    document.getElementById('exportVocab')?.addEventListener('click', () => this.exportVocab());
    // Accordion toggle
    container.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => header.parentElement.classList.toggle('active'));
    });
  },

  async renderDiscover(container) {
    container.innerHTML = '<div class="loading-content" style="padding:var(--space-2xl)"><div class="loading-spinner"></div></div>';
    try {
      if (!this.discoverData) this.discoverData = await API.getVocabularyData();
      const data = this.discoverData;
      container.innerHTML = `
        <div class="card mb-md" style="text-align:center;padding:var(--space-xl)">
          <div style="font-size:var(--fs-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Word of the Day</div>
          <div style="font-size:var(--fs-xl);font-weight:700;color:var(--accent);margin:var(--space-sm) 0">${this.getWordOfDay(data)?.word || 'sustainable'}</div>
          <div style="font-size:var(--fs-sm);color:var(--text-secondary)">${this.getWordOfDay(data)?.definition || ''}</div>
        </div>
        ${data.map(topic => `
          <div class="card mb-md">
            <div class="card-header"><h3 class="card-title">${Utils.escapeHtml(topic.topic)}</h3><span class="badge badge-info">${topic.words.length} words</span></div>
            <div style="display:flex;flex-wrap:wrap;gap:var(--space-sm);">
              ${topic.words.map(w => {
                const saved = Storage.getVocabulary().some(v => v.word.toLowerCase() === w.word.toLowerCase());
                return `<button class="btn btn-sm ${saved ? 'btn-success' : 'btn-secondary'}" onclick="Vocabulary.addDiscoverWord(${JSON.stringify(w).replace(/"/g, '&quot;')})" ${saved ? 'disabled' : ''}>
                  ${saved ? '✅' : '+'} ${Utils.escapeHtml(w.word)}
                </button>`;
              }).join('')}
            </div>
          </div>
        `).join('')}`;
    } catch (err) {
      container.innerHTML = `<div class="error-state">Failed to load vocabulary data: ${err.message}</div>`;
    }
  },

  renderFlashcards(container) {
    const words = Storage.getVocabulary();
    if (!words.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🃏</div><p>Add words to your vocabulary first to use flashcards.</p></div>';
      return;
    }
    if (this.flashcardIndex >= words.length) this.flashcardIndex = 0;
    const w = words[this.flashcardIndex];
    container.innerHTML = `
      <div style="text-align:center;margin-bottom:var(--space-md);font-size:var(--fs-sm);color:var(--text-muted)">
        Card ${this.flashcardIndex + 1} of ${words.length}
      </div>
      <div class="card" style="min-height:250px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;cursor:pointer;padding:var(--space-2xl)" id="flashcard">
        <div style="font-size:var(--fs-2xl);font-weight:700;margin-bottom:var(--space-sm);display:flex;align-items:center;gap:10px;justify-content:center;">
          ${Utils.escapeHtml(w.word)}
          <button class="btn btn-ghost btn-sm" onclick="Vocabulary.speakWord('${w.word.replace(/'/g, "\\'")}', event)" style="padding: 0 5px; color: var(--accent);" title="Listen">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          </button>
        </div>
        ${this.flashcardRevealed && w.pronunciation ? `<div style="font-family: monospace; color: var(--accent); margin-bottom: var(--space-sm); font-size: 1.1rem;">${Utils.escapeHtml(w.pronunciation)} <span style="color:var(--text-muted);font-size:var(--fs-xs)">${Utils.escapeHtml(w.partOfSpeech || '')}</span></div>` : ''}
        
        ${this.flashcardRevealed ? `
          <div style="font-size:var(--fs-base);color:var(--text-secondary);margin-bottom:var(--space-md)">
            ${Utils.escapeHtml(w.definition || '')}
            ${w.vietnameseMeaning ? `<br><span style="color:var(--text-muted); font-size:var(--fs-sm)">(${Utils.escapeHtml(w.vietnameseMeaning)})</span>` : ''}
          </div>
          ${w.contextExamples && w.contextExamples.length ? `
            <div style="text-align:left; width: 100%; border-top: 1px dashed var(--border-color); padding-top: var(--space-md); margin-top: var(--space-md);">
              <div style="font-size:var(--fs-sm); font-weight: 600; color:var(--text-secondary); margin-bottom: var(--space-sm);">Ngữ cảnh thông dụng (Contexts):</div>
              ${w.contextExamples.map(c => `
                <div style="margin-bottom: var(--space-sm); font-size:var(--fs-sm);">
                  <span class="badge badge-secondary" style="font-size: 10px;">${Utils.escapeHtml(c.context || '')}</span>
                  <div style="margin-top: 4px; color: var(--text-primary); font-style: italic; display: flex; gap: 8px;">
                    <div>"${Utils.escapeHtml(c.sentence || '').replace(/&lt;b&gt;/g, '<b style="color:var(--accent);">').replace(/&lt;\/b&gt;/g, '</b>')}"</div>
                    <button class="btn btn-ghost btn-sm" onclick="Vocabulary.speakWord('${(c.sentence || '').replace(/'/g, "\\'").replace(/<\/?b>/g, '')}', event)" style="padding: 0; line-height: 1; color: var(--accent-secondary);" title="Listen to sentence">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                    </button>
                  </div>
                  <div style="color: var(--text-muted); font-size: 0.9em; margin-top: 2px;">(${Utils.escapeHtml(c.translation || '').replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>')})</div>
                </div>
              `).join('')}
            </div>
          ` : (w.example ? `<div style="font-size:var(--fs-sm);color:var(--text-muted);font-style:italic">"${Utils.escapeHtml(w.example)}"</div>` : '')}
        ` : `<div style="font-size:var(--fs-sm);color:var(--text-muted)">Click to reveal definition</div>`}
      </div>
      <div class="btn-group mt-lg" style="justify-content:center">
        <button class="btn btn-success" id="fcKnow">Know it</button>
        <button class="btn btn-warning" id="fcReview">Review later</button>
        <button class="btn btn-ghost" id="fcSkip">Skip</button>
      </div>`;

    document.getElementById('flashcard').addEventListener('click', () => {
      if (!this.flashcardRevealed && !w.vietnameseMeaning) {
        // Just-in-time migration for legacy words
        this.flashcardRevealed = true;
        w.vietnameseMeaning = "⏳ Đang tải bản dịch...";
        w.pronunciation = "...";
        this.renderFlashcards(container);
        
        API.defineWord(w.word).then(def => {
          Storage.updateWord(w.word, { 
            definition: def.definition, 
            synonyms: def.synonyms, 
            example: def.examples?.[0], 
            bandLevel: def.bandLevel,
            vietnameseMeaning: def.vietnameseMeaning,
            pronunciation: def.pronunciation,
            partOfSpeech: def.partOfSpeech,
            contextExamples: def.contextExamples
          });
          this.renderFlashcards(container); // Re-render with new data
        }).catch(() => {
          Utils.showToast('Failed to auto-update word', 'error');
        });
      } else {
        this.flashcardRevealed = !this.flashcardRevealed;
        this.renderFlashcards(container);
      }
    });
    document.getElementById('fcKnow')?.addEventListener('click', () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      Storage.updateWord(w.word, { known: true, reviewCount: (w.reviewCount || 0) + 1, lastReviewed: new Date().toISOString() });
      this.flashcardIndex++; this.flashcardRevealed = false;
      this.renderFlashcards(container);
    });
    document.getElementById('fcReview')?.addEventListener('click', () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      Storage.updateWord(w.word, { known: false, reviewCount: (w.reviewCount || 0) + 1, lastReviewed: new Date().toISOString() });
      this.flashcardIndex++; this.flashcardRevealed = false;
      this.renderFlashcards(container);
    });
    document.getElementById('fcSkip')?.addEventListener('click', () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      this.flashcardIndex++; this.flashcardRevealed = false;
      this.renderFlashcards(container);
    });
  },

  speakWord(word, e) {
    if (e) e.stopPropagation();
    if (!('speechSynthesis' in window)) return;
    
    // Cancel any currently playing speech before starting a new one
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(word);
    
    const voices = window.speechSynthesis.getVoices();
    // Try to find the default Google female voice (often used in Google Translate)
    let voice = voices.find(v => v.name === 'Google US English' || v.name === 'Google UK English Female');
    
    // Fallback to other known female voices if Google voices aren't available (e.g. Safari)
    if (!voice) {
      voice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Zira')));
    }
    
    if (voice) {
      utterance.voice = voice;
    } else {
      utterance.lang = 'en-US';
    }
    
    window.speechSynthesis.speak(utterance);
  },

  getWordOfDay(data) {
    const allWords = data.flatMap(t => t.words);
    const dayIndex = Math.floor(Date.now() / 86400000) % allWords.length;
    return allWords[dayIndex];
  },

  addDiscoverWord(wordData) {
    Storage.saveWord(wordData);
    Utils.showToast(`"${wordData.word}" added to your vocabulary!`, 'success');
    this.renderTab();
  },

  async lookupWord(word) {
    Utils.showLoading('Looking up definition...');
    try {
      const def = await API.defineWord(word);
      Storage.updateWord(word, { 
        definition: def.definition, 
        synonyms: def.synonyms, 
        example: def.examples?.[0], 
        bandLevel: def.bandLevel,
        vietnameseMeaning: def.vietnameseMeaning,
        pronunciation: def.pronunciation,
        partOfSpeech: def.partOfSpeech,
        contextExamples: def.contextExamples
      });
      Utils.showToast('Definition updated!', 'success');
      this.renderTab();
    } catch (err) { Utils.showToast('Failed: ' + err.message, 'error'); }
    Utils.hideLoading();
  },

  removeWord(word) {
    Storage.removeWord(word);
    Utils.showToast(`"${word}" removed`, 'info');
    this.renderTab();
  },

  exportVocab() {
    const words = Storage.getVocabulary();
    const text = words.map(w => `${w.word}\t${w.definition || ''}\t${(w.synonyms || []).join(', ')}`).join('\n');
    const blob = new Blob([`Word\tDefinition\tSynonyms\n${text}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ielts-vocabulary.txt'; a.click();
    URL.revokeObjectURL(url);
    Utils.showToast('Vocabulary exported!', 'success');
  },
};
