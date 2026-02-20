import { useEffect, useState } from 'react';
import { getLiveMatches, getTodayMatches, getChannels, sendPost } from '../api';

const EVENT_TYPES = [
  { key: 'goal', label: '⚽ Goal Alert' },
  { key: 'card', label: '🟨 Card Alert' },
  { key: 'fulltime', label: '🏁 Full Time' },
  { key: 'lineup', label: '📋 Lineup' },
  { key: 'manual', label: '✍️ Custom' },
];

function buildTemplate(type, fixture, affiliateLink) {
  if (!fixture) return '';
  const home = fixture.teams?.home?.name || 'Home';
  const away = fixture.teams?.away?.name || 'Away';
  const league = fixture.league?.name || '';
  const hg = fixture.goals?.home ?? '?';
  const ag = fixture.goals?.away ?? '?';
  const aff = affiliateLink ? `\n\n🎯 ${affiliateLink}` : '';

  switch (type) {
    case 'goal':
      return `⚽ GOAL! ${home} ${hg}–${ag} ${away}\n🕐 ${fixture.fixture?.status?.elapsed || '?'}' | ${league}${aff}`;
    case 'card':
      return `🟨 Card Alert | ${home} vs ${away}\n${league}${aff}`;
    case 'fulltime':
      return `🏁 Full Time\n${home} ${hg}–${ag} ${away}\n${league}${aff}`;
    case 'lineup':
      return `📋 Lineup | ${home} vs ${away}\n${league}\n\nLineups will be posted here.${aff}`;
    default:
      return '';
  }
}

export default function Composer() {
  const [matches, setMatches] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [eventType, setEventType] = useState('goal');
  const [message, setMessage] = useState('');
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const [live, today, ch] = await Promise.all([getLiveMatches(), getTodayMatches(), getChannels()]);
      const all = [
        ...live,
        ...today.filter(t => !live.some(l => l.fixture?.id === t.fixture?.id)),
      ];
      setMatches(all);
      const active = ch.filter(c => c.active);
      setChannels(active);
      setSelectedChannels(active.map(c => c.id));
    }
    load();
  }, []);

  // Auto-fill message template when match or type changes
  useEffect(() => {
    const aff = channels.find(c => selectedChannels.includes(c.id))?.affiliate_link || '';
    setMessage(buildTemplate(eventType, selectedMatch, aff));
  }, [eventType, selectedMatch]);

  function toggleChannel(id) {
    setSelectedChannels(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  async function handleSend() {
    if (!message.trim()) return setError('Message cannot be empty');
    if (selectedChannels.length === 0) return setError('Select at least one channel');
    setError('');
    setSending(true);
    setResult(null);
    try {
      const res = await sendPost({
        message,
        channel_ids: selectedChannels,
        event_type: eventType,
        match_id: selectedMatch?.fixture?.id ? String(selectedMatch.fixture.id) : null,
      });
      setResult(res.results);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSending(false);
    }
  }

  const matchLabel = (f) => {
    const home = f.teams?.home?.name;
    const away = f.teams?.away?.name;
    const status = f.fixture?.status?.short;
    const isLive = ['1H', '2H', 'ET', 'P'].includes(status);
    return `${home} vs ${away}${isLive ? ' 🔴 LIVE' : ''}`;
  };

  return (
    <>
      <div className="topbar">
        <div><h1>Post Composer</h1><p>Build and send a post to your channels</p></div>
      </div>

      <div className="page">
        <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>

          {/* Left: Compose */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Match */}
            <div className="card">
              <div className="section-title">① Select Match</div>
              <select
                className="select"
                value={selectedMatch?.fixture?.id || ''}
                onChange={e => {
                  const f = matches.find(m => String(m.fixture?.id) === e.target.value);
                  setSelectedMatch(f || null);
                }}
              >
                <option value="">— No match selected —</option>
                {matches.map(f => (
                  <option key={f.fixture?.id} value={f.fixture?.id}>{matchLabel(f)}</option>
                ))}
              </select>
            </div>

            {/* Event type */}
            <div className="card">
              <div className="section-title">② Post Type</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {EVENT_TYPES.map(t => (
                  <button
                    key={t.key}
                    className="btn"
                    style={{
                      background: eventType === t.key ? 'var(--accent)' : 'var(--surface2)',
                      color: eventType === t.key ? '#000' : 'var(--text)',
                      border: '1px solid var(--border)',
                    }}
                    onClick={() => setEventType(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="card">
              <div className="section-title">③ Message</div>
              <textarea
                className="textarea"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your message here or select a match + post type to auto-fill..."
                rows={8}
              />
              <div className="flex items-center justify-between mt-8">
                <span className="text-sm text-muted">{message.length} chars</span>
                {selectedMatch && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const aff = channels.find(c => selectedChannels.includes(c.id))?.affiliate_link || '';
                      setMessage(buildTemplate(eventType, selectedMatch, aff));
                    }}
                  >
                    ⟳ Reset template
                  </button>
                )}
              </div>
            </div>

            {/* Channels */}
            <div className="card">
              <div className="section-title">④ Send To</div>
              {channels.length === 0 && <p className="text-muted text-sm">No active channels. Add one in Channels.</p>}
              {channels.map(ch => (
                <div key={ch.id} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div className="text-white" style={{ fontSize: 13 }}>{ch.name}</div>
                    <span className={`badge ${ch.platform === 'telegram' ? 'badge-sky' : 'badge-green'}`}>{ch.platform}</span>
                  </div>
                  <button
                    className={`toggle ${selectedChannels.includes(ch.id) ? 'on' : ''}`}
                    onClick={() => toggleChannel(ch.id)}
                  />
                </div>
              ))}
            </div>

            {/* Send button */}
            {error && <div className="alert alert-error">{error}</div>}

            <button
              className="btn btn-primary w-full"
              style={{ justifyContent: 'center', padding: '12px', fontSize: 15 }}
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? 'Sending...' : `⚡ Send to ${selectedChannels.length} Channel${selectedChannels.length !== 1 ? 's' : ''}`}
            </button>
          </div>

          {/* Right: Preview + Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Message preview */}
            <div className="card">
              <div className="section-title">Preview</div>
              <div style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '14px 16px',
                fontFamily: 'monospace',
                fontSize: 13,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                color: 'var(--text)',
                minHeight: 100,
              }}>
                {message || <span style={{ color: 'var(--muted)' }}>Message preview will appear here...</span>}
              </div>
            </div>

            {/* Send results */}
            {result && (
              <div className="card">
                <div className="section-title">Send Results</div>
                {result.map((r, i) => (
                  <div key={i} className="flex items-center gap-8" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className={`dot ${r.success ? 'dot-green' : 'dot-red'}`} />
                    <div>
                      <div className="text-white" style={{ fontSize: 13 }}>{r.channel_name || `Channel ${r.channel_id}`}</div>
                      {!r.success && <div className="text-sm text-red">{r.error}</div>}
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      {r.success
                        ? <span className="badge badge-green">Sent</span>
                        : <span className="badge badge-live">Failed</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
