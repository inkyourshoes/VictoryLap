import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listMyGroups, createGroup } from '../api/groups';
import type { Group } from '../types';

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    listMyGroups().then(setGroups).catch(console.error);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const group = await createGroup(newName.trim());
      navigate(`/groups/${group.id}`);
    } catch {
      setError('Failed to found crew. Try again.');
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="nav-bar">
        <h1>My Crews</h1>
        <Link to="/"><button className="secondary">Back to Yard</button></Link>
      </div>

      <div className="card">
        <h2>Found a New Crew</h2>
        <form onSubmit={handleCreate}>
          <label>Crew Name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Iron Yard Crew"
            required
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={loading} style={{ marginTop: 14 }}>
            {loading ? 'Founding...' : 'Found Crew'}
          </button>
        </form>
      </div>

      {groups.length === 0 ? (
        <p className="dim">No crews yet. Found one or join via an invite link.</p>
      ) : (
        <ul>
          {groups.map((g) => (
            <li key={g.id}>
              <div className="flex-row" style={{ justifyContent: 'space-between' }}>
                <Link to={`/groups/${g.id}`}>
                  <strong style={{ color: 'var(--rust-light)', fontSize: '1rem' }}>{g.name}</strong>
                </Link>
                <span className="dim">Code: {g.invite_code}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
