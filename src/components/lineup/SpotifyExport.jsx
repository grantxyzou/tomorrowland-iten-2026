import { useState, useMemo } from 'react';
import { SpotifyLogo, Check } from '@phosphor-icons/react';
import { mono, sans, ink, muted, rule, paper, tmrwBg, spotifyDot, spotifyInk } from './theme.js';

// ── Spotify prompt ───────────────────────────────────────────
// Builds a STATIC text prompt (no AI, no API) from a person's picks. The user
// copies it and pastes it into Spotify's AI Playlist box in the mobile app.

// Real, playable artist names: deduped, TBA placeholders dropped, sorted.
function artistNames(mySets) {
  return [...new Set(mySets.filter(s => s.status !== 'deleted').map(s => s.name))]
    .filter(n => !/^to be announced$/i.test(n.trim()))
    .sort((a, b) => a.localeCompare(b));
}

function buildSpotifyPrompt(mySets, stage) {
  const scope = stage ? `from the ${stage} stage ` : '';
  return (
    `Make me a Tomorrowland 2026 playlist ${scope}featuring these artists, with 1–2 of each artist's most popular tracks. ` +
    `Order it to build energy from a warm-up to peak time. Genre: electronic / dance / festival. ` +
    `If an artist is a B2B or F2F pairing, include tracks from each name; skip anyone you can't find.\n\n` +
    `Artists: ${artistNames(mySets).join(', ')}.`
  );
}

// Returns true only if the text actually made it to the clipboard.
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

// Shared copy state + handler for both Spotify prompt UIs. Only confirms on a
// real copy; on failure it nudges the user to the Preview text instead.
function usePromptCopy(prompt, onCopied, successMsg) {
  const [copied, setCopied]     = useState(false);
  const [showText, setShowText] = useState(false);
  async function copy() {
    const ok = await copyToClipboard(prompt);
    if (!ok) {
      setShowText(true);
      onCopied?.('Couldn’t copy — select the text below');
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopied?.(successMsg);
  }
  return { copied, showText, setShowText, copy };
}

export default function SpotifyExport({ person, mySets, onCopied }) {
  const count  = useMemo(() => artistNames(mySets).length, [mySets]);
  const prompt = useMemo(() => buildSpotifyPrompt(mySets), [mySets]);
  const { copied, showText, setShowText, copy } = usePromptCopy(prompt, onCopied, `Copied ${person}'s Spotify prompt`);

  if (!count) return null; // nothing playable (e.g. only TBA slots picked)

  return (
    <section style={{ marginTop: 28, border: `1px solid ${rule}`, borderRadius: 10, padding: 14, backgroundColor: paper }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <SpotifyLogo aria-hidden="true" size={16} weight="fill" color={spotifyDot} />
        <span style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Spotify playlist</span>
      </div>
      <p style={{ fontSize: 14, color: ink, lineHeight: 1.45, margin: '0 0 12px' }}>
        Build a playlist from <strong>{person}'s {count}</strong> artist{count === 1 ? '' : 's'}. Copy the prompt, then paste it into Spotify's AI Playlist (Premium, in the mobile app).
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={copy}
          style={{ minHeight: 44, padding: '0 18px', border: 'none', borderRadius: 8, backgroundColor: spotifyInk, color: '#fff', ...sans, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {copied ? <><Check size={15} weight="bold" /> Copied</> : 'Copy prompt'}
        </button>
        <button onClick={() => setShowText(s => !s)} aria-expanded={showText}
          style={{ minHeight: 44, padding: '0 14px', border: `1px solid ${rule}`, borderRadius: 8, background: 'none', color: ink, ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
          {showText ? 'Hide' : 'Preview'}
        </button>
      </div>
      {showText && (
        <textarea readOnly value={prompt} aria-label="Spotify playlist prompt"
          style={{ marginTop: 12, width: '100%', boxSizing: 'border-box', minHeight: 130, padding: 12, borderRadius: 8, border: `1px solid ${rule}`, backgroundColor: tmrwBg, color: ink, fontSize: 16, ...sans, lineHeight: 1.45, resize: 'vertical' }} />
      )}
    </section>
  );
}

// Compact, per-stage variant — lives in the foot of each open stage accordion.
export function StageSpotify({ stage, pickedSets, onCopied }) {
  const n = useMemo(() => artistNames(pickedSets).length, [pickedSets]);
  const prompt = useMemo(() => buildSpotifyPrompt(pickedSets, stage), [pickedSets, stage]);
  const { copied, showText, setShowText, copy } = usePromptCopy(prompt, onCopied, `Copied ${stage} Spotify prompt`);

  if (!n) return null; // only TBA slots picked here — nothing to build

  return (
    <div style={{ borderTop: `1px solid ${rule}`, padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <SpotifyLogo aria-hidden="true" size={14} weight="fill" color={spotifyDot} />
        <span style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.12em', textTransform: 'uppercase', flex: 1, minWidth: 110 }}>
          {stage} playlist · {n} artist{n === 1 ? '' : 's'}
        </span>
        <button onClick={copy}
          style={{ minHeight: 40, padding: '0 14px', border: 'none', borderRadius: 8, backgroundColor: spotifyInk, color: '#fff', ...sans, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {copied ? <><Check size={13} weight="bold" /> Copied</> : 'Copy prompt'}
        </button>
        <button onClick={() => setShowText(s => !s)} aria-expanded={showText}
          style={{ minHeight: 40, padding: '0 10px', border: `1px solid ${rule}`, borderRadius: 8, background: 'none', color: ink, ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
          {showText ? 'Hide' : 'Preview'}
        </button>
      </div>
      {showText && (
        <textarea readOnly value={prompt} aria-label={`Spotify playlist prompt for ${stage}`}
          style={{ marginTop: 10, width: '100%', boxSizing: 'border-box', minHeight: 110, padding: 10, borderRadius: 8, border: `1px solid ${rule}`, backgroundColor: tmrwBg, color: ink, fontSize: 16, ...sans, lineHeight: 1.45, resize: 'vertical' }} />
      )}
    </div>
  );
}
