import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWorkouts, deleteWorkout } from '../api/workouts';
import { getFeed } from '../api/feed';
import type { Workout, FeedItem } from '../types';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { logout } = useAuth();

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  useEffect(() => {
    getWorkouts().then(setWorkouts).catch(console.error);
    getFeed()
      .then(setFeed)
      .catch(console.error)
      .finally(() => setFeedLoading(false));
  }, []);

  async function handleDelete(id: string) {
    await deleteWorkout(id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }

  return (
    <div className="page-container">
      <div className="nav-bar">
        <h1>The Yard</h1>
        <div className="flex-row">
          <Link to="/groups"><button className="secondary">My Crews</button></Link>
          <Link to="/workouts/new"><button>+ Log Workout</button></Link>
          <button className="danger" onClick={logout}>Log Out</button>
        </div>
      </div>

      {/* ── Victory Feed ── */}
      <h2 style={{ marginTop: 32 }}>Victory Feed</h2>
      {feedLoading ? (
        <p className="dim">Loading today's feed...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 32 }}>
          {feed.map((item) => (
            <div key={item.entry_type} className="card" style={{ margin: 0 }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-light)', marginBottom: 6 }}>
                {item.label}
              </div>
              <div style={{ fontWeight: 'bold', color: 'var(--text)', marginBottom: 8, fontSize: '1rem' }}>
                {item.title}
              </div>
              <p className="dim" style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                {item.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Workouts ── */}
      <h2>My Workouts</h2>
      {workouts.length === 0 ? (
        <p className="dim">No workouts yet. Hit the yard.</p>
      ) : (
        <ul>
          {workouts.map((w) => {
            const expanded = expandedId === w.id;
            return (
              <li key={w.id}>
                <div className="flex-row" style={{ justifyContent: 'space-between' }}>
                  <div
                    onClick={() => toggleExpanded(w.id)}
                    style={{ cursor: 'pointer', flex: 1 }}
                    role="button"
                    aria-expanded={expanded}
                  >
                    <span className="dim" style={{ marginRight: 8 }}>{expanded ? '▾' : '▸'}</span>
                    <strong style={{ color: 'var(--text)', fontSize: '1rem' }}>{w.title}</strong>
                    <span className="dim" style={{ marginLeft: 10 }}>
                      {new Date(w.performed_at).toLocaleDateString()} · {w.exercises.length} exercise{w.exercises.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button className="danger" onClick={() => handleDelete(w.id)} style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                    Delete
                  </button>
                </div>

                {expanded && (
                  <div style={{ marginTop: 10, paddingLeft: 18 }}>
                    {w.notes && <p className="dim" style={{ marginTop: 0, fontStyle: 'italic' }}>{w.notes}</p>}
                    {w.exercises.length === 0 ? (
                      <p className="dim">No exercises logged.</p>
                    ) : (
                      [...w.exercises]
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((ex) => (
                          <div key={ex.id} style={{ marginBottom: 12 }}>
                            <strong style={{ color: 'var(--text)' }}>{ex.name}</strong>
                            <table style={{ marginTop: 4 }}>
                              <thead>
                                <tr><th>Set</th><th>Reps</th><th>Weight (kg)</th></tr>
                              </thead>
                              <tbody>
                                {[...ex.sets]
                                  .sort((a, b) => a.set_number - b.set_number)
                                  .map((s) => (
                                    <tr key={s.id}>
                                      <td>{s.set_number}</td>
                                      <td>{s.reps ?? '—'}</td>
                                      <td>{s.weight_kg ?? '—'}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
