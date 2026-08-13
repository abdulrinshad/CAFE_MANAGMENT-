import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught React Rendering Error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          maxWidth: 600,
          margin: '40px auto',
          background: '#fff',
          border: '1px solid #fee2e2',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 22, color: '#991b1b', marginBottom: 8 }}>Something went wrong on this page.</h2>
          <p style={{ color: '#4b5563', fontSize: 14, marginBottom: 20 }}>
            {this.state.error ? this.state.error.toString() : 'An unexpected error occurred.'}
          </p>
          {this.state.errorInfo && (
            <details style={{ textAlign: 'left', background: '#fef2f2', padding: 12, borderRadius: 6, fontSize: 12, overflowX: 'auto', marginBottom: 20, color: '#7f1d1d' }}>
              {this.state.errorInfo.componentStack}
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1f2937',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
