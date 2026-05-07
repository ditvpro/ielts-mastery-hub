/**
 * Storage manager for localStorage persistence
 */
class Storage {
  static save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error('Storage save error:', e); }
  }
  static load(key, fallback = null) {
    try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; } catch (e) { return fallback; }
  }
  static remove(key) { localStorage.removeItem(key); }

  // Profile
  static getProfile() { return this.load(CONFIG.STORAGE_KEYS.PROFILE, null); }
  static saveProfile(profile) { this.save(CONFIG.STORAGE_KEYS.PROFILE, profile); }
  
  // Settings
  static getPreferredVoice() { return this.load('ielts_preferred_voice', null); }
  static setPreferredVoice(voiceURI) { this.save('ielts_preferred_voice', voiceURI); }

  // Speaking
  static getSpeakingHistory() { return this.load(CONFIG.STORAGE_KEYS.SPEAKING_HISTORY, []); }
  static saveSpeakingSession(session) {
    const history = this.getSpeakingHistory();
    history.unshift(session);
    if (history.length > 50) history.pop();
    this.save(CONFIG.STORAGE_KEYS.SPEAKING_HISTORY, history);
    this.logPractice('speaking');
  }

  // Writing
  static getWritingHistory() { return this.load(CONFIG.STORAGE_KEYS.WRITING_HISTORY, []); }
  static saveWritingEssay(essay) {
    const history = this.getWritingHistory();
    history.unshift(essay);
    if (history.length > 50) history.pop();
    this.save(CONFIG.STORAGE_KEYS.WRITING_HISTORY, history);
    this.logPractice('writing');
  }

  // Reading
  static getReadingHistory() { return this.load(CONFIG.STORAGE_KEYS.READING_HISTORY, []); }
  static saveReadingAttempt(attempt) {
    const history = this.getReadingHistory();
    history.unshift(attempt);
    if (history.length > 50) history.pop();
    this.save(CONFIG.STORAGE_KEYS.READING_HISTORY, history);
    this.logPractice('reading');
  }

  // Listening
  static getListeningHistory() { return this.load(CONFIG.STORAGE_KEYS.LISTENING_HISTORY, []); }
  static saveListeningAttempt(attempt) {
    const history = this.getListeningHistory();
    history.unshift(attempt);
    if (history.length > 50) history.pop();
    this.save(CONFIG.STORAGE_KEYS.LISTENING_HISTORY, history);
    this.logPractice('listening');
  }

  // Vocabulary
  static getVocabulary() { return this.load(CONFIG.STORAGE_KEYS.VOCABULARY, []); }
  static saveWord(wordData) {
    const vocab = this.getVocabulary();
    const exists = vocab.find(w => w.word.toLowerCase() === wordData.word.toLowerCase());
    if (exists) { exists.reviewCount = (exists.reviewCount || 0) + 1; exists.lastReviewed = new Date().toISOString(); }
    else { vocab.unshift({ ...wordData, addedAt: new Date().toISOString(), reviewCount: 0, known: false }); }
    this.save(CONFIG.STORAGE_KEYS.VOCABULARY, vocab);
  }
  static updateWord(word, updates) {
    const vocab = this.getVocabulary();
    const item = vocab.find(w => w.word.toLowerCase() === word.toLowerCase());
    if (item) Object.assign(item, updates);
    this.save(CONFIG.STORAGE_KEYS.VOCABULARY, vocab);
  }
  static removeWord(word) {
    const vocab = this.getVocabulary().filter(w => w.word.toLowerCase() !== word.toLowerCase());
    this.save(CONFIG.STORAGE_KEYS.VOCABULARY, vocab);
  }

  // Practice log
  static logPractice(skill) {
    const log = this.load(CONFIG.STORAGE_KEYS.PRACTICE_LOG, []);
    log.push({ skill, date: new Date().toISOString() });
    if (log.length > 500) log.splice(0, log.length - 500);
    this.save(CONFIG.STORAGE_KEYS.PRACTICE_LOG, log);
  }

  // Stats
  static getStats() {
    const speaking = this.getSpeakingHistory();
    const writing = this.getWritingHistory();
    const reading = this.getReadingHistory();
    const listening = this.getListeningHistory();
    const vocab = this.getVocabulary();
    const log = this.load(CONFIG.STORAGE_KEYS.PRACTICE_LOG, []);

    const recentSpeaking = speaking.slice(0, 5).map(s => s.bandEstimate || 0).filter(b => b > 0);
    const recentWriting = writing.slice(0, 5).map(s => s.bandScore || 0).filter(b => b > 0);
    const recentReading = reading.slice(0, 5).map(s => s.score || 0).filter(b => b > 0);
    const recentListening = listening.slice(0, 5).map(s => s.score || 0).filter(b => b > 0);

    return {
      totalSessions: speaking.length + writing.length + reading.length + listening.length,
      speakingAvg: recentSpeaking.length ? Utils.calculateBandAverage(recentSpeaking) : 0,
      writingAvg: recentWriting.length ? Utils.calculateBandAverage(recentWriting) : 0,
      readingAvg: recentReading.length ? Utils.calculateBandAverage(recentReading) : 0,
      listeningAvg: recentListening.length ? Utils.calculateBandAverage(recentListening) : 0,
      vocabCount: vocab.length,
      streak: this.calculateStreak(log),
      recentActivity: log.slice(-10).reverse(),
    };
  }

  static calculateStreak(log) {
    if (!log.length) return 0;
    const days = [...new Set(log.map(l => new Date(l.date).toDateString()))].sort((a, b) => new Date(b) - new Date(a));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < days.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (new Date(days[i]).toDateString() === expected.toDateString()) streak++;
      else break;
    }
    return streak;
  }
}
