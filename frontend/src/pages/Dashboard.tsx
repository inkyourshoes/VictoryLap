import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWorkouts, deleteWorkout } from '../api/workouts';
import type { Workout } from '../types';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const { logout } = useAuth();

  useEffect(() => {
    getWorkouts().then(setWorkouts).catch(console.error);
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
