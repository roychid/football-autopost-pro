import { useEffect, useState } from 'react';
import { getLiveMatches, getTodayMatches, getPostStats, getActiveLeagues } from '../api';

function MatchCard({ fixture }) {
  const home = fixture.teams?.home;
  const away = fixture.teams?.away;
  const goals = fixture.goals;
  const status = fixture.fixture?.status;
  const league = fixture.league;
  const isLive = ['1H', '2H', 'ET', 'P'].includes(status?.short);

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div className="flex items-center justify-between mb-8">
        <span className="text-sm text-muted">{league?.name} · {league?.country}</span>
        {isLive ? (
          <span className="badge badge-live">● {status?.elapsed}'</span>
        ) : status?.short === 'FT' ? (
          <span className="badge badge-muted">FT</span>
        ) : (
          <span className="badge badge-sky">{fixture.fixture?.date?.split('T')[1]?.slice(0,5)}</span>
        )}
      </div>
      <div className="flex items-center gap-12" style={{ justifyContent: 'center' }}>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div className="text-white font-bold" style={{ fontSize: 15 }}>{home?.name}</div>
          {home?.winner && <div className="text-sm text-accent">Winner</div>}
        </div>
        <div style={{ textAlign: 'center', minWidth: 70 }}>
          {goals?.home !== null ? (
            <span className="font-bold text-white" style={{ fontSize: 22 }}>
              {goals.home} – {goals.away}
            </span>
          ) : (
            <span className="text-muted font-bold" style={{ fontSize: 18 }}>vs</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div className="text-white font-bold" style={{ fontSize: 15 }}>{away?.name}</div>
          {away?.winner && <div className="text-sm text-accent">Winner</div>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [liveMatches, setLiveMatches] = useState([]);
  const [todayMatches, setTodayMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [live, today, s, lg] = await Promise.all([
        getLiveMatches(),
        getTodayMatches(),
        getPostStats(),
        getActiveLeagues(),
      ]);
      setLiveMatches(live);
      setTodayMatches(today);
      setStats(s);
      setLeagues(lg);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const allMatches = [
    ...liveMatches,
    ...todayMatches.filter(t => !liveMatches.some(l => l.fixture?.id === t.fixture?.id)),
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p>{new Date().toDateString()} · {liveMatches.length} live now</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="dot dot-green" style={{ animation: 'pulse 2s infinite' }}></div>
          <span className="text-sm text-accent">Bot running</span>
        </div>
      </div>

      <div className="page">
        {/* Stats */}
        <div className="grid-4 mb-24">
          <div className="card">
            <div className="stat-label">Posts Today</div>
            <div className="stat-value text-accent">{stats?.postsToday ?? '—'}</div>
          </div>
          <div className="card">
            <div className="stat-label">Total Posts</div>
            <div className="stat-value">{stats?.totalPosts ?? '—'}</div>
          </div>
          <div className="card">
            <div className="stat-label">Live Matches</div>
            <div className="stat-value" style={{ color: 'var(--red)' }}>{liveMatches.length}</div>
          </div>
          <div className="card">
            <div className="stat-label">Active Leagues</div>
            <div className="stat-value" style={{ color: 'var(--sky)' }}>{leagues.length}</div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 24 }}>
          {/* Matches */}
          <div>
            <div className="section-title">
              {liveMatches.length > 0 ? 'Live & Today' : "Today's Matches"}
            </div>
            {loading && <p className="text-muted text-sm">Loading...</p>}
            {!loading && allMatches.length === 0 && (
              <div className="empty">
                <div className="empty-icon">📅</div>
                <p>No matches today. Add leagues to track.</p>
              </div>
            )}
            {allMatches.slice(0, 10).map((f) => (
              <MatchCard key={f.fixture?.id} fixture={f} />
            ))}
          </div>

          {/* Posts by type + channels */}
          <div>
            <div className="section-title">Posts Breakdown</div>
            <div className="card mb-16">
              {(!stats?.byType || stats.byType.length === 0) ? (
                <p className="text-muted text-sm">No posts yet.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byType.map((r) => (
                      <tr key={r.event_type}>
                        <td className="text-white" style={{ textTransform: 'capitalize' }}>{r.event_type}</td>
                        <td className="text-accent font-bold">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="section-title">Channel Activity</div>
            <div className="card">
              {(!stats?.byChannel || stats.byChannel.length === 0) ? (
                <p className="text-muted text-sm">No channels yet.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th>Platform</th>
                      <th>Posts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byChannel.map((c) => (
                      <tr key={c.name}>
                        <td className="text-white">{c.name}</td>
                        <td>
                          <span className={`badge ${c.platform === 'telegram' ? 'badge-sky' : 'badge-green'}`}>
                            {c.platform}
                          </span>
                        </td>
                        <td className="font-bold">{c.post_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
