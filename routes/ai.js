/**
 * AI Routes - Handles all DeepSeek API interactions
 * All AI calls go through the backend to protect the API key
 */

const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client configured for DeepSeek
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
});

// Load prompt templates
const loadPrompt = (filename) => {
  try {
    return fs.readFileSync(path.join(__dirname, '..', 'prompts', filename), 'utf8');
  } catch (err) {
    console.error(`Failed to load prompt: ${filename}`, err.message);
    return '';
  }
};

const SPEAKING_PROMPT = loadPrompt('speaking-examiner.txt');
const WRITING_PROMPT = loadPrompt('writing-grader.txt');
const READING_PROMPT = loadPrompt('reading-explainer.txt');

// In-memory session store for speaking sessions
const speakingSessions = new Map();

/**
 * Helper: Call DeepSeek API with messages
 */
const callDeepSeek = async (messages, temperature = 0.7) => {
  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages,
    temperature,
    max_tokens: 6000,
    response_format: { type: 'json_object' }
  });
  return response.choices[0].message.content;
};

/**
 * Helper: Parse JSON from AI response (handles markdown code blocks)
 */
const parseAIResponse = (content) => {
  try {
    // Try direct parse first
    return JSON.parse(content);
  } catch {
    // Try extracting from markdown code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try finding JSON object pattern
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    throw new Error('Could not parse AI response as JSON');
  }
};

// ============================================================
// SPEAKING ENDPOINTS
// ============================================================

/**
 * POST /api/ai/speaking/start
 * Start a new speaking session
 * Body: { part: 1|2|3, topic: string (optional) }
 */
router.post('/speaking/start', async (req, res) => {
  try {
    const { part = 1, topic } = req.body;

    const sessionId = `speak_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const userMessage = topic
      ? `Start IELTS Speaking Part ${part} on the topic: "${topic}".`
      : `Start IELTS Speaking Part ${part}. Choose an appropriate topic.`;

    const messages = [
      { role: 'system', content: SPEAKING_PROMPT },
      { role: 'user', content: userMessage },
    ];

    const aiResponse = await callDeepSeek(messages);
    const parsed = parseAIResponse(aiResponse);

    // Store session
    speakingSessions.set(sessionId, {
      part,
      topic: topic || parsed.message,
      messages: [
        ...messages,
        { role: 'assistant', content: aiResponse },
      ],
      startedAt: new Date().toISOString(),
    });

    // Clean up old sessions (keep last 50)
    if (speakingSessions.size > 50) {
      const oldestKey = speakingSessions.keys().next().value;
      speakingSessions.delete(oldestKey);
    }

    res.json({
      sessionId,
      examinerMessage: parsed.message || parsed.nextQuestion || 'Let\'s begin the speaking test.',
      vietnameseTranslation: parsed.vietnameseTranslation || '',
      nextQuestion: parsed.nextQuestion || null,
      corrections: parsed.corrections || [],
      bandEstimate: parsed.bandEstimate || null,
    });
  } catch (error) {
    console.error('Speaking start error:', error.message);
    res.status(500).json({
      error: 'Failed to start speaking session',
      message: error.message,
    });
  }
});

/**
 * POST /api/ai/speaking/respond
 * Continue a speaking session with user's answer
 * Body: { sessionId: string, userAnswer: string }
 */
router.post('/speaking/respond', async (req, res) => {
  try {
    const { sessionId, userAnswer } = req.body;

    if (!sessionId || !userAnswer) {
      return res.status(400).json({ error: 'sessionId and userAnswer are required' });
    }

    const session = speakingSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found. Please start a new session.' });
    }

    // Add user response to conversation
    session.messages.push({
      role: 'user',
      content: `Candidate's response: "${userAnswer}"`,
    });

    const aiResponse = await callDeepSeek(session.messages);
    const parsed = parseAIResponse(aiResponse);

    // Store assistant response
    session.messages.push({
      role: 'assistant',
      content: aiResponse,
    });

    res.json({
      examinerResponse: parsed.message || 'Thank you for your response.',
      vietnameseTranslation: parsed.vietnameseTranslation || '',
      nextQuestion: parsed.nextQuestion || null,
      corrections: parsed.corrections || [],
      bandEstimate: parsed.bandEstimate || 0,
      tips: parsed.tips || '',
      partComplete: parsed.partComplete || false,
      testComplete: parsed.testComplete || false,
    });
  } catch (error) {
    console.error('Speaking respond error:', error.message);
    res.status(500).json({
      error: 'Failed to process speaking response',
      message: error.message,
    });
  }
});

// ============================================================
// WRITING ENDPOINTS
// ============================================================

/**
 * POST /api/ai/writing/grade
 * Grade a writing essay
 * Body: { taskType: '1'|'2', essay: string, topic: string }
 */
router.post('/writing/grade', async (req, res) => {
  try {
    const { taskType = '2', essay, topic } = req.body;

    if (!essay || essay.trim().length < 20) {
      return res.status(400).json({ error: 'Essay is too short to grade' });
    }

    const messages = [
      { role: 'system', content: WRITING_PROMPT },
      {
        role: 'user',
        content: `Please grade this IELTS Writing Task ${taskType} essay.

Topic/Question: ${topic || 'Not provided'}

Essay:
${essay}

Word count: ${essay.trim().split(/\s+/).length}`,
      },
    ];

    const aiResponse = await callDeepSeek(messages, 0.3);
    const parsed = parseAIResponse(aiResponse);

    res.json({
      bandScore: parsed.bandScore || 0,
      criteria: parsed.criteria || {},
      corrections: parsed.corrections || [],
      suggestions: parsed.suggestions || [],
      vocabularyUpgrades: parsed.vocabularyUpgrades || [],
      improvedSentences: parsed.improvedSentences || [],
      overallComment: parsed.overallComment || 'Keep practicing!',
    });
  } catch (error) {
    console.error('Writing grade error:', error.message);
    res.status(500).json({
      error: 'Failed to grade essay',
      message: error.message,
    });
  }
});

