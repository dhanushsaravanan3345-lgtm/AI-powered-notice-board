const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { optionalAuth, authMiddleware } = require('./auth');
const {
  generateSummary,
  answerStudentQuestion,
  getSuggestedQueries
} = require('../services/aiService');

/**
 * POST /api/ai/ask
 */
router.post('/ask', optionalAuth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question text is required.' });
    }

    const allNotices = await db.getNotices();
    const user = req.user;

    const result = await answerStudentQuestion(question.trim(), user, allNotices);

    // Log the AI query for audit and analytics in the database
    const userId = user ? user.id : 'guest-student';
    await db.logAiQuery(userId, question.trim(), result.answer, result.sources);

    return res.json({
      query: question,
      answer: result.answer,
      sources: result.sources,
      provider: result.provider
    });
  } catch (err) {
    console.error('AI Ask error:', err);
    return res.status(500).json({ error: 'Failed to process AI question.' });
  }
});

/**
 * POST /api/ai/summarize
 */
router.post('/summarize', optionalAuth, async (req, res) => {
  try {
    const { title, content } = req.body;
    if ((title !== undefined && typeof title !== 'string') ||
        (content !== undefined && typeof content !== 'string')) {
      return res.status(400).json({ error: 'Notice title and content must be text.' });
    }

    const cleanTitle = (title || '').trim();
    const cleanContent = (content || '').trim();
    if (!cleanContent && !cleanTitle) {
      return res.status(400).json({ error: 'Please provide either notice title or content for summarization.' });
    }

    const summary = await generateSummary(cleanTitle, cleanContent);
    return res.json({ summary });
  } catch (err) {
    console.error('AI Summarize error:', err);
    return res.status(500).json({ error: 'Failed to generate summary.' });
  }
});

/**
 * GET /api/ai/suggested-questions
 */
router.get('/suggested-questions', optionalAuth, async (req, res) => {
  try {
    const notices = await db.getNotices();
    const suggestions = getSuggestedQueries(notices, req.user);
    return res.json({ suggestions });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get suggested questions.' });
  }
});

/**
 * GET /api/ai/history
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const logs = await db.getQueryLogs();
    return res.json({ queries: logs.slice(-20).reverse() });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch query logs.' });
  }
});

module.exports = router;
