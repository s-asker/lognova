import React from 'react';
import { LayoutDashboard, Box, Server, FileText, Settings, Search, Bell, Activity, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: any) => void;
  onLogout?: () => void;
}

const NavItem: React.FC<{
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-200 ${
      active
        ? 'text-primary-500 bg-slate-800 border-r-2 border-primary-500'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
    }`}
  >
    <Icon size={18} />
    {label}
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate, onLogout }) => {
  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-850 flex-shrink-0 flex flex-col border-r border-slate-800">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Activity className="text-primary-500 mr-2" size={24} />
          <span className="text-lg font-bold tracking-tight text-white">LogNova</span>
        </div>

        <div className="flex-1 py-6 space-y-1">
          <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Overview</div>
          <NavItem
            icon={LayoutDashboard}
            label="Dashboard"
            active={currentView === 'dashboard'}
            onClick={() => onNavigate('dashboard')}
          />

          <div className="px-4 mt-6 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sources</div>
          <NavItem
            icon={Box}
            label="Docker Containers"
            active={currentView === 'docker'}
            onClick={() => onNavigate('docker')}
          />
          <NavItem
            icon={Server}
            label="System Services"
            active={currentView === 'system'}
            onClick={() => onNavigate('system')}
          />
          <NavItem
            icon={FileText}
            label="Nginx Logs"
            active={currentView === 'nginx'}
            onClick={() => onNavigate('nginx')}
          />

          <div className="px-4 mt-6 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">System</div>
          <NavItem
            icon={Settings}
            label="Settings"
            active={currentView === 'settings'}
            onClick={() => onNavigate('settings')}
          />
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white">
              A
            </div>
            <div className="text-sm">
              <div className="font-medium text-white">Admin User</div>
              <div className="text-slate-500 text-xs">admin@lognova.local</div>
            </div>
          </div>
          {onLogout && (
             <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white py-2 rounded-md hover:bg-slate-800 transition-colors"
             >
                <LogOut size={14} />
                Sign Out
             </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-slate-850 border-b border-slate-800 flex items-center justify-between px-8">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Global search..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 ml-4">
            <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-auto p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
};