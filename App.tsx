import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { LogSourceType } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'docker' | 'system' | 'nginx' | 'settings'>('dashboard');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
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
        return <SettingsPage />;
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Layout currentView={currentView} onNavigate={navigateTo} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
};

export default App;