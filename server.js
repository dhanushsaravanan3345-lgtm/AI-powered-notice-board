require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./models/db');

// Import routes
const { router: authRouter } = require('./routes/auth');
const noticesRouter = require('./routes/notices');
const aiRouter = require('./routes/ai');
const adminRouter = require('./routes/admin');
const notificationsRouter = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve frontend assets without serving the application shell as the root page.
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/notices', noticesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationsRouter);

// Health check endpoint with database status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    database: db.isMongo() ? 'MongoDB (Production Database)' : 'Local Persistent Document Store',
    timestamp: new Date().toISOString(),
    system: 'AI Powered College Notice Board',
    version: '1.0.0'
  });
});

app.get(['/','/login'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
  res.redirect('/login');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.'
  });
});

// Start database and server
async function startServer() {
  await db.init();
  
  app.listen(PORT, () => {
    console.log('========================================================');
    console.log(`🚀 AI Powered College Notice Board is running!`);
    console.log(`📍 Web Interface: http://localhost:${PORT}`);
    console.log(`🔌 Database Mode: ${db.isMongo() ? 'MongoDB Connected' : 'Persistent Storage (data/database.json)'}`);
    console.log(`🎓 Program: B.Tech Artificial Intelligence & Data Science`);
    console.log('========================================================');
  });
}

startServer();
