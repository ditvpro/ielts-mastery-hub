/**
 * IELTS Mastery Hub - Main Server
 * 
 * ============================================================
 * SETUP INSTRUCTIONS:
 * ============================================================
 * 
 * 1. Prerequisites:
 *    - Node.js v18+ installed (https://nodejs.org/)
 *    - A DeepSeek API key (https://platform.deepseek.com/)
 * 
 * 2. Installation:
 *    $ cd ielts-mastery-hub
 *    $ npm install
 * 
 * 3. Configuration:
 *    - Open .env file in the project root
 *    - Replace 'your_deepseek_api_key_here' with your actual DeepSeek API key
 *    - Optionally change the PORT (default: 3000)
 * 
 * 4. Running the server:
 *    Development (with auto-reload):
 *      $ npm run dev
 *    
 *    Production:
 *      $ npm start
 * 
 * 5. Open your browser:
 *    Navigate to http://localhost:3000
 * 
 * 6. Features:
 *    - Speaking practice with AI examiner (Web Speech API)
 *    - Writing practice with AI grading
 *    - Reading comprehension with AI explanations
 *    - Listening practice with transcripts
 *    - Vocabulary builder with flashcards
 *    - Progress tracking via localStorage
 * 
 * ============================================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const aiRoutes = require('./routes/ai');
const contentRoutes = require('./routes/content');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/ai', aiRoutes);
app.use('/api/content', contentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback: serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🎓 IELTS Mastery Hub is running!`);
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${process.env.DEEPSEEK_API_KEY ? 'Configured ✓' : 'NOT SET ✗ (check .env)'}`);
  console.log(`🌐 DeepSeek URL: ${process.env.DEEPSEEK_BASE_URL}\n`);
});
