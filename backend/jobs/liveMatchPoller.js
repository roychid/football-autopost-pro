const { query, queryOne, run } = require('../db');
const footballApi = require('../services/footballApi');
const telegram = require('../services/telegram');
const whatsapp = require('../services/whatsapp');

// ── Message Templates ──────────────────────────────────────────────

function buildGoalMessage(fixture, event, channel) {
  const home = fixture.teams.home.name;
  const away = fixture.teams.away.name;
  const homeScore = fixture.goals.home;
  const awayScore = fixture.goals.away;
  const scorer = event.player?.name || 'Unknown';
  const assist = event.assist?.name;
  const minute = event.time?.elapsed;
  const isOwnGoal = event.detail === 'Own Goal';
  const isPenalty = event.detail === 'Penalty';

  let msg = `⚽ <b>GOAL! ${home} ${homeScore}–${awayScore} ${away}</b>\n`;
  msg += `🕐 ${minute}' | ${fixture.league?.name}\n\n`;
  msg += isOwnGoal
    ? `Own goal by ${scorer} 😬\n`
    : `${scorer}${isPenalty ? ' (Pen)' : ''}${assist ? ` | Assist: ${assist}` : ''}\n`;

  if (channel.affiliate_link) {
    msg += `\n🎯 <a href="${channel.affiliate_link}">Bet on this match</a>`;
  }
  return msg;
}

function buildCardMessage(fixture, event, channel) {
  const cardEmoji = event.detail === 'Red Card' ? '🟥' : '🟨';
  const home = fixture.teams.home.name;
  const away = fixture.teams.away.name;
  const minute = event.time?.elapsed;
  const player = event.player?.name || 'Unknown';
  const team = event.team?.name;

  let msg = `${cardEmoji} <b>${event.detail}!</b>\n`;
  msg += `${player} (${team})\n`;
  msg += `🕐 ${minute}' | ${home} vs ${away}\n${fixture.league?.name}`;
  if (channel.affiliate_link) msg += `\n\n🎯 <a href="${channel.affiliate_link}">Live odds</a>`;
  return msg;
}

function buildSubMessage(fixture, event) {
  const home = fixture.teams.home.name;
  const away = fixture.teams.away.name;
  const playerIn = event.assist?.name || '?';
  const playerOut = event.player?.name || '?';
  const minute = event.time?.elapsed;
  return `🔄 <b>Substitution</b> | ${event.team?.name}\n⬆️ ${playerIn}  ⬇️ ${playerOut}\n🕐 ${minute}' | ${home} vs ${away}`;
}

function buildFullTimeMessage(fixture, channel) {
  const home = fixture.teams.home.name;
  const away = fixture.teams.away.name;
  const homeScore = fixture.goals.home;
  const awayScore = fixture.goals.away;

  let msg = `🏁 <b>Full Time</b>\n${home} <b>${homeScore}–${awayScore}</b> ${away}\n${fixture.league?.name}`;
  if (channel.affiliate_link) msg += `\n\n🎯 <a href="${channel.affiliate_link}">Next match odds</a>`;
  return msg;
}

// ── Sender ─────────────────────────────────────────────────────────

async function sendToChannel(channel, message, eventType, matchId) {
  let result;

  if (channel.platform === 'telegram') {
    result = await telegram.sendMessage(channel.chat_id, message);
  } else if (channel.platform === 'whatsapp') {
    const plain = message.replace(/<[^>]+>/g, '');
    result = await whatsapp.sendMessage(channel.chat_id, plain);
  } else {
    return;
  }

  const status = result.success ? 'sent' : 'failed';
  await run(
    `INSERT INTO posts (channel_id, message, event_type, match_id, status) VALUES (?, ?, ?, ?, ?)`,
    [channel.id, message, eventType, matchId, status]
  );

  if (!result.success) console.error(`Failed [${channel.name}]:`, result.error);
}

// ── Match Processor ────────────────────────────────────────────────

async function processMatch(fixture) {
  const fixtureId = fixture.fixture.id;
  const status = fixture.fixture.status?.short;
  const channels = await query('SELECT * FROM channels WHERE active = 1');
  if (channels.length === 0) return;

  // Full time
  if (status === 'FT') {
    const ftKey = `${fixtureId}_FT`;
    const alreadySent = await queryOne('SELECT 1 FROM tracked_events WHERE event_key = ?', [ftKey]);
    if (!alreadySent) {
      await run('INSERT INTO tracked_events (match_id, event_key) VALUES (?, ?)', [String(fixtureId), ftKey]);
      for (const channel of channels) {
        if (channel.post_fulltime) {
          await sendToChannel(channel, buildFullTimeMessage(fixture, channel), 'fulltime', String(fixtureId));
        }
      }
    }
    return;
  }

  if (!['1H', '2H', 'ET', 'P'].includes(status)) return;

  const events = await footballApi.getFixtureEvents(fixtureId);

  for (const event of events) {
    const eventKey = `${fixtureId}_${event.time?.elapsed}_${event.type}_${event.player?.id || 'na'}`;
    const alreadySent = await queryOne('SELECT 1 FROM tracked_events WHERE event_key = ?', [eventKey]);
    if (alreadySent) continue;

    await run('INSERT INTO tracked_events (match_id, event_key) VALUES (?, ?) ON CONFLICT DO NOTHING', [String(fixtureId), eventKey]);

    for (const channel of channels) {
      let msg = null;
      let eventType = null;

      if (event.type === 'Goal' && channel.post_goals) {
        msg = buildGoalMessage(fixture, event, channel);
        eventType = 'goal';
      } else if (event.type === 'Card' && channel.post_cards) {
        msg = buildCardMessage(fixture, event, channel);
        eventType = 'card';
      } else if (event.type === 'subst' && channel.post_subs) {
        msg = buildSubMessage(fixture, event);
        eventType = 'substitution';
      }

      if (msg) await sendToChannel(channel, msg, eventType, String(fixtureId));
    }
  }
}

// ── Main poll function (called by /api/poll endpoint) ──────────────

async function pollLiveMatches() {
  const liveMatches = await footballApi.getLiveMatches();
  console.log(`[Poll] ${liveMatches.length} live match(es)`);

  for (const fixture of liveMatches) {
    await processMatch(fixture);
  }

  // Cleanup tracked events older than 7 days (runs on every poll, cheap)
  await run(`DELETE FROM tracked_events WHERE created_at < NOW() - INTERVAL '7 days'`, []);

  return { matched: liveMatches.length };
}

module.exports = { pollLiveMatches };
