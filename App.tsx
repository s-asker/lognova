import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LogSourceType } from './types';

// Simple router state since we can't use React Router DOM in this environment easily
// and HashRouter is permitted but a custom state is often cleaner for single-file demos.
// However, strictly following instructions to use HashRouter if needed, but here simple state works best.

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'docker' | 'system' | 'nginx' | 'settings'>('dashboard');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

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

  return (
    <Layout currentView={currentView} onNavigate={navigateTo}>
      {renderContent()}
    </Layout>
  );
};

export default App;