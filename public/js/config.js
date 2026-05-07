/**
 * Configuration constants for IELTS Mastery Hub
 */
const CONFIG = {
  API_BASE: '/api',
  SPEECH_LANG: 'en-US',
  TARGET_BAND: 6.0,

  STORAGE_KEYS: {
    PROFILE: 'ielts_profile',
    SPEAKING_HISTORY: 'ielts_speaking_history',
    WRITING_HISTORY: 'ielts_writing_history',
    READING_HISTORY: 'ielts_reading_history',
    LISTENING_HISTORY: 'ielts_listening_history',
    VOCABULARY: 'ielts_vocabulary',
    STATS: 'ielts_stats',
    PRACTICE_LOG: 'ielts_practice_log',
  },

  TIMER: {
    SPEAKING_PREP: 60,
    SPEAKING_PART2: 120,
    WRITING_TASK1: 1200,
    WRITING_TASK2: 2400,
    READING: 1200,
    LISTENING: 1800,
  },

  ROUTES: {
    '#dashboard': 'dashboard',
    '#speaking': 'speaking',
    '#writing': 'writing',
    '#reading': 'reading',
    '#listening': 'listening',
    '#vocabulary': 'vocabulary',
  },

  BAND_LEVELS: {
    BEGINNER: { min: 0, max: 4.5, label: 'Beginner', color: '#ff5252' },
    INTERMEDIATE: { min: 5.0, max: 5.5, label: 'Intermediate', color: '#ffab40' },
    TARGET: { min: 6.0, max: 6.5, label: 'Target', color: '#00e676' },
    ADVANCED: { min: 7.0, max: 9.0, label: 'Advanced', color: '#40c4ff' },
  },
};
