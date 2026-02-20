const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../db');
const telegram = require('../services/telegram');
const whatsapp = require('../services/whatsapp');

router.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const posts = await query(`
      SELECT p.*, c.name as channel_name, c.platform
      FROM posts p
      JOIN channels c ON p.channel_id = c.id
      ORDER BY p.sent_at DESC
      LIMIT ?
    `, [limit]);
    res.json(posts);
  } catch (err) { next(err); }
});

router.get('/stats', async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [postsToday, totalPosts, byType, byChannel] = await Promise.all([
      queryOne(`SELECT COUNT(*) as count FROM posts WHERE DATE(sent_at) = ? AND status = 'sent'`, [today]),
      queryOne(`SELECT COUNT(*) as count FROM posts WHERE status = 'sent'`),
      query(`SELECT event_type, COUNT(*) as count FROM posts WHERE status = 'sent' GROUP BY event_type`),
      query(`
        SELECT c.name, c.platform, COUNT(p.id) as post_count
        FROM channels c
        LEFT JOIN posts p ON p.channel_id = c.id AND p.status = 'sent'
        GROUP BY c.id, c.name, c.platform
        ORDER BY post_count DESC
      `),
    ]);

    res.json({
      postsToday: parseInt(postsToday?.count) || 0,
      totalPosts: parseInt(totalPosts?.count) || 0,
      byType,
      byChannel,
    });
  } catch (err) { next(err); }
});

router.post('/send', async (req, res, next) => {
  try {
    const { message, channel_ids, event_type = 'manual', match_id } = req.body;
    if (!message || !channel_ids?.length) {
      return res.status(400).json({ error: 'message and channel_ids are required' });
    }

    const results = [];
    for (const channelId of channel_ids) {
      const channel = await queryOne('SELECT * FROM channels WHERE id = ? AND active = 1', [channelId]);
      if (!channel) {
        results.push({ channel_id: channelId, success: false, error: 'Channel not found or inactive' });
        continue;
      }

      let result;
      if (channel.platform === 'telegram') {
        result = await telegram.sendMessage(channel.chat_id, message);
      } else {
        result = await whatsapp.sendMessage(channel.chat_id, message.replace(/<[^>]+>/g, ''));
      }

      const status = result.success ? 'sent' : 'failed';
      await run(
        `INSERT INTO posts (channel_id, message, event_type, match_id, status) VALUES (?, ?, ?, ?, ?)`,
        [channelId, message, event_type, match_id || null, status]
      );
      results.push({ channel_id: channelId, channel_name: channel.name, ...result });
    }

    res.json({ results });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await run('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Post deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
