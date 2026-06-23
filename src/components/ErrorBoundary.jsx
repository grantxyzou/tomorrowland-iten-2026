import { Component } from 'react';

// Catches render/lifecycle throws in the tab content so a single bad component
// shows a recoverable message instead of a blank white screen. Class component
// because error boundaries have no hooks equivalent.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface it in the console for debugging; no remote logging set up.
    console.error('Tab crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" style={{
          maxWidth: 520, margin: '40px auto', padding: '24px 20px', textAlign: 'center',
          fontFamily: '"Space Grotesk", -apple-system, system-ui, sans-serif',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>😵‍💫</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Something broke here.</h2>
          <p style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.8, margin: '0 0 20px' }}>
            This part of the planner hit an error. Reloading usually fixes it — your picks are saved.
          </p>
          <button onClick={() => window.location.reload()}
            style={{ minHeight: 44, padding: '0 20px', borderRadius: 8, border: 'none', backgroundColor: '#1a1614', color: '#ede7d8', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
