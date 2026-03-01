import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error('React Error:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', padding: 24 }}>
                    <div style={{ maxWidth: 480, textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
                        <h2 style={{ marginBottom: 12, color: '#0F172A' }}>Something went wrong</h2>
                        <p style={{ color: '#475569', marginBottom: 20 }}>{this.state.error?.message}</p>
                        <button onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
                            style={{ padding: '10px 24px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: '0.9rem' }}>
                            Go home
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
