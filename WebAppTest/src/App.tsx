import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Pages/Dashboard';
import Cards from './Pages/Cards';
import Analytics from './Pages/Analytics';
import Profile from './Pages/Profile';
import CampaignTest from './Pages/CampaignTest';

// ── Error boundary so render crashes show a message instead of a blank screen ──
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 text-red-600">
          <p className="font-bold text-sm">Page error</p>
          <pre className="text-xs mt-2 whitespace-pre-wrap break-words">
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <Router>
      <Layout>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/Dashboard" element={<Dashboard />} />
            <Route path="/Cards" element={<Cards />} />
            <Route path="/Analytics" element={<Analytics />} />
            <Route path="/Profile" element={<Profile />} />
            <Route path="/CampaignTest" element={<CampaignTest />} />
          </Routes>
        </ErrorBoundary>
      </Layout>
    </Router>
  );
}

export default App;