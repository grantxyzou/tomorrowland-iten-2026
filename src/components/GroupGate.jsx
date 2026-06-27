import { useState, useEffect } from 'react';
import { useGroup } from '../groups/GroupContext.jsx';
import { apiFetch } from '../lib/api.js';

const PALETTE = [
  '#e9b949', '#8fb6ff', '#e23b3b', '#4ECDC4', '#96CEB4',
  '#DDA0DD', '#F7DC6F', '#BB8FCE', '#85C1E9', '#98D8C8',
];

const mono = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };
const sans = { fontFamily: '"Inter", system-ui, sans-serif' };

const paper  = '#ede7d8';
const ink    = '#1a1614';
const muted  = '#5c544c';
const accent = '#a82a13';
const rule   = '#cabda4';
const field  = '#f5efde';

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {PALETTE.map(c => (
        <button
          key={c}
          type="button"
          aria-label={`Color ${c}`}
          aria-pressed={c === value}
          onClick={() => onChange(c)}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            backgroundColor: c, padding: 0, cursor: 'pointer',
            border: c === value ? `3px solid ${ink}` : '3px solid transparent',
            boxShadow: c === value ? `0 0 0 2px ${c}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

function inputStyle(override = {}) {
  return {
    minHeight: 48, borderRadius: 10, border: `1.5px solid ${rule}`,
    padding: '0 14px', ...sans, fontSize: 15,
    backgroundColor: field, color: ink, outline: 'none',
    ...override,
  };
}

function labelWrap(label, input) {
  return (
    <label style={{ ...sans, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
      {input}
    </label>
  );
}

export default function GroupGate({ children }) {
  const { groups, loading, setActiveGroupId, refetchGroups, joinTrigger } = useGroup();

  // Detect /join/CODE in the URL on mount only.
  const [urlCode] = useState(() => {
    const m = window.location.pathname.match(/^\/join\/([A-Fa-f0-9]{8})$/i);
    return m ? m[1].toUpperCase() : null;
  });

  const [mode, setMode] = useState(null); // null | 'landing' | 'create' | 'join'
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);

  // Create-crew form
  const [crewName,     setCrewName]     = useState('');
  const [displayName,  setDisplayName]  = useState('');
  const [color,        setColor]        = useState(PALETTE[0]);

  // Join-crew form
  const [joinCode,    setJoinCode]    = useState('');
  const [joinDisplay, setJoinDisplay] = useState('');
  const [joinColor,   setJoinColor]   = useState(PALETTE[0]);

  useEffect(() => {
    if (loading) return;
    if (urlCode) {
      setJoinCode(urlCode);
      setMode('join');
    } else if (groups.length === 0) {
      setMode('landing');
    }
    // If groups.length > 0 and no urlCode, mode stays null → render children.
  }, [loading, groups.length, urlCode]);

  // requestJoinFlow() from GroupContext bumps joinTrigger → enter join mode.
  useEffect(() => {
    if (joinTrigger > 0 && !loading) setMode('join');
  }, [joinTrigger, loading]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!crewName.trim() || !displayName.trim()) return;
    setBusy(true); setErr('');
    try {
      const res = await apiFetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name: crewName.trim(), displayName: displayName.trim(), color }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Could not create crew'); return; }
      await refetchGroups();
      setActiveGroupId(data.gid);
      setMode(null);
    } catch {
      setErr('Network error — try again');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code || !joinDisplay.trim()) return;
    setBusy(true); setErr('');
    try {
      const res = await apiFetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', code, displayName: joinDisplay.trim(), color: joinColor }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Invalid code or already a member'); return; }
      await refetchGroups();
      setActiveGroupId(data.gid);
      if (urlCode) window.history.replaceState(null, '', '/');
      setMode(null);
    } catch {
      setErr('Network error — try again');
    } finally {
      setBusy(false);
    }
  }

  // Brief loading state while groups are fetched.
  if (loading) return null;

  // User has groups and no join-URL → render the app normally.
  if (mode === null && groups.length > 0) return children;

  const hasGroups = groups.length > 0;

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: paper, color: ink, display: 'flex', flexDirection: 'column' }}>
      <header style={{ backgroundColor: ink, color: paper, padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top))' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#938b81' }}>Europe 2026</div>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', marginTop: 2 }}>Tomorrowland Crew Planner</div>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '40px 16px 64px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {mode === 'landing' && (
            <>
              <h2 style={{ ...sans, fontSize: 24, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>Your crew</h2>
              <p style={{ ...sans, fontSize: 14, color: muted, marginBottom: 28, lineHeight: 1.5 }}>
                Create a crew to share picks with friends, or join one using an invite code.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button onClick={() => setMode('create')}
                  style={{ minHeight: 52, borderRadius: 14, border: 'none', backgroundColor: accent, color: '#fff', ...sans, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                  Create a crew
                </button>
                <button onClick={() => setMode('join')}
                  style={{ minHeight: 52, borderRadius: 14, border: `2px solid ${accent}`, backgroundColor: 'transparent', color: accent, ...sans, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                  Join with a code
                </button>
              </div>
            </>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ ...sans, fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Create a crew</h2>

              {labelWrap('Crew name',
                <input value={crewName} onChange={e => setCrewName(e.target.value)}
                  maxLength={40} required placeholder="e.g. The Budhole"
                  style={inputStyle()} />
              )}

              {labelWrap('Your name in the crew',
                <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                  maxLength={20} required placeholder="e.g. Grant"
                  style={inputStyle()} />
              )}

              <div style={{ ...sans, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your colour</span>
                <ColorPicker value={color} onChange={setColor} />
              </div>

              {err && <p style={{ color: '#e23b3b', ...sans, fontSize: 13, margin: 0 }}>{err}</p>}

              <button type="submit"
                disabled={busy || !crewName.trim() || !displayName.trim()}
                style={{ minHeight: 52, borderRadius: 14, border: 'none', backgroundColor: accent, color: '#fff', ...sans, fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: (busy || !crewName.trim() || !displayName.trim()) ? 0.55 : 1 }}>
                {busy ? 'Creating…' : 'Create crew'}
              </button>

              <button type="button" onClick={() => setMode('landing')}
                style={{ minHeight: 44, border: 'none', background: 'none', color: muted, ...sans, fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}>
                Back
              </button>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ ...sans, fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Join a crew</h2>

              {labelWrap('Invite code',
                <input value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={8} required readOnly={!!urlCode}
                  placeholder="8-character code"
                  style={inputStyle({ ...mono, fontSize: 20, letterSpacing: '0.2em', backgroundColor: urlCode ? paper : field })} />
              )}

              {labelWrap('Your name in the crew',
                <input value={joinDisplay} onChange={e => setJoinDisplay(e.target.value)}
                  maxLength={20} required autoFocus={!urlCode}
                  placeholder="e.g. Grant"
                  style={inputStyle()} />
              )}

              <div style={{ ...sans, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your colour</span>
                <ColorPicker value={joinColor} onChange={setJoinColor} />
              </div>

              {err && <p style={{ color: '#e23b3b', ...sans, fontSize: 13, margin: 0 }}>{err}</p>}

              <button type="submit"
                disabled={busy || !joinCode.trim() || !joinDisplay.trim()}
                style={{ minHeight: 52, borderRadius: 14, border: 'none', backgroundColor: accent, color: '#fff', ...sans, fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: (busy || !joinCode.trim() || !joinDisplay.trim()) ? 0.55 : 1 }}>
                {busy ? 'Joining…' : 'Join crew'}
              </button>

              {hasGroups
                ? <button type="button" onClick={() => setMode(null)}
                    style={{ minHeight: 44, border: 'none', background: 'none', color: muted, ...sans, fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}>
                    Cancel
                  </button>
                : !urlCode && (
                  <button type="button" onClick={() => setMode('landing')}
                    style={{ minHeight: 44, border: 'none', background: 'none', color: muted, ...sans, fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}>
                    Back
                  </button>
                )
              }
            </form>
          )}

        </div>
      </main>
    </div>
  );
}
