import { useEffect, useState } from 'react';
import { getChannels, createChannel, updateChannel, deleteChannel, getActiveLeagues, addLeague, removeLeague, searchLeagues } from '../api';

function ChannelRow({ channel, onToggle, onDelete }) {
  return (
    <tr>
      <td>
        <div className="text-white font-bold">{channel.name}</div>
        <div className="text-sm text-muted">{channel.chat_id}</div>
      </td>
      <td>
        <span className={`badge ${channel.platform === 'telegram' ? 'badge-sky' : 'badge-green'}`}>
          {channel.platform}
        </span>
      </td>
      <td>
        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          {channel.post_goals ? <span className="badge badge-green">⚽ Goals</span> : null}
          {channel.post_cards ? <span className="badge badge-muted">🟨 Cards</span> : null}
          {channel.post_lineups ? <span className="badge badge-muted">📋 Lineups</span> : null}
          {channel.post_fulltime ? <span className="badge badge-muted">🏁 FT</span> : null}
          {channel.post_subs ? <span className="badge badge-muted">🔄 Subs</span> : null}
        </div>
      </td>
      <td>
        <div className="text-sm text-muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {channel.affiliate_link || '—'}
        </div>
      </td>
      <td>
        <button
          className={`toggle ${channel.active ? 'on' : ''}`}
          onClick={() => onToggle(channel)}
          title={channel.active ? 'Disable' : 'Enable'}
        />
      </td>
      <td>
        <button className="btn btn-ghost btn-sm" onClick={() => onDelete(channel.id)} style={{ color: 'var(--red)' }}>
          Delete
        </button>
      </td>
    </tr>
  );
}

function AddChannelModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    name: '',
    platform: 'telegram',
    chat_id: '',
    affiliate_link: '',
    post_goals: true,
    post_cards: true,
    post_lineups: true,
    post_fulltime: true,
    post_subs: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        post_goals: form.post_goals ? 1 : 0,
        post_cards: form.post_cards ? 1 : 0,
        post_lineups: form.post_lineups ? 1 : 0,
        post_fulltime: form.post_fulltime ? 1 : 0,
        post_subs: form.post_subs ? 1 : 0,
      };
      const ch = await createChannel(payload);
      onAdded(ch);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  };

  const modalStyle = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 10, padding: 28, width: 480, maxHeight: '90vh', overflowY: 'auto',
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <div className="flex items-center justify-between mb-16">
          <h2 className="text-white font-bold" style={{ fontSize: 17 }}>Add Channel</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="label">Channel Name</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Premier League Updates" required />
          </div>

          <div className="form-group">
            <label className="label">Platform</label>
            <select className="select" value={form.platform} onChange={e => set('platform', e.target.value)}>
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">
              {form.platform === 'telegram' ? 'Chat ID or @username' : 'Phone Number (with country code)'}
            </label>
            <input
              className="input"
              value={form.chat_id}
              onChange={e => set('chat_id', e.target.value)}
              placeholder={form.platform === 'telegram' ? '@mychannel or -1001234567890' : '+2637xxxxxxxx'}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Affiliate Link (optional)</label>
            <input className="input" value={form.affiliate_link} onChange={e => set('affiliate_link', e.target.value)} placeholder="https://betway.com/ref/yourcode" />
          </div>

          <div className="divider" />

          <div className="section-title" style={{ fontSize: 13, marginBottom: 10 }}>Post Types</div>
          {[
            ['post_goals', '⚽ Goals'],
            ['post_cards', '🟨 Cards'],
            ['post_lineups', '📋 Lineups'],
            ['post_fulltime', '🏁 Full Time'],
            ['post_subs', '🔄 Substitutions'],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center justify-between mb-8">
              <span style={{ fontSize: 13 }}>{label}</span>
              <button type="button" className={`toggle ${form[key] ? 'on' : ''}`} onClick={() => set(key, !form[key])} />
            </div>
          ))}

          <div className="mt-24 flex gap-8" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Add Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeaguesPanel() {
  const [leagues, setLeagues] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => { getActiveLeagues().then(setLeagues); }, []);

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await searchLeagues(query);
      setResults(res.slice(0, 8));
    } finally {
      setSearching(false);
    }
  }

  async function add(league) {
    try {
      await addLeague({ league_id: league.league.id, name: league.league.name, country: league.country.name });
      const updated = await getActiveLeagues();
      setLeagues(updated);
      setResults([]);
      setQuery('');
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  }

  async function remove(id) {
    if (!confirm('Remove this league?')) return;
    await removeLeague(id);
    setLeagues(l => l.filter(x => x.id !== id));
  }

  return (
    <div className="card">
      <div className="section-title">Tracked Leagues</div>
      <div className="flex gap-8 mb-16">
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder="Search league name..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button className="btn btn-primary" onClick={search} disabled={searching}>
          {searching ? '...' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="card mb-16" style={{ background: 'var(--surface2)', maxHeight: 200, overflowY: 'auto' }}>
          {results.map((r) => (
            <div key={r.league.id} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="text-white" style={{ fontSize: 13 }}>{r.league.name}</div>
                <div className="text-sm text-muted">{r.country?.name}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => add(r)}>+ Add</button>
            </div>
          ))}
        </div>
      )}

      {leagues.length === 0 ? (
        <p className="text-muted text-sm">No leagues tracked. Search and add one above.</p>
      ) : (
        leagues.map((l) => (
          <div key={l.id} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div className="text-white" style={{ fontSize: 13 }}>{l.name}</div>
              <div className="text-sm text-muted">{l.country}</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => remove(l.id)}>Remove</button>
          </div>
        ))
      )}
    </div>
  );
}

export default function Channels() {
  const [channels, setChannels] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const ch = await getChannels();
      setChannels(ch);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(channel) {
    const updated = await updateChannel(channel.id, { active: channel.active ? 0 : 1 });
    setChannels(cs => cs.map(c => c.id === channel.id ? updated : c));
  }

  async function handleDelete(id) {
    if (!confirm('Delete this channel?')) return;
    await deleteChannel(id);
    setChannels(cs => cs.filter(c => c.id !== id));
  }

  return (
    <>
      <div className="topbar">
        <div><h1>Channels</h1><p>Manage Telegram & WhatsApp channels</p></div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowModal(true)}>
          + Add Channel
        </button>
      </div>

      <div className="page">
        <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
          <div>
            <div className="section-title">Connected Channels</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {loading && <p className="text-muted text-sm" style={{ padding: 18 }}>Loading...</p>}
              {!loading && channels.length === 0 && (
                <div className="empty">
                  <div className="empty-icon">📡</div>
                  <p>No channels yet. Add one to start posting.</p>
                </div>
              )}
              {channels.length > 0 && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th>Platform</th>
                      <th>Posts</th>
                      <th>Affiliate</th>
                      <th>Active</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map(ch => (
                      <ChannelRow key={ch.id} channel={ch} onToggle={handleToggle} onDelete={handleDelete} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <LeaguesPanel />
        </div>
      </div>

      {showModal && (
        <AddChannelModal
          onClose={() => setShowModal(false)}
          onAdded={(ch) => { setChannels(c => [ch, ...c]); setShowModal(false); }}
        />
      )}
    </>
  );
}
