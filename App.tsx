import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { LogSourceType } from './types';
import { AuthService } from './services/api';

const App: React.FC = () => {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'docker' | 'system' | 'nginx' | 'settings'>('dashboard');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  useEffect(() => {
    // Check if already authenticated on mount
    if (AuthService.isAuthenticated()) {
      // Token exists, assume user is authenticated
      // In production, you might want to decode JWT to get user info
      // or make a "whoami" API call to verify the token
      setUser({ username: 'authenticated', role: 'user' }); // Placeholder
    }
  }, []);

  const handleLogin = (userData: { username: string; role: string }) => {
    setUser(userData);
  };

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
    setCurrentView('dashboard');
  };

  const navigateTo = (view: 'dashboard' | 'docker' | 'system' | 'nginx' | 'settings', sourceId: string | null = null) => {
    setCurrentView(view);
    setSelectedSourceId(sourceId);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={navigateTo} />;
      case 'docker':
        return <LogsPage type={LogSourceType.DOCKER} selectedId={selectedSourceId} />;
      case 'system':
        return <LogsPage type={LogSourceType.SYSTEMD} selectedId={selectedSourceId} />;
      case 'nginx':
        return <LogsPage type={LogSourceType.FILE} selectedId={'nginx'} />;
      case 'settings':
        return <SettingsPage user={user} />;
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Layout currentView={currentView} onNavigate={navigateTo} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
};

export default App;
