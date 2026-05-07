/**
 * Content Routes - Serves static content data (reading passages, listening scripts, etc.)
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Load data files
const loadData = (filename) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, '..', 'data', filename), 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Failed to load data: ${filename}`, err.message);
    return [];
  }
};

// ============================================================
// READING ENDPOINTS
// ============================================================

/**
 * GET /api/content/reading
 * Returns a random reading passage
 */
router.get('/reading', (req, res) => {
  try {
    const passages = loadData('reading-comics.json');
    if (!passages.length) {
      return res.status(404).json({ error: 'No reading passages available' });
    }
    const randomIndex = Math.floor(Math.random() * passages.length);
    res.json(passages[randomIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load reading data', message: error.message });
  }
});

/**
 * GET /api/content/reading/all
 * Returns all reading passages (metadata only)
 */
router.get('/reading/all', (req, res) => {
  try {
    const passages = loadData('reading-comics.json');
    const metadata = passages.map((p, index) => ({
      id: p.id || index,
      title: p.title,
      topic: p.topic,
      difficulty: p.difficulty,
      img: p.img,
      questionCount: p.questions ? p.questions.length : 0,
    }));
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load reading data', message: error.message });
  }
});

/**
 * GET /api/content/reading/:id
 * Returns a specific reading passage by ID
 */
router.get('/reading/:id', (req, res) => {
  try {
    const passages = loadData('reading-comics.json');
    const passage = passages.find((p) => String(p.id) === String(req.params.id));
    if (!passage) {
      return res.status(404).json({ error: 'Reading passage not found' });
    }
    res.json(passage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load reading data', message: error.message });
  }
});

// ============================================================
// LISTENING ENDPOINTS
// ============================================================

/**
 * GET /api/content/listening
 * Returns a random listening set
 */
router.get('/listening', (req, res) => {
  try {
    const sets = loadData('listening-scripts.json');
    if (!sets.length) {
      return res.status(404).json({ error: 'No listening sets available' });
    }
    const randomIndex = Math.floor(Math.random() * sets.length);
    res.json(sets[randomIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load listening data', message: error.message });
  }
});

/**
 * GET /api/content/listening/all
 * Returns all listening sets (metadata only)
 */
router.get('/listening/all', (req, res) => {
  try {
    const sets = loadData('listening-scripts.json');
    const metadata = sets.map((s, index) => ({
      id: s.id || index,
      title: s.title,
      section: s.section,
      topic: s.topic,
      questionCount: s.questions ? s.questions.length : 0,
    }));
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load listening data', message: error.message });
  }
});

/**
 * GET /api/content/listening/:id
 * Returns a specific listening set by ID
 */
router.get('/listening/:id', (req, res) => {
  try {
    const sets = loadData('listening-scripts.json');
    const set = sets.find((s) => String(s.id) === String(req.params.id));
    if (!set) {
      return res.status(404).json({ error: 'Listening set not found' });
    }
    res.json(set);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load listening data', message: error.message });
  }
});

// ============================================================
// WRITING TOPICS ENDPOINT
// ============================================================

/**
 * GET /api/content/writing-topics
 * Returns all writing topics
 */
router.get('/writing-topics', (req, res) => {
  try {
    const topics = loadData('writing-topics.json');
    res.json(topics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load writing topics', message: error.message });
  }
});

/**
 * GET /api/content/writing-topics/:type
 * Returns writing topics filtered by type (task1 or task2)
 */
router.get('/writing-topics/:type', (req, res) => {
  try {
    const topics = loadData('writing-topics.json');
    const filtered = topics.filter((t) => t.taskType === req.params.type);
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load writing topics', message: error.message });
  }
});

// ============================================================
// VOCABULARY ENDPOINT
// ============================================================

/**
 * GET /api/content/vocabulary
 * Returns all vocabulary data
 */
router.get('/vocabulary', (req, res) => {
  try {
    const vocab = loadData('vocabulary.json');
    res.json(vocab);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load vocabulary data', message: error.message });
  }
});

/**
 * GET /api/content/vocabulary/:topic
 * Returns vocabulary for a specific topic
 */
router.get('/vocabulary/:topic', (req, res) => {
  try {
    const vocab = loadData('vocabulary.json');
    const topicData = vocab.find(
      (v) => v.topic.toLowerCase() === req.params.topic.toLowerCase()
    );
    if (!topicData) {
      return res.status(404).json({ error: 'Vocabulary topic not found' });
    }
    res.json(topicData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load vocabulary data', message: error.message });
  }
});

module.exports = router;
