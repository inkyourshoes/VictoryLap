import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = await login(email, password);
      setToken(token);
      navigate('/');
    } catch {
      setError('Invalid email or password.');
      setLoading(false);
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 420 }}>
      <h1>Enter the Yard</h1>
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
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading} style={{ marginTop: 16, width: '100%' }}>
            {loading ? 'Entering...' : 'Enter'}
          </button>
        </form>
      </div>
      <p>No account? <Link to="/register">Enlist</Link></p>
    </div>
  );
}
