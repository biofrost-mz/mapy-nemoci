import { Component } from 'react'

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App crashed:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleTryAgain = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#f7f9f4',
        padding: '24px',
        fontFamily: "'Saira', Arial, sans-serif",
      }}
      >
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #dbe8ca',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          padding: '18px 20px',
          maxWidth: '520px',
          width: '100%',
          color: '#3c3c3c',
        }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', color: '#006778' }}>Aplikace narazila na chybu</h2>
          <p style={{ marginTop: '8px', marginBottom: '14px', lineHeight: 1.5 }}>
            Data zůstala uložená. Můžete zkusit obnovit aplikaci nebo pokračovat bez reloadu.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleTryAgain}
              style={{
                border: '1px solid #c5d9ac',
                background: '#fff',
                color: '#006778',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Zkusit pokračovat
            </button>
            <button
              onClick={this.handleReload}
              style={{
                border: 'none',
                background: '#78be20',
                color: '#fff',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Obnovit stránku
            </button>
          </div>
        </div>
      </div>
    )
  }
}
