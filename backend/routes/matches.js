const express = require('express');
const router = express.Router();
const footballApi = require('../services/footballApi');
const { query, queryOne, run } = require('../db');

router.get('/live', async (req, res, next) => {
  try { res.json(await footballApi.getLiveMatches()); } catch (err) { next(err); }
});

router.get('/today', async (req, res, next) => {
  try {
    const activeLeagues = await query('SELECT league_id FROM leagues WHERE active = 1');
    const ids = activeLeagues.map(l => l.league_id);
    if (ids.length === 0) return res.json([]);
    res.json(await footballApi.getTodayFixtures(ids));
  } catch (err) { next(err); }
});

router.get('/standings/:leagueId', async (req, res, next) => {
  try { res.json(await footballApi.getStandings(req.params.leagueId)); } catch (err) { next(err); }
});

router.get('/leagues/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing search query' });
    res.json(await footballApi.searchLeague(q));
  } catch (err) { next(err); }
});

router.get('/leagues/active', async (req, res, next) => {
  try { res.json(await query('SELECT * FROM leagues WHERE active = 1')); } catch (err) { next(err); }
});

router.post('/leagues', async (req, res, next) => {
  try {
    const { league_id, name, country } = req.body;
    if (!league_id || !name) return res.status(400).json({ error: 'league_id and name required' });

    const existing = await queryOne('SELECT * FROM leagues WHERE league_id = ?', [league_id]);
    if (existing) {
      await run('UPDATE leagues SET active = 1 WHERE league_id = ?', [league_id]);
      return res.json({ message: 'League re-activated' });
    }
    const { lastInsertRowid } = await run(
      'INSERT INTO leagues (league_id, name, country) VALUES (?, ?, ?)',
      [league_id, name, country || null]
    );
    res.status(201).json(await queryOne('SELECT * FROM leagues WHERE id = ?', [lastInsertRowid]));
  } catch (err) { next(err); }
});

router.delete('/leagues/:id', async (req, res, next) => {
  try {
    await run('UPDATE leagues SET active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'League deactivated' });
  } catch (err) { next(err); }
});

router.get('/:id/events', async (req, res, next) => {
  try { res.json(await footballApi.getFixtureEvents(req.params.id)); } catch (err) { next(err); }
});

router.get('/:id/lineups', async (req, res, next) => {
  try { res.json(await footballApi.getLineups(req.params.id)); } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const fixture = await footballApi.getFixtureById(req.params.id);
    if (!fixture) return res.status(404).json({ error: 'Match not found' });
    res.json(fixture);
  } catch (err) { next(err); }
});

module.exports = router;
