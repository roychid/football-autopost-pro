require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const matchRoutes = require('./routes/matches');
const postRoutes = require('./routes/posts');
const channelRoutes = require('./routes/channels');
const { pollLiveMatches } = require('./jobs/liveMatchPoller');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Routes
app.use('/api/matches', matchRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/channels', channelRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Poll endpoint — triggered by Vercel Cron (every minute) or external cron
// Secured with a secret to prevent abuse
app.post('/api/poll', async (req, res) => {
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await pollLiveMatches();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[Poll] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Local dev: start server normally
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  initDb().then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  });
}

// Vercel: export the Express app as a serverless function
module.exports = app;
