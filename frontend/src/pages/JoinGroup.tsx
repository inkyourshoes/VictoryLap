import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getGroupByInviteCode, joinGroupByCode } from '../api/groups';
import { useAuth } from '../context/AuthContext';
import type { Group } from '../types';

export const INVITE_CODE_KEY = 'pending_invite_code';

export default function JoinGroup() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteCode) return;
    getGroupByInviteCode(inviteCode)
      .then(setGroup)
      .catch(() => setError('Invalid or expired invite link.'));
  }, [inviteCode]);

  async function handleJoin() {
    if (!inviteCode) return;
    if (!token) {
      localStorage.setItem(INVITE_CODE_KEY, inviteCode);
      navigate('/register');
      return;
    }
    setLoading(true);
    try {
      const joined = await joinGroupByCode(inviteCode);
      navigate(`/groups/${joined.id}`);
    } catch {
      setError('Failed to join crew. You may already be a member.');
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="page-container">
        <h1>Invalid Invite</h1>
        <p className="error-text">{error}</p>
        <Link to="/">Go Home</Link>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="page-container">
        <p className="dim">Loading invite...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Join Crew</h1>
      <div className="card">
        <h2>{group.name}</h2>
        <p>You have been invited to join this crew.</p>
        {!token && (
          <p className="dim">
            No account? You will be redirected to register first — your invite will be saved.
          </p>
        )}
        <button onClick={handleJoin} disabled={loading} style={{ marginTop: 10 }}>
          {loading
            ? 'Joining...'
            : token
            ? 'Join Crew'
            : 'Register and Join'}
        </button>
      </div>
    </div>
  );
}
