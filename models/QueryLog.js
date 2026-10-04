const mongoose = require('mongoose');

const QueryLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: 'guest'
  },
  queryText: {
    type: String,
    required: true
  },
  responseText: {
    type: String,
    required: true
  },
  sources: {
    type: Array,
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('QueryLog', QueryLogSchema);
