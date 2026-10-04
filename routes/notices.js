const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware, optionalAuth } = require('./auth');
const { generateSummary } = require('../services/aiService');

/**
 * GET /api/notices
 * List notices with multi-criteria filtering, search, and audience matching
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      search,
      department,
      year,
      category,
      priority,
      savedOnly,
      myNoticesOnly,
      includeExpired
    } = req.query;

    let notices = await db.getNotices();
    const currentUser = req.user;
    const now = new Date();

    // 1. Expiry filtering
    if (includeExpired !== 'true') {
      notices = notices.filter(n => !n.expiresAt || new Date(n.expiresAt) > now);
    }

    // 2. My notices filter (for faculty/admin)
    if (myNoticesOnly === 'true' && currentUser) {
      notices = notices.filter(n => n.authorId === currentUser.id);
    }

    // 3. Saved / Bookmarked only
    if (savedOnly === 'true' && currentUser) {
      notices = notices.filter(n => Array.isArray(n.savedByUsers) && n.savedByUsers.includes(currentUser.id));
    }

    // 4. Category filter
    if (category && category !== 'All') {
      notices = notices.filter(n => n.category.toLowerCase() === category.toLowerCase());
    }

    // 5. Priority filter
    if (priority && priority !== 'All') {
      notices = notices.filter(n => n.priority.toLowerCase() === priority.toLowerCase());
    }

    // 6. Department filter
    if (department && department !== 'All') {
      notices = notices.filter(n =>
        n.targetDepartments.includes('All') ||
        n.targetDepartments.includes(department)
      );
    }

    // 7. Year filter
    if (year && year !== 'All') {
      notices = notices.filter(n =>
        n.targetYears.includes('All') ||
        n.targetYears.includes(year)
      );
    }

    // 8. Search query filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      notices = notices.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.summary && n.summary.toLowerCase().includes(q)) ||
        n.category.toLowerCase().includes(q) ||
        (n.authorName && n.authorName.toLowerCase().includes(q))
      );
    }

    // Sort: Pinned first, then Priority (Urgent > High > Medium > Low), then latest publishAt
    const priorityWeights = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
    notices.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      const pA = priorityWeights[a.priority] || 0;
      const pB = priorityWeights[b.priority] || 0;
      if (pA !== pB) return pB - pA;

      return new Date(b.publishAt) - new Date(a.publishAt);
    });

    // Decorate with user bookmark status
    const decorated = notices.map(n => ({
      ...n,
      isBookmarked: currentUser && Array.isArray(n.savedByUsers) ? n.savedByUsers.includes(currentUser.id) : false
    }));

    return res.json({
      count: decorated.length,
      notices: decorated
    });
  } catch (err) {
    console.error('Fetch notices error:', err);
    return res.status(500).json({ error: 'Failed to fetch notices.' });
  }
});

/**
 * GET /api/notices/categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await db.getCategories();
    return res.json({ categories });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

/**
 * GET /api/notices/:id
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const notice = await db.getNoticeById(req.params.id);
    if (!notice) {
      return res.status(404).json({ error: 'Notice not found.' });
    }

    // Increment views
    await db.incrementViews(notice.id);

    const currentUser = req.user;
    const isBookmarked = currentUser && Array.isArray(notice.savedByUsers) ? notice.savedByUsers.includes(currentUser.id) : false;

    return res.json({
      notice: {
        ...notice,
        isBookmarked
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch notice.' });
  }
});

/**
 * POST /api/notices
 * Create a notice / feed post (Faculty or Administrator)
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'Faculty' && user.role !== 'Administrator') {
      return res.status(403).json({ error: 'Forbidden: Only Faculty and Administrators can publish notices.' });
    }

    const {
      title,
      content,
      category,
      priority,
      targetDepartments,
      targetYears,
      expiresAt,
      isPinned,
      attachment,
      summary
    } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({ error: 'Title, content, and category are required.' });
    }

    // Auto-generate AI summary if not explicitly provided
    let finalSummary = summary;
    if (!finalSummary || finalSummary.trim().length === 0) {
      finalSummary = await generateSummary(title, content);
    }

    const newNotice = await db.createNotice({
      title: title.trim(),
      content: content.trim(),
      summary: finalSummary,
      category,
      priority: priority || 'Medium',
      targetDepartments: Array.isArray(targetDepartments) && targetDepartments.length > 0 ? targetDepartments : ['All'],
      targetYears: Array.isArray(targetYears) && targetYears.length > 0 ? targetYears : ['All'],
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role === 'Faculty' ? (user.department ? `${user.department} Faculty` : 'Faculty') : 'Administrator',
      expiresAt: expiresAt || null,
      isPinned: Boolean(isPinned),
      attachment: attachment || null
    });

    return res.status(201).json({
      message: 'Notice created and broadcasted successfully',
      notice: newNotice
    });
  } catch (err) {
    console.error('Create notice error:', err);
    return res.status(500).json({ error: 'Failed to create notice.' });
  }
});

/**
 * PUT /api/notices/:id
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await db.getNoticeById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Notice not found.' });
    }

    const user = req.user;
    if (user.role !== 'Administrator' && existing.authorId !== user.id) {
      return res.status(403).json({ error: 'Access denied. You can only edit notices created by you.' });
    }

    const updates = { ...req.body };

    if ((updates.title || updates.content) && !updates.summary) {
      const newTitle = updates.title || existing.title;
      const newContent = updates.content || existing.content;
      updates.summary = await generateSummary(newTitle, newContent);
    }

    const updated = await db.updateNotice(req.params.id, updates);
    return res.json({
      message: 'Notice updated successfully',
      notice: updated
    });
  } catch (err) {
    console.error('Update notice error:', err);
    return res.status(500).json({ error: 'Failed to update notice.' });
  }
});

/**
 * DELETE /api/notices/:id
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await db.getNoticeById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Notice not found.' });
    }

    const user = req.user;
    if (user.role !== 'Administrator' && existing.authorId !== user.id) {
      return res.status(403).json({ error: 'Access denied. You can only delete notices created by you.' });
    }

    await db.deleteNotice(req.params.id);
    return res.json({ message: 'Notice deleted successfully.' });
  } catch (err) {
    console.error('Delete notice error:', err);
    return res.status(500).json({ error: 'Failed to delete notice.' });
  }
});

/**
 * POST /api/notices/:id/bookmark
 */
router.post('/:id/bookmark', authMiddleware, async (req, res) => {
  try {
    const result = await db.toggleBookmark(req.params.id, req.user.id);
    if (!result) {
      return res.status(404).json({ error: 'Notice not found.' });
    }
    return res.json({
      bookmarked: result.bookmarked,
      bookmarksCount: result.count
    });
  } catch (err) {
    console.error('Bookmark error:', err);
    return res.status(500).json({ error: 'Failed to toggle bookmark.' });
  }
});

module.exports = router;
