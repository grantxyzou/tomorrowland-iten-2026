const mono = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };
const sans = { fontFamily: '"Inter", system-ui, sans-serif' };

const ink   = '#1a1614';
const muted = '#5c544c';
const paper = '#ede7d8';
const rule  = '#cabda4';

const h2Style = { ...sans, fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: ink };
const pStyle  = { ...sans, fontSize: 14, lineHeight: 1.65, color: muted, margin: '0 0 24px' };

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: paper, color: ink }}>
      <header style={{ backgroundColor: ink, color: paper, padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top))' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#938b81' }}>
            Tomorrowland 2026
          </div>
          <a href="/" style={{ ...mono, fontSize: 11, color: '#938b81', textDecoration: 'none', letterSpacing: '0.1em' }}>← Back</a>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px 80px' }}>
        <h1 style={{ ...sans, fontSize: 26, fontWeight: 700, margin: '0 0 6px', color: ink }}>Privacy Policy</h1>
        <p style={{ ...mono, fontSize: 11, color: muted, letterSpacing: '0.1em', marginBottom: 32 }}>Effective January 2026</p>

        <div style={{ borderBottom: `1px solid ${rule}`, marginBottom: 28 }} />

        <h2 style={h2Style}>What we collect</h2>
        <p style={pStyle}>
          When you sign in with Google, we receive your email address, display name, and email verification status from Google.
          Within the app, we store the display name and colour you choose for each crew, the sets you pick,
          any status messages you post, and location pins you voluntarily share.
        </p>

        <h2 style={h2Style}>How it's stored</h2>
        <p style={pStyle}>
          All data lives in Upstash Redis, hosted in the EU.
          Your sign-in session is a signed cookie stored only in your browser — no session tokens are persisted server-side.
          Status messages and location pins expire automatically after 4 hours.
          Pick data persists until you leave a crew or delete your account.
        </p>

        <h2 style={h2Style}>Who can see your data</h2>
        <p style={pStyle}>
          Only members of your crew can see your picks, status messages, and location pins.
          A crew is a private group — you join by invite code only. No data is public or searchable.
        </p>

        <h2 style={h2Style}>Deleting your data</h2>
        <p style={pStyle}>
          You can delete your account at any time from the settings menu (tap ⚙ in the app header).
          Deleting removes your picks, status, location, and membership from every crew you belong to, immediately and permanently.
          You can also leave individual crews from the same settings menu without deleting your full account.
        </p>

        <h2 style={h2Style}>Analytics</h2>
        <p style={pStyle}>
          We use Vercel Web Analytics, which collects anonymised, aggregated page view data (country, browser type, referrer).
          No personal identifiers are included. See Vercel's privacy policy for details.
        </p>

        <h2 style={h2Style}>Third parties</h2>
        <p style={pStyle}>
          Sign-in is handled by Google (Google Identity Services). Google's privacy policy governs what Google does with your data.
          We only receive your email, name, and email-verified flag from Google — we do not receive a Google refresh token
          or ongoing access to your Google account.
        </p>

        <h2 style={h2Style}>Contact</h2>
        <p style={{ ...sans, fontSize: 14, lineHeight: 1.65, color: muted, margin: 0 }}>
          Questions about your data? Reach the crew through the group chat. This app is a private trip planner,
          not a commercial service.
        </p>
      </main>
    </div>
  );
}
