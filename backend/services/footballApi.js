const axios = require('axios');

const client = axios.create({
  baseURL: process.env.FOOTBALL_API_BASE,
  headers: {
    'x-apisports-key': process.env.FOOTBALL_API_KEY,
  },
});

// Get all live matches
async function getLiveMatches() {
  const { data } = await client.get('/fixtures', {
    params: { live: 'all' },
  });
  return data.response || [];
}

// Get today's fixtures for specific leagues
async function getTodayFixtures(leagueIds = []) {
  const today = new Date().toISOString().split('T')[0];
  const results = [];

  for (const leagueId of leagueIds) {
    const { data } = await client.get('/fixtures', {
      params: { league: leagueId, date: today, season: new Date().getFullYear() },
    });
    results.push(...(data.response || []));
  }

  return results;
}

// Get fixture by ID (includes events)
async function getFixtureById(fixtureId) {
  const { data } = await client.get('/fixtures', {
    params: { id: fixtureId },
  });
  return data.response?.[0] || null;
}

// Get events for a fixture (goals, cards, subs)
async function getFixtureEvents(fixtureId) {
  const { data } = await client.get('/fixtures/events', {
    params: { fixture: fixtureId },
  });
  return data.response || [];
}

// Get lineups for a fixture
async function getLineups(fixtureId) {
  const { data } = await client.get('/fixtures/lineups', {
    params: { fixture: fixtureId },
  });
  return data.response || [];
}

// Get standings for a league
async function getStandings(leagueId) {
  const season = new Date().getFullYear();
  const { data } = await client.get('/standings', {
    params: { league: leagueId, season },
  });
  return data.response?.[0]?.league?.standings?.[0] || [];
}

// Search for a league by name
async function searchLeague(name) {
  const { data } = await client.get('/leagues', {
    params: { search: name },
  });
  return data.response || [];
}

module.exports = {
  getLiveMatches,
  getTodayFixtures,
  getFixtureById,
  getFixtureEvents,
  getLineups,
  getStandings,
  searchLeague,
};
