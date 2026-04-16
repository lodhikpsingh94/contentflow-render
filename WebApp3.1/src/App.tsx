import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import { ThemeProvider } from './components/ThemeProvider';

type AppState = 'landing' | 'login' | 'dashboard';

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppState>('landing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleNavigation = (page: AppState) => {
    setCurrentPage(page);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage('landing');
  };

  const renderCurrentPage = () => {
    if (currentPage === 'landing') {
      return <LandingPage onNavigate={handleNavigation} />;
    }

    if (currentPage === 'login') {
      return <LoginPage onLogin={handleLogin} onNavigate={handleNavigation} />;
    }

    if (currentPage === 'dashboard' && isLoggedIn) {
      return <Dashboard onLogout={handleLogout} />;
    }

    // Fallback to landing page
    return <LandingPage onNavigate={handleNavigation} />;
  };

  return (
    <ThemeProvider>
      {renderCurrentPage()}
    </ThemeProvider>
  );
}