import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGroup, getGroupMessages, createGroupGoal, completeGroupGoal, uploadGroupAttachment } from '../api/groups';
import { useAuth } from '../context/AuthContext';
import type { GroupDetail, GroupGoal, GroupMessage } from '../types';

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [wsStatus, setWsStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!id) return;
    getGroup(id).then(setGroup).catch(console.error);
    getGroupMessages(id).then(setMessages).catch(console.error);
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Derive WebSocket base URL from VITE_API_URL (https → wss, http → ws)
  // Falls back to ws://localhost:8000 for local dev
  function getWsBase(): string {
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
    if (apiUrl) return apiUrl.replace(/^https/, 'wss').replace(/^http/, 'ws');
    return 'ws://localhost:8000';
  }

  // WebSocket connects directly to backend — Vite proxy doesn't support WS upgrades by default
  useEffect(() => {
    if (!id || !token) return;
    const ws = new WebSocket(`${getWsBase()}/groups/${id}/ws?token=${token}`);
    wsRef.current = ws;
    setWsStatus('connecting');

    ws.onopen = () => setWsStatus('open');
    ws.onclose = () => setWsStatus('closed');
    ws.onerror = () => setWsStatus('closed');

    ws.onmessage = (event) => {
      try {
        const msg: GroupMessage = JSON.parse(event.data);
        setMessages((prev) => [...prev, msg]);
      } catch {
        // ignore malformed message
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [id, token]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      const result = await uploadGroupAttachment(id, file);
      setPendingAttachment(result);
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!chatInput.trim() && !pendingAttachment) return;
    wsRef.current.send(JSON.stringify({
      content: chatInput.trim(),
      attachment_url: pendingAttachment?.url ?? null,
      attachment_type: pendingAttachment?.type ?? null,
    }));
    setChatInput('');
    setPendingAttachment(null);
  }

  async function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    const goal = await createGroupGoal(id, {
      title: goalTitle,
      description: goalDesc || undefined,
    });
    setGroup((prev) =>
      prev ? { ...prev, goals: [...prev.goals, goal] } : prev
    );
    setGoalTitle('');
    setGoalDesc('');
  }

  async function handleCompleteGoal(goalId: string) {
    if (!id) return;
    const updated = await completeGroupGoal(id, goalId);
    setGroup((prev) =>
      prev
        ? { ...prev, goals: prev.goals.map((g: GroupGoal) => (g.id === goalId ? updated : g)) }
        : prev
    );
  }

  function resolveAttachmentUrl(url: string): string {
    if (url.startsWith('http')) return url;
    const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';
    return `${apiUrl}${url}`;
  }

  if (!group) {
    return (
      <div className="page-container">
        <p className="dim">Loading crew...</p>
      </div>
    );
  }

  const inviteUrl = `${window.location.origin}/join/${group.invite_code}`;

  return (
    <div className="page-container">
      <div className="nav-bar">
        <h1>{group.name}</h1>
        <Link to="/groups"><button className="secondary">All Crews</button></Link>
      </div>

      <div className="card">
        <label>Invite Link — Share with your crew</label>
        <p style={{ wordBreak: 'break-all', margin: '6px 0 10px' }}>
          <a href={inviteUrl}>{inviteUrl}</a>
        </p>
        <button
          className="secondary"
          onClick={() => navigator.clipboard.writeText(inviteUrl)}
        >
          Copy Link
        </button>
      </div>

      {/* ── Goals ── */}
      <h2>Crew Goals</h2>
      <div className="card">
        <form onSubmit={handleCreateGoal}>
          <label>Goal Title</label>
          <input
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            placeholder="Deadlift 2× bodyweight"
            required
          />
          <label>Description</label>
          <textarea
            value={goalDesc}
            onChange={(e) => setGoalDesc(e.target.value)}
            placeholder="Optional details..."
            rows={2}
          />
          <button type="submit" style={{ marginTop: 10 }}>Post Goal</button>
        </form>
      </div>

      {group.goals.length === 0 ? (
        <p className="dim">No goals yet. Post the first one.</p>
      ) : (
        <ul>
          {group.goals.map((goal: GroupGoal) => (
            <li key={goal.id}>
              <div className="flex-row" style={{ justifyContent: 'space-between' }}>
                <span
                  style={{
                    textDecoration: goal.completed ? 'line-through' : 'none',
                    color: goal.completed ? 'var(--text-dim)' : 'var(--text)',
                  }}
                >
                  {goal.title}
                  {goal.description && (
                    <span className="dim"> — {goal.description}</span>
                  )}
                </span>
                {goal.completed ? (
                  <span className="dim" style={{ fontSize: '0.78rem' }}>DONE</span>
                ) : (
                  <button
                    onClick={() => handleCompleteGoal(goal.id)}
                    style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                  >
                    Done
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── Chat ── */}
      <h2>
        Crew Chat{' '}
        <span
          className="dim"
          style={{ fontSize: '0.7rem', verticalAlign: 'middle' }}
        >
          [{wsStatus === 'open' ? 'LIVE' : wsStatus === 'connecting' ? 'CONNECTING...' : 'OFFLINE'}]
        </span>
      </h2>

      <div
        className="card"
        style={{
          height: 320,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '12px 16px',
        }}
      >
        {messages.length === 0 && (
          <p className="dim" style={{ margin: 'auto 0' }}>No messages yet. Start the conversation.</p>
        )}
        {messages.map((m) => (
          <div key={m.id}>
            <span style={{ color: 'var(--accent-light)', fontWeight: 'bold' }}>{m.username}</span>
            <span className="dim" style={{ fontSize: '0.72rem', marginLeft: 6 }}>
              {new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {m.content && <div style={{ marginTop: 2 }}>{m.content}</div>}
            {m.attachment_url && m.attachment_type === 'image' && (
              <img
                src={`{resolveAttachmentUrl(m.attachment_url!)}`}
                alt="attachment"
                style={{ marginTop: 6, maxWidth: '100%', maxHeight: 320, display: 'block', cursor: 'pointer' }}
                onClick={() => window.open(`{resolveAttachmentUrl(m.attachment_url!)}`, '_blank')}
              />
            )}
            {m.attachment_url && m.attachment_type === 'video' && (
              <video
                src={`{resolveAttachmentUrl(m.attachment_url!)}`}
                controls
                style={{ marginTop: 6, maxWidth: '100%', maxHeight: 320, display: 'block' }}
              />
            )}
            {m.attachment_url && m.attachment_type === 'file' && (
              <a
                href={`{resolveAttachmentUrl(m.attachment_url!)}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-block', marginTop: 6, fontSize: '0.85rem' }}
              >
                Download attachment
              </a>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {pendingAttachment && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: '0.85rem', color: 'var(--accent-light)' }}>
          {pendingAttachment.type === 'image' && (
            <img src={`{resolveAttachmentUrl(pendingAttachment.url)}`} alt="preview" style={{ height: 48, objectFit: 'cover' }} />
          )}
          {pendingAttachment.type !== 'image' && <span>Attachment ready</span>}
          <button
            type="button"
            className="secondary"
            style={{ padding: '2px 10px', fontSize: '0.75rem' }}
            onClick={() => setPendingAttachment(null)}
          >
            Remove
          </button>
        </div>
      )}
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <button
          type="button"
          className="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={wsStatus !== 'open' || uploading}
          style={{ padding: '10px 14px', flexShrink: 0 }}
          title="Attach file"
        >
          {uploading ? '...' : '📎'}
        </button>
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder={wsStatus === 'open' ? 'Say something...' : 'Chat offline — backend not running'}
          disabled={wsStatus !== 'open'}
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={wsStatus !== 'open' || uploading}>Send</button>
      </form>
    </div>
  );
}
