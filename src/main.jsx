import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../GENyxOperatorDashboard.jsx'

class GlobalErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background:'#fff', color:'#111', padding:24, fontFamily:'monospace', fontSize:13, lineHeight:1.5 }}>
          <h2 style={{ color:'#dc2626', marginBottom:12 }}>⚠️ Error de inicialización</h2>
          <pre style={{ whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <GlobalErrorBoundary><App /></GlobalErrorBoundary>
)
