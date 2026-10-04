const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Administrator', 'Faculty', 'Student'],
    default: 'Student'
  },
  department: {
    type: String,
    default: 'Artificial Intelligence & Data Science'
  },
  year: {
    type: String,
    default: '1st Year'
  },
  designation: {
    type: String,
    default: ''
  },
  rollNumber: {
    type: String,
    default: ''
  },
  notificationPreferences: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
