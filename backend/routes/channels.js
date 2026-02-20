const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../db');
const telegram = require('../services/telegram');

router.get('/', async (req, res, next) => {
  try {
    const channels = await query('SELECT * FROM channels ORDER BY created_at DESC');
    res.json(channels);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const channel = await queryOne('SELECT * FROM channels WHERE id = ?', [req.params.id]);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    res.json(channel);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      name, platform, chat_id, affiliate_link,
      post_goals = 1, post_cards = 1, post_lineups = 1, post_fulltime = 1, post_subs = 0,
    } = req.body;

    if (!name || !platform || !chat_id) {
      return res.status(400).json({ error: 'name, platform, and chat_id are required' });
    }
    if (!['telegram', 'whatsapp'].includes(platform)) {
      return res.status(400).json({ error: 'platform must be telegram or whatsapp' });
    }
    if (platform === 'telegram') {
      const check = await telegram.verifyChannel(chat_id);
      if (!check.valid) return res.status(400).json({ error: `Telegram verification failed: ${check.error}` });
    }

    const { lastInsertRowid } = await run(
      `INSERT INTO channels (name, platform, chat_id, affiliate_link, post_goals, post_cards, post_lineups, post_fulltime, post_subs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, platform, chat_id, affiliate_link || null, post_goals, post_cards, post_lineups, post_fulltime, post_subs]
    );
    const channel = await queryOne('SELECT * FROM channels WHERE id = ?', [lastInsertRowid]);
    res.status(201).json(channel);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const channel = await queryOne('SELECT * FROM channels WHERE id = ?', [req.params.id]);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const fields = ['name', 'active', 'affiliate_link', 'post_goals', 'post_cards', 'post_lineups', 'post_fulltime', 'post_subs'];
    const updates = [];
    const values = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    values.push(req.params.id);
    await run(`UPDATE channels SET ${updates.join(', ')} WHERE id = ?`, values);
    const updated = await queryOne('SELECT * FROM channels WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const channel = await queryOne('SELECT * FROM channels WHERE id = ?', [req.params.id]);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    await run('DELETE FROM channels WHERE id = ?', [req.params.id]);
    res.json({ message: 'Channel deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