/**
 * POST /api/ai/writing/generate-topic
 * Generate a random IELTS writing topic
 * Body: { taskType: '1'|'2' }
 */
router.post('/writing/generate-topic', async (req, res) => {
  try {
    const { taskType = '2' } = req.body;

    const messages = [
      {
        role: 'system',
        content: 'You are an IELTS exam designer. Generate realistic IELTS writing topics.',
      },
      {
        role: 'user',
        content: `Generate one IELTS Writing Task ${taskType} topic. 
        ${taskType === '1'
          ? 'Include a description of a chart/graph/table/map that the candidate should describe. Be specific about the data.'
          : 'Create an essay question that requires the candidate to present and justify an opinion, discuss both views, or analyze a problem and suggest solutions.'
        }
        
        Respond in JSON: { "topic": "the full question text", "type": "${taskType === '1' ? 'data-description' : 'essay'}", "category": "the topic category", "wordLimit": ${taskType === '1' ? 150 : 250} }`,
      },
    ];

    const aiResponse = await callDeepSeek(messages, 0.9);
    const parsed = parseAIResponse(aiResponse);

    res.json(parsed);
  } catch (error) {
    console.error('Generate topic error:', error.message);
    res.status(500).json({
      error: 'Failed to generate topic',
      message: error.message,
    });
  }
});

// ============================================================
// READING ENDPOINTS
// ============================================================

/**
 * POST /api/ai/reading/explain
 * Explain why an answer is correct/incorrect
 * Body: { passage: string, question: string, userAnswer: string, correctAnswer: string }
 */
router.post('/reading/explain', async (req, res) => {
  try {
    const { passage, question, userAnswer, correctAnswer } = req.body;

    if (!question || !correctAnswer) {
      return res.status(400).json({ error: 'Question and correct answer are required' });
    }

    const messages = [
      { role: 'system', content: READING_PROMPT },
      {
        role: 'user',
        content: `Passage excerpt: "${passage ? passage.substring(0, 1500) : 'Not provided'}"

Question: ${question}
Student's Answer: ${userAnswer || 'No answer given'}
Correct Answer: ${correctAnswer}

Please explain why the correct answer is right and why the student's answer is wrong.`,
      },
    ];

    const aiResponse = await callDeepSeek(messages, 0.3);

    res.json({
      explanation: aiResponse,
    });
  } catch (error) {
    console.error('Reading explain error:', error.message);
    res.status(500).json({
      error: 'Failed to generate explanation',
      message: error.message,
    });
  }
});

// ============================================================
// VOCABULARY ENDPOINTS
// ============================================================

const dictPath = path.join(__dirname, '..', 'data', 'dictionary.json');
const getDictionary = () => {
  try { return JSON.parse(fs.readFileSync(dictPath, 'utf8')); }
  catch(e) { return {}; }
};
const saveDictionary = (dict) => {
  fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2));
};

/**
 * POST /api/ai/vocabulary/define
 * Get detailed definition and usage of a word
 * Body: { word: string, context: string (optional) }
 */
router.post('/vocabulary/define', async (req, res) => {
  try {
    const { word, context } = req.body;

    if (!word) {
      return res.status(400).json({ error: 'Word is required' });
    }

    const wKey = word.toLowerCase().trim();
    const dict = getDictionary();
    if (dict[wKey] && !context) {
      return res.json(dict[wKey]);
    }

    const messages = [
      {
        role: 'system',
        content: 'You are an English vocabulary tutor helping IELTS students. Provide clear, concise definitions with examples relevant to IELTS topics.',
      },
      {
        role: 'user',
        content: `Define the word "${word}"${context ? ` in this context: "${context}"` : ''}.

Respond in valid JSON format ONLY:
{
  "word": "${word}",
  "definition": "clear definition in simple English",
  "vietnameseMeaning": "Vietnamese translation of the word",
  "partOfSpeech": "noun/verb/adjective/etc.",
  "pronunciation": "phonetic guide (e.g. /wɜːd/)",
  "examples": ["example sentence 1", "example sentence 2"],
  "synonyms": ["synonym1", "synonym2"],
  "antonyms": ["antonym1"],
  "contextExamples": [
    { "context": "Môi trường (Environment)", "sentence": "A sentence highlighting the word.", "translation": "Vietnamese translation of the sentence." }
  ],
  "ieltsUsage": "how this word is commonly used in IELTS contexts",
  "bandLevel": "the approximate band level this word represents (e.g., Band 6, Band 7)"
}
IMPORTANT: In the 'contextExamples' array, please provide 2-3 sentences showing the word in different common contexts. Wrap the target word in the 'sentence' and 'translation' with <b> tags to highlight it (e.g., "The <b>${word}</b> is...").`,
      },
    ];

    const aiResponse = await callDeepSeek(messages, 0.3);
    const parsed = parseAIResponse(aiResponse);

    if (!context) {
      dict[wKey] = parsed;
      saveDictionary(dict);
    }

    res.json(parsed);
  } catch (error) {
    console.error('Vocabulary define error:', error.message);
    res.status(500).json({
      error: 'Failed to define word',
      message: error.message,
    });
  }
});

module.exports = router;
