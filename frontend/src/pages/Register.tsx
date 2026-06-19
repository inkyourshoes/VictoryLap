import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, login } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { INVITE_CODE_KEY } from './JoinGroup';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, username, password);
      const token = await login(email, password);
      setToken(token);
      const pendingCode = localStorage.getItem(INVITE_CODE_KEY);
      localStorage.removeItem(INVITE_CODE_KEY);
      navigate(pendingCode ? `/join/${pendingCode}` : '/');
    } catch {
      setError('Registration failed. Email or username may already be taken.');
      setLoading(false);
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 480 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '4rem', letterSpacing: '0.08em', marginBottom: 12, borderBottom: 'none', paddingBottom: 0 }}>
          VICTORY LAP
        </h1>
        <p style={{ color: 'var(--accent-light)', fontSize: '1.1rem', fontStyle: 'italic', marginBottom: 16 }}>
          Train together. Grow together. Win together.
        </p>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.7, maxWidth: 380, margin: '0 auto 24px' }}>
          Every goal deserves a finish line. Join friends, track your workouts,
          document your progress, and earn your Victory Lap together.
        </p>
      </div>
      <h2 style={{ textAlign: 'center', marginBottom: 16 }}>Enlist</h2>
      <div className="card">
        {error && <p className="error-text">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading} style={{ marginTop: 16, width: '100%' }}>
            {loading ? 'Enlisting...' : 'Enlist'}
          </button>
        </form>
      </div>
      <p>Already enlisted? <Link to="/login">Log in</Link></p>
    </div>
  );
}
