/**
 * API client for backend communication
 */
class API {
  static async request(endpoint, options = {}) {
    try {
      const res = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || err.message || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error.message);
      throw error;
    }
  }

  // Speaking
  static startSpeaking(part, topic) {
    return this.request('/ai/speaking/start', { method: 'POST', body: { part, topic } });
  }
  static continueSpeaking(sessionId, userAnswer) {
    return this.request('/ai/speaking/respond', { method: 'POST', body: { sessionId, userAnswer } });
  }

  // Writing
  static gradeWriting(taskType, essay, topic) {
    return this.request('/ai/writing/grade', { method: 'POST', body: { taskType, essay, topic } });
  }
  static generateWritingTopic(taskType) {
    return this.request('/ai/writing/generate-topic', { method: 'POST', body: { taskType } });
  }
  static getWritingTopics() {
    return this.request('/content/writing-topics');
  }

  // Reading
  static getReadingPassage(id) {
    return this.request(id ? `/content/reading/${id}` : '/content/reading');
  }
  static getAllReadingPassages() {
    return this.request('/content/reading/all');
  }
  static explainReading(passage, question, userAnswer, correctAnswer) {
    return this.request('/ai/reading/explain', { method: 'POST', body: { passage, question, userAnswer, correctAnswer } });
  }

  // Listening
  static getListeningSet(id) {
    return this.request(id ? `/content/listening/${id}` : '/content/listening');
  }
  static getAllListeningSets() {
    return this.request('/content/listening/all');
  }

  // Vocabulary
  static defineWord(word, context) {
    return this.request('/ai/vocabulary/define', { method: 'POST', body: { word, context } });
  }
  static getVocabularyData() {
    return this.request('/content/vocabulary');
  }
}
