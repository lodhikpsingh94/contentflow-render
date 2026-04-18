import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Pages/Dashboard';
import Cards from './Pages/Cards';
import Analytics from './Pages/Analytics';
import Profile from './Pages/Profile';
import CampaignTest from './Pages/CampaignTest';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/Cards" element={<Cards />} />
          <Route path="/Analytics" element={<Analytics />} />
          <Route path="/Profile" element={<Profile />} />
          <Route path="/CampaignTest" element={<CampaignTest />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;