const mongoose = require('mongoose');

const NoticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: true,
    default: 'Academic'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  targetDepartments: {
    type: [String],
    default: ['All']
  },
  targetYears: {
    type: [String],
    default: ['All']
  },
  authorId: {
    type: String,
    required: true
  },
  authorName: {
    type: String,
    default: 'Faculty'
  },
  authorRole: {
    type: String,
    default: 'Faculty Member'
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Archived'],
    default: 'Published'
  },
  publishAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  viewsCount: {
    type: Number,
    default: 0
  },
  attachment: {
    name: { type: String, default: null },
    url: { type: String, default: null },
    size: { type: String, default: null },
    type: { type: String, default: null }
  },
  savedByUsers: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Full text indexing for title & content search
NoticeSchema.index({ title: 'text', content: 'text', summary: 'text' });

module.exports = mongoose.model('Notice', NoticeSchema);
