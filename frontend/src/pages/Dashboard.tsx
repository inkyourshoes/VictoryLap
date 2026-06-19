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
  const { logout } = useAuth();

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
          {workouts.map((w) => (
            <li key={w.id}>
              <div className="flex-row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong style={{ color: 'var(--text)', fontSize: '1rem' }}>{w.title}</strong>
                  <span className="dim" style={{ marginLeft: 10 }}>
                    {new Date(w.performed_at).toLocaleDateString()} · {w.exercises.length} exercise{w.exercises.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button className="danger" onClick={() => handleDelete(w.id)} style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
