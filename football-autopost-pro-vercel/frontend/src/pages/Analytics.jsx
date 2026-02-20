import { useEffect, useState } from 'react';
import { getPosts, getPostStats, deletePost } from '../api';

const TYPE_EMOJI = {
  goal: '⚽',
  card: '🟨',
  fulltime: '🏁',
  lineup: '📋',
  substitution: '🔄',
  manual: '✍️',
};

function PostRow({ post, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        style={{ cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <td>
          <span>{TYPE_EMOJI[post.event_type] || '📝'}</span>{' '}
          <span className="text-white" style={{ textTransform: 'capitalize' }}>{post.event_type}</span>
        </td>
        <td>{post.channel_name}</td>
        <td>
          <span className={`badge ${post.platform === 'telegram' ? 'badge-sky' : 'badge-green'}`}>{post.platform}</span>
        </td>
        <td>
          <span className={`badge ${post.status === 'sent' ? 'badge-green' : 'badge-live'}`}>{post.status}</span>
        </td>
        <td className="text-muted text-sm">{new Date(post.sent_at).toLocaleString()}</td>
        <td>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--red)' }}
            onClick={e => { e.stopPropagation(); onDelete(post.id); }}
          >
            ✕
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} style={{ background: 'var(--surface2)', padding: '10px 14px' }}>
            <pre style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {post.message}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Analytics() {
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  async function load() {
    try {
      const [p, s] = await Promise.all([getPosts(100), getPostStats()]);
      setPosts(p);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('Remove this post from history?')) return;
    await deletePost(id);
    setPosts(p => p.filter(x => x.id !== id));
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.event_type === filter || p.status === filter);

  return (
    <>
      <div className="topbar">
        <div><h1>Analytics</h1><p>Post history and performance</p></div>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={load}>↻ Refresh</button>
      </div>

      <div className="page">
        {/* Stats */}
        <div className="grid-4 mb-24">
          <div className="card">
            <div className="stat-label">Today's Posts</div>
            <div className="stat-value text-accent">{stats?.postsToday ?? '—'}</div>
          </div>
          <div className="card">
            <div className="stat-label">Total Posts</div>
            <div className="stat-value">{stats?.totalPosts ?? '—'}</div>
          </div>
          <div className="card">
            <div className="stat-label">Goals Posted</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>
              {stats?.byType?.find(t => t.event_type === 'goal')?.count ?? 0}
            </div>
          </div>
          <div className="card">
            <div className="stat-label">Cards Posted</div>
            <div className="stat-value" style={{ color: 'var(--amber)' }}>
              {stats?.byType?.find(t => t.event_type === 'card')?.count ?? 0}
            </div>
          </div>
        </div>

        {/* Post history */}
        <div className="section-title">Post History</div>

        {/* Filter tabs */}
        <div className="flex gap-8 mb-16" style={{ flexWrap: 'wrap' }}>
          {['all', 'goal', 'card', 'fulltime', 'lineup', 'manual', 'failed'].map(f => (
            <button
              key={f}
              className="btn btn-ghost btn-sm"
              style={{
                background: filter === f ? 'var(--accent-dim)' : '',
                color: filter === f ? 'var(--accent)' : '',
                borderColor: filter === f ? 'var(--accent)' : '',
                textTransform: 'capitalize',
              }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : (TYPE_EMOJI[f] || '') + ' ' + f}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading && <p className="text-muted text-sm" style={{ padding: 18 }}>Loading...</p>}
          {!loading && filtered.length === 0 && (
            <div className="empty">
              <div className="empty-icon">📭</div>
              <p>No posts yet.</p>
            </div>
          )}
          {filtered.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Channel</th>
                  <th>Platform</th>
                  <th>Status</th>
                  <th>Sent At</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <PostRow key={p.id} post={p} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-sm text-muted mt-8">Click a row to expand the full message.</p>
      </div>
    </>
  );
}
